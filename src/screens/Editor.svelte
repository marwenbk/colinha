<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { firstInvalid } from '../cards/templates';
  import type { Card } from '../cards/types';
  import type { Env } from '../env/detect';
  import { t } from '../i18n/current';
  import type { MessageKey } from '../i18n';
  import { detectPixKey } from '../lib/pix/key';
  import { deliverPass } from '../pass/deliver';
  import { buildPkpass } from '../pass/pkpass';
  import { SignError } from '../pass/sign-client';
  import { cards } from '../state/cards.svelte';
  import { encodeEditLink } from '../state/edit-link';
  import PassCard from '../ui/PassCard.svelte';
  import Sheet from '../ui/Sheet.svelte';
  import Toast from '../ui/Toast.svelte';
  import AddBar from './AddBar.svelte';
  import ConfirmSheet from './ConfirmSheet.svelte';
  import EditorFields from './EditorFields.svelte';
  import { previewLayout } from './preview';

  let { card, env, open, onclose }: { card: Card; env: Env; open: boolean; onclose: () => void } =
    $props();

  /** If the page never hides after delivery (no Wallet sheet), close anyway after this long. */
  const STAY_MS = 3000;

  let draft = $state<Card>(untrack(() => $state.snapshot(card) as Card));
  let invalid = $state<string | null>(null);
  let busy = $state(false);
  let pocket = $state(false);
  let confirming = $state(false);
  let toast = $state({ n: 0, message: '' });
  let body = $state<HTMLDivElement>();
  let barHeight = $state(0);

  // The sheet's scroll container: a focused row (e.g. an invalid `uf`) must never
  // land behind the sticky Add bar. CSSOM, which the CSP allows.
  $effect(() => {
    const scroller = body?.parentElement;
    scroller?.style.setProperty('scroll-padding-bottom', `${barHeight + 16}px`);
  });

  const layout = $derived(previewLayout(draft, t));
  const saved = $derived(cards.list.some((c) => c.id === draft.id));
  const link = $derived(encodeEditLink($state.snapshot(draft) as Card, location.origin));

  let stopWaiting: (() => void) | null = null;
  // Set when the Editor is torn down; an Add still in flight must then do nothing.
  let destroyed = false;
  $effect(() => () => {
    destroyed = true;
    stopWaiting?.();
  });
  /** The person closed the sheet (or it was unmounted) while the pass was being built. */
  const abandoned = () => destroyed || !open;

  function say(key: MessageKey) {
    toast = { n: toast.n + 1, message: t(key) };
  }

  function patch(p: Record<string, unknown>) {
    Object.assign(draft, p);
    if (invalid !== null && invalid in p) invalid = null;
  }

  function errorFor(field: string): MessageKey | null {
    const rec = draft as unknown as Record<string, string>;
    if (field === 'cpf') return 'error.cpf';
    if (field === 'cep') return 'error.cep';
    if (draft.type === 'pix') {
      if (field === 'key') return detectPixKey(draft.key).length > 1 ? null : 'error.pixKey';
      if (rec[field] !== '') return 'error.latin';
    }
    return null;
  }

  async function markInvalid(field: string) {
    invalid = field;
    const msg = errorFor(field);
    if (msg) say(msg);
    await tick();
    const ambiguous = field === 'key' && draft.type === 'pix' && detectPixKey(draft.key).length > 1;
    const target = ambiguous
      ? body?.querySelector<HTMLElement>('.choice [role="radio"]')
      : body?.querySelector<HTMLElement>(`[name="${field}"]`);
    target?.focus();
  }

  function errorKey(e: unknown): MessageKey {
    if (e instanceof SignError) return e.kind === 'offline' ? 'error.offline' : e.kind === 'rate' ? 'error.rate' : 'error.server';
    return 'error.server';
  }

  async function add() {
    if (busy) return;
    const bad = firstInvalid(draft);
    if (bad !== null) return markInvalid(bad);
    if (env.platform !== 'ios' || env.inApp) return; // the bar shows the guard instead
    busy = true;
    pocket = true; // runs alongside the build, only in answer to the tap
    const next = { ...($state.snapshot(draft) as Card), updatedAt: Date.now() };
    try {
      const blob = await buildPkpass(next, t, location.origin);
      if (abandoned()) return;
      cards.save(next);
      await deliverPass(blob);
    } catch (e) {
      if (destroyed) return;
      pocket = false;
      busy = false;
      say(errorKey(e));
      return;
    }
    if (!abandoned()) closeAfterDelivery();
  }

  /** Wallet's sheet hides the page; close once it's visible again. */
  function closeAfterDelivery() {
    if (import.meta.env.VITE_E2E === '1') return onclose();
    let hidden = document.visibilityState === 'hidden';
    const onvis = () => {
      if (document.visibilityState === 'hidden') hidden = true;
      else if (hidden) done();
    };
    const timer = setTimeout(() => {
      if (!hidden) done();
    }, STAY_MS);
    function done() {
      stopWaiting?.();
      onclose();
    }
    stopWaiting = () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onvis);
      stopWaiting = null;
    };
    document.addEventListener('visibilitychange', onvis);
  }

  function remove() {
    cards.remove(draft.id);
    confirming = false;
    onclose();
  }
</script>

<Sheet {open} kind="page" title={t(`card.${draft.type}`)} {onclose}>
  <div class="editor" bind:this={body}>
    <div class="live" class:pocket>
      <PassCard {layout} />
    </div>

    <EditorFields card={draft} {invalid} onpatch={patch} />

    {#if saved && !busy}
      <button type="button" class="delete" onclick={() => (confirming = true)}>
        {t('action.delete')}
      </button>
    {/if}

    <AddBar {env} {busy} {link} bind:height={barHeight} onadd={add} oncopied={() => say('guard.copied')} />
  </div>
</Sheet>

<ConfirmSheet
  open={confirming}
  title={t('confirm.delete')}
  note={t('confirm.deleteNote')}
  onconfirm={remove}
  onclose={() => (confirming = false)} />

{#key toast.n}
  <Toast message={toast.message} />
{/key}

<style>
  .editor {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .editor > :global(.group) {
    margin-top: var(--s-6);
  }

  /* The live pass at Wallet's proportions, a little smaller than full width. */
  .live {
    width: min(78%, 300px);
    margin: var(--s-2) auto 0;
    transition:
      transform var(--dur-pocket) var(--ease-sheet),
      opacity var(--dur-pocket) var(--ease-sheet);
  }

  /* The pocket drop: the live pass slides down into the badge. */
  .live.pocket {
    transform: translateY(60vh) scale(0.5);
    opacity: 0;
  }

  .delete {
    align-self: center;
    min-height: var(--target);
    margin-top: var(--s-6);
    padding: 0 var(--s-4);
    border: 0;
    border-radius: var(--r-capsule);
    background: transparent;
    font: var(--t-body);
    color: var(--danger);
  }

  .editor > :global(.bar) {
    margin-top: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .live {
      transition: opacity var(--dur-pocket) linear;
    }

    .live.pocket {
      transform: none;
    }
  }
</style>

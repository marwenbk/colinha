<script lang="ts" module>
  // Shared across sheets, so a confirmation over the Editor doesn't release the app early.
  let openSheets = 0;
  let openPageSheets = 0;

  function setBackground(kind: 'page' | 'floating', delta: 1 | -1) {
    openSheets = Math.max(0, openSheets + delta);
    if (kind === 'page') openPageSheets = Math.max(0, openPageSheets + delta);
    const app = document.getElementById('app');
    if (app) {
      app.inert = openSheets > 0;
      app.classList.toggle('behind-page-sheet', openPageSheets > 0);
    }
    document.documentElement.classList.toggle('page-sheet-open', openPageSheets > 0);
    document.documentElement.classList.toggle('sheet-open', openSheets > 0);
  }

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
</script>

<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { t } from '../i18n/current';
  import GlassButton from './GlassButton.svelte';
  import X from './icons/X.svelte';

  let {
    open,
    kind,
    onclose,
    children,
    title,
    label,
  }: {
    open: boolean;
    kind: 'page' | 'floating';
    onclose: () => void;
    children: Snippet;
    /** Centered header title (page sheets). */
    title?: string;
    /** Accessible name when there is no visible title. */
    label?: string;
  } = $props();

  const SWIPE_CLOSE = 120;
  const titleId = $props.id();

  let shown = $state(false);
  let closing = $state(false);
  let panel = $state<HTMLDivElement>();
  let opener: HTMLElement | null = null;
  let shownKind: 'page' | 'floating' = 'floating';

  $effect(() => {
    const isOpen = open;
    untrack(() => (isOpen ? show() : hide()));
  });

  $effect(() => () => {
    // Unmounted while open: release the background.
    if (untrack(() => shown && !closing)) setBackground(shownKind, -1);
  });

  function show() {
    if (shown && !closing) return;
    if (!shown) {
      const active = document.activeElement;
      opener = active instanceof HTMLElement && active !== document.body ? active : null;
    }
    if (!shown || closing) {
      shownKind = kind;
      setBackground(kind, 1);
    }
    closing = false;
    shown = true;
  }

  function hide() {
    if (!shown || closing) return;
    closing = true;
    setBackground(shownKind, -1);
    const el = panel;
    if (!el) return finish();
    el.dataset.state = 'closing';
    // jsdom has no Web Animations; browsers return the closing CSS animation.
    const anims = typeof el.getAnimations === 'function' ? el.getAnimations() : [];
    if (anims.length === 0) return finish();
    const fallback = setTimeout(finish, 700);
    Promise.all(anims.map((a) => a.finished)).then(
      () => {
        clearTimeout(fallback);
        finish();
      },
      () => {
        clearTimeout(fallback);
        finish();
      },
    );
  }

  function finish() {
    if (!closing) return;
    closing = false;
    shown = false;
    const back = opener;
    opener = null;
    if (back && back.isConnected) back.focus();
  }

  /** Moves the sheet out of #app (so the page-sheet scale doesn't apply to it) and focuses it. */
  function mount(node: HTMLElement) {
    document.body.appendChild(node);
    node.querySelector<HTMLElement>('[role="dialog"]')?.focus();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onclose();
      return;
    }
    if (e.key !== 'Tab' || !panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Swipe down on the grabber/header.
  let dragStart: number | null = null;
  let dragY = 0;
  let dragging = $state(false);

  function onpointerdown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStart = e.clientY;
    dragY = 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragging = true;
  }

  function onpointermove(e: PointerEvent) {
    if (dragStart === null || !panel) return;
    dragY = Math.max(0, e.clientY - dragStart);
    panel.style.setProperty('--drag', `${dragY}px`);
  }

  function onpointerup() {
    if (dragStart === null) return;
    dragStart = null;
    dragging = false;
    panel?.style.setProperty('--drag', '0px');
    if (dragY > SWIPE_CLOSE) onclose();
    dragY = 0;
  }

  function onbackdrop() {
    if (kind === 'floating') onclose();
  }
</script>

{#if shown}
  <div class="sheet-root {kind}" use:mount>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="backdrop" data-state={closing ? 'closing' : 'open'} onclick={onbackdrop}></div>
    <div
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : label}
      tabindex="-1"
      data-state={closing ? 'closing' : 'open'}
      data-dragging={dragging ? 'true' : undefined}
      bind:this={panel}
      {onkeydown}>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="header"
        {onpointerdown}
        {onpointermove}
        {onpointerup}
        onpointercancel={onpointerup}>
        <span class="grabber" aria-hidden="true"></span>
        <span class="close"><GlassButton icon={X} label={t('a11y.close')} onclick={onclose} /></span>
        {#if title}
          <h2 id={titleId} class="title">{title}</h2>
        {/if}
      </div>
      <div class="content">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .sheet-root {
    position: fixed;
    inset: 0;
    z-index: 20;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 0.2);
    animation: fade-in var(--dur-sheet) var(--ease-sheet);
  }

  .backdrop[data-state='closing'] {
    animation: fade-out var(--dur-sheet) var(--ease-sheet) forwards;
  }

  .panel {
    position: absolute;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    overflow: hidden;
    transform: translateY(var(--drag, 0px));
    transition: transform var(--dur-sheet) var(--ease-sheet);
    animation: sheet-in var(--dur-sheet) var(--ease-sheet);
  }

  .panel:focus,
  .panel:focus-visible {
    outline: none;
  }

  .panel[data-dragging='true'] {
    transition: none;
  }

  .panel[data-state='closing'] {
    animation: sheet-out var(--dur-sheet) var(--ease-sheet) forwards;
  }

  /* Page sheet: solid, radius 24, the app shrinks behind it. */
  .page .panel {
    top: calc(env(safe-area-inset-top) + 12px);
    left: 0;
    right: 0;
    bottom: 0;
    max-width: 640px;
    border-radius: var(--r-page) var(--r-page) 0 0;
    background: var(--bg);
  }

  /* Floating sheet: glass, inset 8pt, radius 32. */
  .floating .panel {
    left: var(--s-2);
    right: var(--s-2);
    bottom: calc(env(safe-area-inset-bottom) + var(--s-2));
    max-width: 480px;
    max-height: calc(100dvh - 2 * var(--s-2) - env(safe-area-inset-top));
    border-radius: var(--r-float);
    background: var(--glass-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow:
      inset 0 0 0 0.5px var(--glass-edge),
      var(--glass-shadow);
  }

  .header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(var(--target) + 2 * var(--s-3));
    padding: var(--s-3) var(--margin) var(--s-2);
    touch-action: none;
  }

  .grabber {
    position: absolute;
    top: 6px;
    left: 50%;
    width: 36px;
    height: 5px;
    margin-left: -18px;
    border-radius: var(--r-capsule);
    background: var(--separator);
  }

  .close {
    position: absolute;
    left: var(--margin);
    top: var(--s-3);
  }

  .title {
    margin: 0;
    padding: 0 calc(var(--target) + var(--s-2));
    font: var(--t-headline);
    text-align: center;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: calc(env(safe-area-inset-bottom) + var(--s-4));
  }

  .floating .content {
    padding-bottom: var(--s-4);
  }

  @keyframes sheet-in {
    from {
      transform: translateY(100%);
    }
  }

  @keyframes sheet-out {
    to {
      transform: translateY(100%);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }

  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }

  /* Reduced motion: only opacity changes. */
  @media (prefers-reduced-motion: reduce) {
    .panel {
      transform: none;
      transition: none;
      animation-name: fade-in;
    }

    .panel[data-state='closing'] {
      animation-name: fade-out;
    }
  }
</style>

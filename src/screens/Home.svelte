<script lang="ts">
  import { newCard } from '../cards/templates';
  import type { Card, CardType } from '../cards/types';
  import { ORG_NAME } from '../config';
  import { t } from '../i18n/current';
  import GlassButton from '../ui/GlassButton.svelte';
  import Lock from '../ui/icons/Lock.svelte';
  import Plus from '../ui/icons/Plus.svelte';
  import PassCard from '../ui/PassCard.svelte';
  import { previewLayout } from './preview';

  let {
    list,
    oncreate,
    onedit,
    onnew,
    oninfo,
  }: {
    list: Card[];
    oncreate: (type: CardType) => void;
    onedit: (card: Card) => void;
    onnew: () => void;
    oninfo: () => void;
  } = $props();

  const TYPES: CardType[] = ['docs', 'address', 'pix'];
  // Empty state: each type in its default color, with placeholder values.
  const samples = TYPES.map((type) => ({ type, layout: previewLayout(newCard(type), t) }));

  // Oldest on top; the newest card is shown in full at the bottom.
  const stack = $derived([...list].sort((a, b) => a.updatedAt - b.updatedAt));
</script>

<main class="home">
  <header>
    <h1>{ORG_NAME}</h1>
    {#if list.length > 0}
      <GlassButton icon={Plus} label={t('a11y.newCard')} onclick={onnew} />
    {/if}
  </header>

  {#if list.length === 0}
    <p class="tagline">{t('app.tagline')}</p>
    <div class="samples">
      {#each samples as s (s.type)}
        <button type="button" class="card-button dim" onclick={() => oncreate(s.type)}>
          <PassCard layout={s.layout} compact />
        </button>
      {/each}
    </div>
  {:else}
    <ol class="stack">
      {#each stack as card, i (card.id)}
        <li>
          <button type="button" class="card-button" onclick={() => onedit(card)}>
            <PassCard layout={previewLayout(card, t)} compact={i < stack.length - 1} />
          </button>
        </li>
      {/each}
    </ol>
  {/if}

  <button type="button" class="privacy" onclick={oninfo}>
    <Lock size={15} />
    <span>{t('privacy.line')}</span>
  </button>
</main>

<style>
  .home {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    max-width: 640px;
    margin: 0 auto;
    padding: calc(env(safe-area-inset-top) + var(--s-6)) var(--margin)
      calc(env(safe-area-inset-bottom) + var(--s-4));
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--target);
  }

  h1 {
    margin: 0;
    font: var(--t-large);
  }

  .tagline {
    margin: var(--s-1) 0 0;
    font: var(--t-body);
    color: var(--label-2);
  }

  .samples {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    margin: var(--s-6) 0 var(--s-8);
  }

  .stack {
    margin: var(--s-4) 0 var(--s-8);
    padding: 0;
    list-style: none;
  }

  /* Wallet-like stack: each card tucks under the next one. */
  .stack li + li {
    margin-top: calc(-1 * var(--r-card));
  }

  .card-button {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: var(--r-card);
    background: transparent;
    text-align: start;
    transition: opacity var(--dur-micro) ease-out;
  }

  .card-button:active {
    opacity: 0.85;
  }

  .dim {
    opacity: 0.45;
  }

  .dim:active {
    opacity: 0.35;
  }

  .privacy {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    min-height: var(--target);
    margin: auto auto 0;
    padding: 0 var(--s-4);
    border: 0;
    border-radius: var(--r-capsule);
    background: transparent;
    font: var(--t-footnote);
    color: var(--label-2);
  }
</style>

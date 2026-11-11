<script lang="ts">
  import { untrack } from 'svelte';
  import type { Card, CardType, PassLayout } from '../cards/types';
  import { ORG_NAME } from '../config';
  import { t } from '../i18n/current';
  import Lock from '../ui/icons/Lock.svelte';
  import PassCard from '../ui/PassCard.svelte';
  import { previewLayout, sampleLayout } from './preview';

  let {
    list,
    oncreate,
    onedit,
    oninfo,
  }: {
    list: Card[];
    oncreate: (type: CardType) => void;
    onedit: (card: Card) => void;
    oninfo: () => void;
  } = $props();

  // Home is a carousel: Pix on the left, the CPF card in the middle (where it
  // opens), Address on the right; swipe to switch. A type with nothing saved
  // shows its example.
  const samples = {
    pix: sampleLayout('pix', t),
    docs: sampleLayout('docs', t),
    address: sampleLayout('address', t),
  };
  const newest = (type: CardType) =>
    list.filter((c) => c.type === type).sort((a, b) => b.updatedAt - a.updatedAt)[0];

  type Slide = { key: string; type: CardType; card: Card | null; layout: PassLayout };
  const slide = (type: CardType, card: Card | undefined): Slide =>
    card
      ? { key: card.id, type, card, layout: previewLayout(card, t) }
      : { key: `sample-${type}`, type, card: null, layout: samples[type] };

  const docs = $derived(
    list.filter((c) => c.type === 'docs').sort((a, b) => a.updatedAt - b.updatedAt),
  );
  const slides = $derived([
    slide('pix', newest('pix')),
    ...(docs.length > 0 ? docs.map((c) => slide('docs', c)) : [slide('docs', undefined)]),
    slide('address', newest('address')),
  ]);
  const hasDocs = $derived(docs.length > 0);

  let scroller: HTMLDivElement | undefined = $state();
  // Start on the (first) CPF card.
  let active = $state(1);

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function centerOf(i: number): number {
    const el = scroller?.children[i] as HTMLElement | undefined;
    if (!scroller || !el) return 0;
    return el.offsetLeft + el.offsetWidth / 2 - scroller.clientWidth / 2;
  }

  function goTo(i: number, smooth = true) {
    scroller?.scrollTo({ left: centerOf(i), behavior: smooth && !reduced() ? 'smooth' : 'auto' });
    active = i;
  }

  function track() {
    if (!scroller) return;
    const mid = scroller.scrollLeft;
    let best = 0;
    for (let i = 1; i < slides.length; i++)
      if (Math.abs(centerOf(i) - mid) < Math.abs(centerOf(best) - mid)) best = i;
    active = best;
  }

  $effect(() => {
    if (scroller) untrack(() => goTo(1, false));
  });

  function open(s: Slide) {
    if (s.card) onedit(s.card);
    else oncreate(s.type);
  }

  /** The middle card opens; a card peeking at the side slides to the middle first. */
  function tapCard(i: number) {
    if (i === active) open(slides[i]);
    else goTo(i);
  }
</script>

<main class="home">
  <header>
    <h1>{ORG_NAME}</h1>
    {#if !hasDocs}
      <p class="tagline">{t('app.tagline')}</p>
    {/if}
  </header>

  <section class="deck">
    <div class="scroller" bind:this={scroller} onscroll={track}>
      {#each slides as s, i (s.key)}
        <div class="slide">
          <button type="button" class="card-button" onclick={() => tapCard(i)}>
            <span class="visually-hidden">{t(`card.${s.type}`)}</span>
            <PassCard layout={s.layout} sample={!s.card} />
          </button>
        </div>
      {/each}
    </div>
    <div class="dots" aria-hidden="true">
      {#each slides as s, i (s.key)}
        <span class="dot" class:on={i === active}></span>
      {/each}
    </div>
  </section>

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

  /*
   * The carousel takes the free height and sits in its middle. It runs edge
   * to edge of the window, past the page column, so cards slide off the
   * screen's edges instead of being cut inside it.
   */
  .deck {
    --card-w: min(86vw, 380px, calc((100dvh - 230px) * 0.769));
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: var(--s-3);
    margin: var(--s-2) calc(50% - 50vw);
  }

  .scroller {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    /*
     * Room for the card shadow (0 10px 30px), which the scroll box would
     * otherwise cut into a hard line; the negative margin keeps the layout.
     */
    padding: 40px 0;
    margin: -24px 0;
    scrollbar-width: none;
  }

  .scroller::-webkit-scrollbar {
    display: none;
  }

  /* Spacers, so the first and last cards can sit in the middle. */
  .scroller::before,
  .scroller::after {
    content: '';
    flex: 0 0 max(0px, calc((100% - var(--card-w)) / 2 - var(--s-3)));
  }

  /*
   * A card is 86% of the screen width, at most a phone's 380pt, and never
   * taller than the screen allows: about 230pt go to the title, the dots and
   * the privacy line, and a pass is 320:416, so its width is at most
   * (height - 230) x 320/416.
   */
  .slide {
    flex: 0 0 var(--card-w);
    scroll-snap-align: center;
  }

  .card-button {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: var(--r-card);
    background: transparent;
    text-align: start;
    transition: transform var(--dur-micro) ease-out;
  }

  .card-button:active {
    transform: scale(0.985);
  }

  .dots {
    display: flex;
    justify-content: center;
    gap: var(--s-2);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: var(--r-capsule);
    background: var(--label-2);
    opacity: 0.4;
    transition: opacity var(--dur-micro) ease-out;
  }

  .dot.on {
    opacity: 1;
    background: var(--label);
  }

  .privacy {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    min-height: var(--target);
    margin: var(--s-4) auto 0;
    padding: 0 var(--s-4);
    border: 0;
    border-radius: var(--r-capsule);
    background: transparent;
    font: var(--t-footnote);
    color: var(--label-2);
  }

  @media (prefers-reduced-motion: reduce) {
    .card-button:active {
      transform: none;
      opacity: 0.8;
    }
  }
</style>

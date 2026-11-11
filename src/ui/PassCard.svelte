<script lang="ts">
  import type { PassLayout } from '../cards/types';
  import { barsWidth, stylizedBars } from './bars';
  import { cssVars } from './css-vars';
  import PassArt from './PassArt.svelte';
  import Qr from './Qr.svelte';

  // The front of the pass as Wallet draws an event ticket, at Wallet's
  // proportions: a fixed-size card with the notch at the top; the card's
  // gradient (the background image) behind everything; the header row with
  // the flag (Wallet's logo text); the primary field; the secondary and
  // auxiliary rows; the barcode pinned to the bottom. Sizes are in container
  // units, so a smaller preview stays true to scale. A `sample` card
  // (Home's example, nothing saved yet) shows its values a little faded.
  let { layout, sample = false }: { layout: PassLayout; sample?: boolean } = $props();

  const vars = $derived({
    '--pass-bg': layout.colors.bg,
    '--pass-fg': layout.colors.fg,
    '--pass-label': layout.colors.label,
  });
  const primary = $derived(layout.primary[0]);
  const rows = $derived([layout.secondary, layout.auxiliary].filter((r) => r.length > 0));
  const code128 = $derived(layout.barcodes.find((b) => b.format === 'PKBarcodeFormatCode128'));
  const qr = $derived(layout.barcodes.find((b) => b.format === 'PKBarcodeFormatQR'));
  const bars = $derived(code128 ? stylizedBars(code128.message) : []);
</script>

<div class="frame">
  <div class="pass" class:sample use:cssVars={vars}>
    <span class="art"><PassArt seed={layout.art} tone={layout.tone} /></span>

    <div class="header">
      <span class="logo" aria-hidden="true">{layout.logoText}</span>
    </div>

    {#if primary}
      <div class="primary">
        <span class="label">{primary.label}</span>
        <span class="value tnum">{primary.value}</span>
      </div>
    {/if}

    {#each rows as row, i (i)}
      <div class="fields">
        {#each row as f (f.key)}
          <div class="field">
            <span class="label">{f.label}</span>
            <span class="value tnum">{f.value}</span>
          </div>
        {/each}
      </div>
    {/each}

    {#if code128}
      <div class="code code128">
        <svg
          viewBox="0 0 {barsWidth(bars)} 40"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false">
          {#each bars as b, i (i)}
            <rect x={b.x} y="0" width={b.w} height="40" fill="#000" />
          {/each}
        </svg>
        {#if code128.altText}<span class="alt tnum">{code128.altText}</span>{/if}
      </div>
    {:else if qr}
      <div class="code qr">
        <Qr text={qr.message} label={layout.description} />
        {#if qr.altText}<span class="alt">{qr.altText}</span>{/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /*
   * The frame is the size container (1cqw is 1% of the card's width) and
   * carries the card shadow, since the notch mask would cut a box-shadow.
   */
  .frame {
    container-type: inline-size;
    filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1)) drop-shadow(0 10px 24px rgb(0 0 0 / 0.16));
  }

  /*
   * Wallet's pass front: 320pt wide by about 416pt tall (1 : 1.3), corner
   * radius ~10pt, and an event ticket's half-circle notch at the top centre.
   * Every length below is the 320pt value as cqw (x / 3.2).
   */
  .pass {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    aspect-ratio: 320 / 416;
    overflow: hidden;
    border-radius: 3.4cqw;
    background: var(--pass-bg);
    color: var(--pass-fg);
    font-family: var(--font);
    -webkit-mask: radial-gradient(circle at 50% 0, transparent 4.4cqw, #000 calc(4.4cqw + 0.5px));
    mask: radial-gradient(circle at 50% 0, transparent 4.4cqw, #000 calc(4.4cqw + 0.5px));
  }

  /* The gradient fills the whole pass, behind everything. */
  .art {
    position: absolute;
    inset: 0;
    z-index: -1;
  }

  /* Header row: 50pt tall, the logo text 17pt. */
  .header {
    display: flex;
    align-items: center;
    flex: none;
    height: 15.6cqw;
    padding: 0 3.75cqw;
  }

  .logo {
    font-size: 6.25cqw;
    line-height: 1;
  }

  /* Primary field: its label, then the value at ~32pt. */
  .primary {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 2cqw 3.75cqw 0;
  }

  .primary .value {
    font-size: 10cqw;
    font-weight: 400;
    line-height: 1.1;
    letter-spacing: -0.01em;
  }

  /* Secondary and auxiliary rows: labels 12pt, values 16pt. */
  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5cqw 6cqw;
    padding: 3.75cqw 3.75cqw 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .label {
    font-size: 3.75cqw;
    line-height: 1.3;
    color: var(--pass-label);
  }

  .value {
    font-size: 5cqw;
    line-height: 1.25;
    color: var(--pass-fg);
    overflow-wrap: anywhere;
  }

  /* The barcode sits at the bottom, centred, in a white box. */
  .code {
    align-self: center;
    margin: auto 0 4.5cqw;
    padding: 2.5cqw 3.75cqw 1.5cqw;
    border-radius: 2cqw;
    background: #fff;
  }

  .code128 {
    width: 82%;
  }

  .code128 svg {
    display: block;
    width: 100%;
    height: 16cqw;
  }

  .qr {
    width: 40%;
    padding: 2.5cqw 2.5cqw 1.5cqw;
  }

  .alt {
    display: block;
    margin-top: 1cqw;
    font-size: 3.4cqw;
    line-height: 1.2;
    color: #000;
    text-align: center;
    overflow-wrap: anywhere;
  }

  /* Example values read as examples: a little fainter than real ones. */
  .sample .value,
  .sample .alt {
    opacity: 0.7;
  }
</style>

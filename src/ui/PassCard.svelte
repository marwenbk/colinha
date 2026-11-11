<script lang="ts">
  import type { PassLayout } from '../cards/types';
  import { barsWidth, stylizedBars } from './bars';
  import { cssVars } from './css-vars';
  import LogoGlyph from './LogoGlyph.svelte';
  import Qr from './Qr.svelte';

  let { layout, compact = false }: { layout: PassLayout; compact?: boolean } = $props();

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

{#if compact}
  <div class="pass compact" use:cssVars={vars}>
    <span class="glyph"><LogoGlyph size={22} /></span>
    <span class="logo-text">{layout.logoText}</span>
    {#if primary}
      <span class="strip-value tnum">{primary.value}</span>
    {/if}
  </div>
{:else}
  <div class="pass" use:cssVars={vars}>
    <div class="top">
      <span class="glyph"><LogoGlyph size={24} /></span>
      <span class="logo-text">{layout.logoText}</span>
    </div>

    {#if primary}
      <div class="field primary">
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
      </div>
    {:else if qr}
      <div class="code qr">
        <Qr text={qr.message} label={layout.description} />
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Card: radius 14 and the single card shadow. */
  .pass {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-4);
    border-radius: var(--r-card);
    background: var(--pass-bg);
    color: var(--pass-fg);
    box-shadow:
      inset 0 0 0 0.5px var(--card-edge),
      var(--shadow-card);
    font-family: var(--font);
    transition: background-color var(--dur-micro) ease-out;
  }

  .top {
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }

  .glyph {
    display: grid;
    flex: none;
    color: var(--pass-fg);
  }

  .logo-text {
    font: var(--t-headline);
    color: var(--pass-fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .field {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .label {
    font: var(--t-caption);
    color: var(--pass-label);
  }

  .value {
    font: var(--t-body);
    color: var(--pass-fg);
    overflow-wrap: anywhere;
  }

  .primary .value {
    font-size: 1.6471rem; /* ~28pt */
    font-weight: 600;
    line-height: 1.2;
  }

  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2) var(--s-6);
  }

  .code {
    align-self: center;
    padding: var(--s-2) var(--s-3);
    border-radius: 8px;
    background: #fff;
  }

  .code128 {
    width: min(100%, 260px);
  }

  .code128 svg {
    display: block;
    width: 100%;
    height: 56px;
  }

  .qr {
    width: 132px;
    padding: var(--s-2);
  }

  .compact {
    flex-direction: row;
    align-items: center;
    gap: var(--s-2);
    height: 64px;
    padding: 0 var(--s-4);
  }

  .compact .logo-text {
    flex: 1;
  }

  .strip-value {
    flex: none;
    font: var(--t-headline);
    color: var(--pass-fg);
    text-align: end;
  }
</style>

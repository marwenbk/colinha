<script lang="ts">
  import { renderSVG } from 'uqr';

  let { text, label }: { text: string; label: string } = $props();

  // The only {@html} in the app (a grep test enforces it). uqr emits a plain
  // <svg> of <rect>/<path> with fill attributes and no user-controlled markup:
  // `text` is encoded into module coordinates, never echoed into the SVG.
  const svg = $derived(renderSVG(text, { border: 0, ecc: 'M' }));
</script>

<div class="qr" role="img" aria-label={label}>{@html svg}</div>

<style>
  .qr {
    display: block;
    width: 100%;
    aspect-ratio: 1;
  }

  .qr :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    shape-rendering: crispEdges;
  }
</style>

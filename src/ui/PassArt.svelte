<!--
  Paints a card's background art (src/pass/art.ts) on a canvas at 2x: the
  same pixels the pass carries as background@2x.png.
-->
<script lang="ts" module>
  import { BG_H, BG_W, renderArt, type Tone } from '../pass/art';

  const W = BG_W * 2;
  const H = BG_H * 2;
  // Rendering costs a few tens of ms, so each seed and tone is painted once per page.
  const cache = new Map<string, ImageData>();

  function pixels(seed: number, tone: Tone): ImageData | null {
    const key = `${tone}:${seed}`;
    let img = cache.get(key);
    if (!img && typeof ImageData !== 'undefined') {
      const rgba = renderArt(W, H, seed, tone);
      img = new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, W, H);
      cache.set(key, img);
    }
    return img ?? null;
  }
</script>

<script lang="ts">
  let { seed, tone = 'docs' }: { seed: number; tone?: Tone } = $props();
  let canvas: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    const ctx = canvas?.getContext('2d');
    const img = ctx ? pixels(seed, tone) : null;
    if (ctx && img) ctx.putImageData(img, 0, 0);
  });
</script>

<canvas bind:this={canvas} width={W} height={H} aria-hidden="true"></canvas>

<style>
  /* Like Wallet, the background fills the pass (aspect-fill). */
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>

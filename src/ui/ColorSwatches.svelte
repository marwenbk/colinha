<script lang="ts">
  import { PALETTE } from '../cards/palette';
  import type { ColorId } from '../cards/types';
  import { t } from '../i18n/current';
  import { cssVars } from './css-vars';

  let { value, onchange }: { value: ColorId; onchange: (id: ColorId) => void } = $props();

  const ids = Object.keys(PALETTE) as ColorId[];
  let root: HTMLDivElement;

  function onkeydown(e: KeyboardEvent) {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (ids.indexOf(value) + step + ids.length) % ids.length;
    onchange(ids[next]);
    root.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }
</script>

<div class="row swatches" role="radiogroup" bind:this={root}>
  {#each ids as id (id)}
    <button
      type="button"
      role="radio"
      aria-checked={id === value}
      aria-label={t(`color.${id}`)}
      tabindex={id === value ? 0 : -1}
      onclick={() => onchange(id)}
      {onkeydown}>
      <span class="dot" class:on={id === value} use:cssVars={{ '--swatch': PALETTE[id].bg }}></span>
    </button>
  {/each}
</div>

<style>
  .swatches {
    justify-content: space-between;
    gap: 0;
    padding: 0 var(--s-2);
  }

  /* 44pt target around a 30pt circle */
  button {
    display: grid;
    place-items: center;
    width: var(--target);
    height: var(--target);
    padding: 0;
    border: 0;
    border-radius: var(--r-capsule);
    background: transparent;
  }

  .dot {
    width: 30px;
    height: 30px;
    border-radius: var(--r-capsule);
    background: var(--swatch);
    transition: box-shadow var(--dur-micro) ease-out;
  }

  .dot.on {
    box-shadow:
      0 0 0 2px var(--surface),
      0 0 0 4px var(--label);
  }
</style>

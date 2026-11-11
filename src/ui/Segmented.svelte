<script lang="ts">
  let {
    options,
    value,
    onchange,
    label,
  }: {
    options: readonly { id: string; label: string }[];
    value: string;
    onchange: (id: string) => void;
    label?: string;
  } = $props();

  let root: HTMLDivElement;

  function onkeydown(e: KeyboardEvent) {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0 || options.length === 0) return;
    e.preventDefault();
    const at = Math.max(0, options.findIndex((o) => o.id === value));
    const next = (at + step + options.length) % options.length;
    onchange(options[next].id);
    root.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }
</script>

<div class="segmented" role="radiogroup" aria-label={label} bind:this={root}>
  {#each options as o, i (o.id)}
    {@const on = o.id === value || (i === 0 && !options.some((x) => x.id === value))}
    <button
      type="button"
      role="radio"
      aria-checked={o.id === value}
      tabindex={on ? 0 : -1}
      class:on={o.id === value}
      onclick={() => onchange(o.id)}
      {onkeydown}>{o.label}</button>
  {/each}
</div>

<style>
  .segmented {
    display: flex;
    gap: 2px;
    padding: 2px;
    border-radius: var(--r-capsule);
    background: color-mix(in srgb, var(--label) 8%, transparent);
  }

  button {
    flex: 1;
    min-height: var(--target);
    padding: 0 var(--s-3);
    border: 0;
    border-radius: var(--r-capsule);
    background: transparent;
    color: var(--label);
    font: var(--t-footnote);
    font-weight: 600;
    transition: background-color var(--dur-micro) ease-out;
  }

  button.on {
    background: var(--surface);
  }
</style>

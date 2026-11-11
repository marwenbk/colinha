<script lang="ts">
  import type { Component } from 'svelte';

  let {
    icon: Icon,
    label,
    onclick,
  }: { icon: Component<{ size?: number }>; label: string; onclick: () => void } = $props();
</script>

<button type="button" class="glass-button" aria-label={label} {onclick}>
  <Icon size={20} />
</button>

<style>
  /* Floating control: glass. 44pt circle. */
  .glass-button {
    display: inline-grid;
    place-items: center;
    width: var(--target);
    height: var(--target);
    padding: 0;
    border: 0;
    border-radius: var(--r-capsule);
    color: var(--label);
    background: var(--glass-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow:
      inset 0 0 0 0.5px var(--glass-edge),
      var(--glass-shadow);
    transition: transform var(--dur-micro) ease-out, opacity var(--dur-micro) ease-out;
  }

  .glass-button:active {
    transform: scale(0.94);
  }

  @media (prefers-reduced-motion: reduce) {
    .glass-button:active {
      transform: none;
      opacity: 0.7;
    }
  }
</style>

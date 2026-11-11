<script lang="ts">
  let { message, onhide }: { message: string; onhide?: () => void } = $props();

  let visible = $state(false);

  $effect(() => {
    if (message === '') {
      visible = false;
      return;
    }
    visible = true;
    const id = setTimeout(() => {
      visible = false;
      onhide?.();
    }, 2500);
    return () => clearTimeout(id);
  });
</script>

<div class="toast-region" role="status" aria-live="polite">
  {#if visible}
    <div class="toast">{message}</div>
  {/if}
</div>

<style>
  .toast-region {
    position: fixed;
    left: var(--margin);
    right: var(--margin);
    bottom: calc(env(safe-area-inset-bottom) + 96px);
    display: flex;
    justify-content: center;
    pointer-events: none;
    z-index: 30;
  }

  /* Floating: glass capsule. */
  .toast {
    max-width: 100%;
    padding: var(--s-3) var(--s-4);
    border-radius: var(--r-capsule);
    background: var(--glass-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow:
      inset 0 0 0 0.5px var(--glass-edge),
      var(--glass-shadow);
    font: var(--t-footnote);
    font-weight: 600;
    color: var(--label);
    text-align: center;
    animation: toast-in var(--dur-sheet) var(--ease-sheet);
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation-name: fade-in;
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
</style>

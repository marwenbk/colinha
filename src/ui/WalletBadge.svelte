<script lang="ts">
  import type { Locale } from '../i18n';

  let { locale, busy = false, onclick }: { locale: Locale; busy?: boolean; onclick: () => void } =
    $props();

  // The accessible name matches the artwork's own words, so it follows the badge, not the copy table.
  const ALT: Record<Locale, string> = {
    pt: 'Adicionar à Carteira Apple',
    en: 'Add to Apple Wallet',
  };

  function handle() {
    if (busy) return;
    onclick();
  }
</script>

<span class="wrap">
  <button type="button" class="badge" aria-disabled={busy ? 'true' : undefined} onclick={handle}>
    <picture>
      <source
        srcset="/badges/add-to-apple-wallet-{locale}-outline.svg"
        media="(prefers-color-scheme: dark)" />
      <img src="/badges/add-to-apple-wallet-{locale}.svg" alt={ALT[locale]} width="160" height="48" />
    </picture>
  </button>
  {#if busy}
    <span class="spinner" role="progressbar" aria-label={ALT[locale]}></span>
  {/if}
</span>

<style>
  .wrap {
    display: inline-flex;
    align-items: center;
    gap: var(--s-3);
  }

  /*
   * Apple's rules: the badge is used unmodified, never animated, shadowed or
   * dimmed, with clear space of at least 0.1 x its height (48 x 0.1 = 4.8; we use 8).
   */
  .badge {
    display: block;
    margin: 0;
    padding: var(--s-2);
    border: 0;
    border-radius: 12px;
    background: transparent;
  }

  .badge img {
    display: block;
    height: 48px;
    width: auto;
  }

  .badge[aria-disabled='true'] {
    cursor: default;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--separator);
    border-top-color: var(--label);
    border-radius: var(--r-capsule);
    animation: spin 800ms linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(1turn);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: pulse 1200ms ease-in-out infinite alternate;
    }
  }

  @keyframes pulse {
    from {
      opacity: 1;
    }
    to {
      opacity: 0.3;
    }
  }
</style>

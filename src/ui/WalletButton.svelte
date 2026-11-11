<!--
  The Editor's main action: the Wallet glyph and "Add to wallet", centred in a
  black capsule (with a hairline edge in dark mode, like Apple's outline style).
  While the pass is being built, a spinner takes the glyph's place and taps are
  ignored.
-->
<script lang="ts">
  import { t } from '../i18n/current';
  import WalletIcon from './icons/WalletIcon.svelte';

  let { busy = false, onclick }: { busy?: boolean; onclick: () => void } = $props();

  function handle() {
    if (busy) return;
    onclick();
  }
</script>

<button
  type="button"
  class="wallet"
  aria-disabled={busy ? 'true' : undefined}
  aria-busy={busy ? 'true' : undefined}
  onclick={handle}>
  {#if busy}
    <span class="spinner" role="progressbar"></span>
  {:else}
    <WalletIcon size={24} />
  {/if}
  <span>{t('action.addToWallet')}</span>
</button>

<style>
  .wallet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    width: min(100%, 340px);
    min-height: 52px;
    margin: var(--s-1) 0;
    padding: 0 var(--s-6);
    border: 0;
    border-radius: var(--r-capsule);
    background: #000;
    color: #fff;
    font: var(--t-headline);
    /* It floats over the form as it scrolls: one soft shadow, no frame. */
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.22);
    transition: opacity var(--dur-micro) ease-out;
  }

  .wallet:active {
    opacity: 0.8;
  }

  .wallet[aria-disabled='true'] {
    cursor: default;
  }

  @media (prefers-color-scheme: dark) {
    .wallet {
      box-shadow:
        inset 0 0 0 1px rgb(255 255 255 / 0.55),
        0 6px 20px rgb(0 0 0 / 0.5);
    }
  }

  .spinner {
    width: 22px;
    height: 22px;
    border: 2px solid rgb(255 255 255 / 0.3);
    border-top-color: #fff;
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

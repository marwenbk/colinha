<!-- The Editor's bottom glass bar: the Wallet badge, or the guard for this browser. -->
<script lang="ts">
  import type { Env } from '../env/detect';
  import { locale, t } from '../i18n/current';
  import Copy from '../ui/icons/Copy.svelte';
  import Smartphone from '../ui/icons/Smartphone.svelte';
  import WalletBadge from '../ui/WalletBadge.svelte';
  import GuardSheet from './GuardSheet.svelte';

  let {
    env,
    busy,
    link,
    onadd,
    oncopied,
  }: { env: Env; busy: boolean; link: string; onadd: () => void; oncopied: () => void } = $props();

  let qrOpen = $state(false);

  /** In-app browsers often block the async Clipboard API; fall back to a selection copy. */
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const area = document.createElement('textarea');
      area.value = link;
      area.readOnly = true;
      area.className = 'visually-hidden';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    oncopied();
  }
</script>

<div class="bar">
  {#if env.inApp}
    <p class="banner">{t('guard.inApp')}</p>
    <button type="button" class="capsule" onclick={copy}>
      <Copy size={18} /><span>{t('guard.copyLink')}</span>
    </button>
  {:else if env.platform === 'ios'}
    <WalletBadge locale={locale()} {busy} onclick={onadd} />
  {:else if env.platform === 'android'}
    <p class="banner">{t('guard.android')}</p>
  {:else}
    <button type="button" class="capsule" onclick={() => (qrOpen = true)}>
      <Smartphone size={18} /><span>{t('guard.desktop')}</span>
    </button>
  {/if}
</div>

{#if env.platform === 'desktop' && !env.inApp}
  <GuardSheet open={qrOpen} {link} onclose={() => (qrOpen = false)} />
{/if}

<style>
  /* Floating glass bar pinned to the bottom of the sheet. */
  .bar {
    position: sticky;
    bottom: var(--s-2);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-2);
    margin: var(--s-6) var(--s-2) 0;
    padding: var(--s-2) var(--s-4);
    border-radius: var(--r-float);
    background: var(--glass-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow:
      inset 0 0 0 0.5px var(--glass-edge),
      var(--glass-shadow);
  }

  .banner {
    margin: var(--s-2) 0 0;
    font: var(--t-footnote);
    font-weight: 600;
    text-align: center;
  }

  .banner:only-child {
    margin: var(--s-3) 0;
  }

  .capsule {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    min-height: 50px;
    margin: var(--s-1) 0;
    padding: 0 var(--s-6);
    border: 0;
    border-radius: var(--r-capsule);
    background: var(--label);
    color: var(--bg);
    font: var(--t-headline);
    transition: opacity var(--dur-micro) ease-out;
  }

  .capsule:active {
    opacity: 0.7;
  }
</style>

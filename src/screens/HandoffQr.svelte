<script lang="ts">
  import { t } from '../i18n/current';
  import Qr from '../ui/Qr.svelte';

  let { link }: { link: string } = $props();
</script>

<div class="handoff">
  <!-- White quiet zone so cameras read it in dark mode too. -->
  <div class="qr-box" data-testid="handoff-qr">
    <Qr text={link} label={t('guard.desktop')} />
  </div>
  <p>{t('guard.desktopHint')}</p>
</div>

<style>
  .handoff {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-4);
    padding: 0 var(--margin);
  }

  .qr-box {
    width: min(100%, 260px);
    padding: var(--s-4);
    border-radius: var(--r-card);
    background: #fff;
  }

  p {
    margin: 0;
    font: var(--t-footnote);
    color: var(--label-2);
    text-align: center;
  }
</style>

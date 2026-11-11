<script lang="ts">
  import { GITHUB_URL } from '../config';
  import { t } from '../i18n/current';
  import { clearPassCache } from '../pass/deliver';
  import { cards } from '../state/cards.svelte';
  import Group from '../ui/Group.svelte';
  import Lock from '../ui/icons/Lock.svelte';
  import Sheet from '../ui/Sheet.svelte';
  import ConfirmSheet from './ConfirmSheet.svelte';

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();

  let confirming = $state(false);

  async function erase() {
    cards.clear();
    confirming = false;
    onclose();
    await clearPassCache().catch(() => {});
  }
</script>

<Sheet {open} kind="floating" label={t('privacy.line')} {onclose}>
  <div class="lead">
    <span class="lock"><Lock size={22} /></span>
    <p>{t('privacy.line')}</p>
  </div>
  <Group>
    <p class="row line">{t('info.built')}</p>
    <p class="row line">{t('info.signed')}</p>
    <p class="row line">
      <span>{t('info.open')}</span>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">{t('info.github')}</a>
    </p>
  </Group>
  <button type="button" class="erase" onclick={() => (confirming = true)}>{t('action.eraseAll')}</button>
</Sheet>

<ConfirmSheet
  open={confirming}
  title={t('confirm.eraseAll')}
  note={t('confirm.eraseAllNote')}
  onconfirm={erase}
  onclose={() => (confirming = false)} />

<style>
  .lead {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-2);
    padding: 0 var(--margin) var(--s-4);
    text-align: center;
  }

  .lead p {
    margin: 0;
    font: var(--t-headline);
  }

  .lock {
    display: grid;
    color: var(--label-2);
  }

  .line {
    flex-wrap: wrap;
    gap: var(--s-1) var(--s-2);
    margin: 0;
    padding-block: var(--s-3);
    font: var(--t-body);
  }

  a {
    color: var(--label);
    font-weight: 600;
    text-underline-offset: 3px;
  }

  .erase {
    display: block;
    min-height: var(--target);
    margin: var(--s-4) auto 0;
    padding: 0 var(--s-4);
    border: 0;
    border-radius: var(--r-capsule);
    background: transparent;
    font: var(--t-body);
    color: var(--danger);
  }
</style>

<script lang="ts">
  import { t } from '../i18n/current';
  import Sheet from '../ui/Sheet.svelte';

  let {
    open,
    title,
    note,
    onconfirm,
    onclose,
  }: { open: boolean; title: string; note: string; onconfirm: () => void; onclose: () => void } =
    $props();
</script>

<Sheet {open} kind="floating" {title} {onclose}>
  <div class="confirm">
    <p class="note">{note}</p>
    <button type="button" class="capsule danger" onclick={onconfirm}>{t('confirm.yes')}</button>
    <button type="button" class="capsule" onclick={onclose}>{t('confirm.no')}</button>
  </div>
</Sheet>

<style>
  .confirm {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: 0 var(--margin);
  }

  .note {
    margin: 0 0 var(--s-4);
    font: var(--t-body);
    color: var(--label-2);
    text-align: center;
  }

  .capsule {
    min-height: 50px;
    border: 0;
    border-radius: var(--r-capsule);
    background: color-mix(in srgb, var(--label) 8%, transparent);
    font: var(--t-headline);
    color: var(--label);
    transition: opacity var(--dur-micro) ease-out;
  }

  .capsule:active {
    opacity: 0.7;
  }

  .danger {
    background: var(--danger);
    color: #fff;
  }
</style>

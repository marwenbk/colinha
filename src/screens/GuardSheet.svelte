<!-- Floating sheet for the computer / iPad guard: the handoff QR of the edit link. -->
<script lang="ts">
  import { t } from '../i18n/current';
  import Sheet from '../ui/Sheet.svelte';
  import HandoffQr from './HandoffQr.svelte';

  let { open, link, onclose }: { open: boolean; link: string; onclose: () => void } = $props();
</script>

<Sheet {open} kind="floating" title={t('guard.desktop')} {onclose}>
  <HandoffQr {link} />
</Sheet>

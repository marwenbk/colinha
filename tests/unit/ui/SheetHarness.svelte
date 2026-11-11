<script lang="ts">
  import Sheet from '../../../src/ui/Sheet.svelte';

  let open = $state(false);
</script>

<button type="button" onclick={() => (open = true)}>Open</button>
<Sheet {open} kind="floating" onclose={() => (open = false)}>
  <p>Inside</p>
  <button type="button">Inner action</button>
</Sheet>

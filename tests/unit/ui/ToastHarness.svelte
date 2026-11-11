<script lang="ts">
  import Sheet from '../../../src/ui/Sheet.svelte';
  import Toast from '../../../src/ui/Toast.svelte';
</script>

<Sheet open={true} kind="page" onclose={() => {}}>
  <p>Editor</p>
</Sheet>
<Toast message="No connection. Try again." />

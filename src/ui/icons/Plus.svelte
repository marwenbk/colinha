<!-- Lucide "plus" (ISC). See LICENSE.md. -->
<script lang="ts">
  import { lucide } from './attrs';

  let { size = 20 }: { size?: number } = $props();
</script>

<svg {...lucide(size)}><path d="M5 12h14" /><path d="M12 5v14" /></svg>

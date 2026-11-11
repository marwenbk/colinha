<!-- Lucide "trash" (ISC). See LICENSE.md. -->
<script lang="ts">
  import { lucide } from './attrs';

  let { size = 20 }: { size?: number } = $props();
</script>

<svg {...lucide(size)}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>

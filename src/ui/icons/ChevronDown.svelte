<!-- Lucide "chevron-down" (ISC). See LICENSE.md. -->
<script lang="ts">
  import { lucide } from './attrs';

  let { size = 20 }: { size?: number } = $props();
</script>

<svg {...lucide(size)}><path d="m6 9 6 6 6-6" /></svg>

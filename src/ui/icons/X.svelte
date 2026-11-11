<!-- Lucide "x" (ISC). See LICENSE.md. -->
<script lang="ts">
  import { lucide } from './attrs';

  let { size = 20 }: { size?: number } = $props();
</script>

<svg {...lucide(size)}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>

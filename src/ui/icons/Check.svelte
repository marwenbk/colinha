<!-- Lucide "check" (ISC). See LICENSE.md. -->
<script lang="ts">
  import { lucide } from './attrs';

  let { size = 20 }: { size?: number } = $props();
</script>

<svg {...lucide(size)}><path d="M20 6 9 17l-5-5" /></svg>

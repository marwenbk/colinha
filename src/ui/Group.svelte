<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="group">
  {@render children()}
</div>

<style>
  /* Inset grouped list: flat, no shadow. Rows (.row) draw inset separators. */
  .group {
    margin: 0 var(--margin);
    border-radius: var(--r-group);
    background: var(--surface);
    overflow: hidden;
  }

  .group + :global(.group) {
    margin-top: var(--s-6);
  }
</style>

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

  /*
   * The group clips its rows to its rounded corners, so the first and last
   * rows take the same corners: a row's focus ring then follows the curve
   * instead of being cut off at the corners.
   */
  .group > :global(.row:first-child) {
    border-top-left-radius: var(--r-group);
    border-top-right-radius: var(--r-group);
  }

  .group > :global(.row:last-child) {
    border-bottom-left-radius: var(--r-group);
    border-bottom-right-radius: var(--r-group);
  }

  .group + :global(.group) {
    margin-top: var(--s-6);
  }
</style>

<!--
  A wallet glyph in Apple Wallet's style: a white wallet with three coloured
  cards. Drawn for Colinha, not Apple's artwork; swap in Apple's Wallet icon
  here if their guidelines allow it for this use.
-->
<script lang="ts">
  let { size = 24 }: { size?: number } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  aria-hidden="true"
  focusable="false">
  <rect x="0" y="2" width="24" height="20" rx="4.5" fill="#fff" />
  <rect x="2" y="4.5" width="20" height="3.2" rx="1.6" fill="#34aadc" />
  <rect x="2" y="8.4" width="20" height="3.2" rx="1.6" fill="#ffcc00" />
  <rect x="2" y="12.3" width="20" height="3.2" rx="1.6" fill="#ff3b30" />
  <path d="M0 14.5h8.5a3.5 3.5 0 0 0 7 0H24V18a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4Z" fill="#d1d1d6" />
</svg>

<script lang="ts">
  import { untrack } from 'svelte';
  import { newCard } from './cards/templates';
  import type { Card, CardType } from './cards/types';
  import { detectEnv } from './env/detect';
  import Editor from './screens/Editor.svelte';
  import Home from './screens/Home.svelte';
  import InfoSheet from './screens/InfoSheet.svelte';
  import { cards } from './state/cards.svelte';

  let { initialCard = null }: { initialCard?: Card | null } = $props();

  const env = detectEnv(navigator.userAgent, navigator.maxTouchPoints);
  // The Editor stays mounted while its sheet slides out; `session` remounts it per card.
  const SHEET_OUT_MS = 500;

  let editing = $state.raw<Card | null>(untrack(() => initialCard));
  let editorOpen = $state(untrack(() => initialCard !== null));
  let session = $state(0);
  let infoOpen = $state(false);

  function edit(card: Card) {
    editing = $state.snapshot(card) as Card;
    editorOpen = true;
    session++;
  }

  function latest<K extends Card['type']>(type: K) {
    return cards.list
      .filter((c): c is Extract<Card, { type: K }> => c.type === type)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  }

  function create(type: CardType) {
    const prefill = type === 'pix' ? { name: latest('docs')?.name, city: latest('address')?.city } : undefined;
    edit(newCard(type, prefill));
  }

  function closeEditor() {
    editorOpen = false;
    const s = session;
    setTimeout(() => {
      if (s === session && !editorOpen) editing = null;
    }, SHEET_OUT_MS);
  }
</script>

<Home
  list={cards.list}
  oncreate={create}
  onedit={edit}
  oninfo={() => (infoOpen = true)} />

<InfoSheet open={infoOpen} onclose={() => (infoOpen = false)} />

{#if editing}
  {#key session}
    <Editor card={editing} {env} open={editorOpen} onclose={closeEditor} />
  {/key}
{/if}

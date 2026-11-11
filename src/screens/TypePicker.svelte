<script lang="ts">
  import { PALETTE } from '../cards/palette';
  import { newCard } from '../cards/templates';
  import type { CardType } from '../cards/types';
  import { t } from '../i18n/current';
  import { cssVars } from '../ui/css-vars';
  import Group from '../ui/Group.svelte';
  import LogoGlyph from '../ui/LogoGlyph.svelte';
  import Sheet from '../ui/Sheet.svelte';

  let {
    open,
    onpick,
    onclose,
  }: { open: boolean; onpick: (type: CardType) => void; onclose: () => void } = $props();

  const TYPES: CardType[] = ['docs', 'address', 'pix'];
  const colorOf = (type: CardType) => PALETTE[newCard(type).color].bg;
</script>

<Sheet {open} kind="floating" label={t('a11y.newCard')} {onclose}>
  <Group>
    {#each TYPES as type (type)}
      <button type="button" class="row pick" onclick={() => onpick(type)}>
        <span class="chip" use:cssVars={{ '--chip': colorOf(type) }}><LogoGlyph size={18} /></span>
        <span>{t(`card.${type}`)}</span>
      </button>
    {/each}
  </Group>
</Sheet>

<style>
  .pick {
    width: 100%;
    min-height: 56px;
    border: 0;
    background: transparent;
    font: var(--t-body);
    color: var(--label);
    text-align: start;
    transition: background-color var(--dur-micro) ease-out;
  }

  .pick:active {
    background: color-mix(in srgb, var(--label) 8%, transparent);
  }

  .chip {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--chip);
    color: #fff;
  }
</style>

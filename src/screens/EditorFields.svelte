<!-- The Editor's inset grouped lists for one card type. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { FIELDS } from '../cards/templates';
  import type { Card, FieldSpec } from '../cards/types';
  import { t } from '../i18n/current';
  import { UFS } from '../lib/br/uf';
  import { detectPixKey, type PixKeyType } from '../lib/pix/key';
  import FieldRow from '../ui/FieldRow.svelte';
  import Group from '../ui/Group.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import SelectRow from '../ui/SelectRow.svelte';
  import SwitchRow from '../ui/SwitchRow.svelte';

  let {
    card,
    invalid,
    onpatch,
  }: { card: Card; invalid: string | null; onpatch: (patch: Record<string, unknown>) => void } =
    $props();

  const GROUPS: Record<Card['type'], string[][]> = {
    docs: [['cpf', 'name'], ['rg', 'rnm', 'passport']],
    address: [['cep', 'line1', 'line2', 'district', 'city', 'uf'], ['reference']],
    pix: [['key', 'name', 'city']],
  };
  const groups = $derived(
    GROUPS[card.type].map((ids) => ids.map((id) => FIELDS[card.type].find((f) => f.id === id)!)),
  );
  const values = $derived(card as unknown as Record<string, string>);
  const ufOptions = UFS.map((u) => ({ value: u, label: u }));

  // Pix key: the row shows what was typed; the card stores the payload form.
  let keyInput = $state(untrack(() => (card.type === 'pix' ? card.key : '')));
  // A type the person picked for an ambiguous key (CPF or phone).
  let picked = $state<PixKeyType | null>(untrack(() => (card.type === 'pix' ? card.keyType : null)));
  const candidates = $derived(card.type === 'pix' ? detectPixKey(keyInput) : []);
  const keyType = $derived(card.type === 'pix' ? card.keyType : null);

  function setKey(raw: string) {
    keyInput = raw;
    const found = detectPixKey(raw);
    const hit = found.length === 1 ? found[0] : found.find((c) => c.type === picked);
    onpatch(hit ? { key: hit.value, keyType: hit.type } : { key: raw.trim(), keyType: null });
  }

  function pick(type: string) {
    picked = type as PixKeyType;
    setKey(keyInput);
  }

  const shown = (spec: FieldSpec) => (spec.id === 'key' ? keyInput : values[spec.id]);
</script>

{#each groups as group, gi (gi)}
  <Group>
    {#each group as spec (spec.id)}
      {#if spec.id === 'uf'}
        <SelectRow
          label={t(spec.label)}
          name="uf"
          options={ufOptions}
          value={values.uf}
          autocomplete="address-level1"
          invalid={invalid === 'uf'}
          onchange={(v) => onpatch({ uf: v })} />
      {:else}
        <FieldRow
          {spec}
          value={shown(spec)}
          invalid={invalid === spec.id}
          placeholder={spec.id === 'key' ? t('placeholder.pixKey') : undefined}
          hint={spec.id === 'key' && keyType ? t(`pixType.${keyType}`) : undefined}
          onchange={(v) => (spec.id === 'key' ? setKey(v) : onpatch({ [spec.id]: v }))} />
        {#if spec.id === 'key' && candidates.length > 1}
          <div class="row choice">
            <Segmented
              label={t('field.pixKey')}
              options={candidates.map((c) => ({ id: c.type, label: t(`pixType.${c.type}`) }))}
              value={keyType ?? ''}
              onchange={pick} />
          </div>
        {/if}
      {/if}
    {/each}
  </Group>
{/each}

{#if card.type === 'docs'}
  <Group>
    <SwitchRow
      label={t('toggle.barcode')}
      checked={card.barcode}
      onchange={(on) => onpatch({ barcode: on })} />
  </Group>
{/if}

<style>
  .choice {
    padding-block: var(--s-2);
  }

  .choice > :global(*) {
    flex: 1;
  }
</style>

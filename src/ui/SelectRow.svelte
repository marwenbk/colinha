<script lang="ts">
  import type { FullAutoFill } from 'svelte/elements';
  import ChevronDown from './icons/ChevronDown.svelte';

  let {
    label,
    options,
    value,
    onchange,
    autocomplete,
    invalid = false,
    placeholder = '',
  }: {
    label: string;
    options: readonly { value: string; label: string }[];
    value: string;
    onchange: (value: string) => void;
    autocomplete?: FullAutoFill;
    invalid?: boolean;
    placeholder?: string;
  } = $props();

  const id = $props.id();
</script>

<div class="row select-row">
  <label for={id}>{label}</label>
  <span class="control">
    <select
      {id}
      {value}
      {autocomplete}
      aria-invalid={invalid ? 'true' : undefined}
      onchange={(e) => onchange((e.currentTarget as HTMLSelectElement).value)}>
      <option value="" disabled>{placeholder}</option>
      {#each options as o (o.value)}
        <option value={o.value}>{o.label}</option>
      {/each}
    </select>
    <span class="chevron"><ChevronDown size={16} /></span>
  </span>
</div>

<style>
  label {
    flex: none;
    min-width: 96px;
    font: var(--t-body);
  }

  .control {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
  }

  select {
    flex: 1;
    min-height: var(--target);
    padding: 0 24px 0 0;
    border: 0;
    background: transparent;
    font: var(--t-body);
    color: var(--label);
    text-align: end;
    appearance: none;
    -webkit-appearance: none;
  }

  select:focus-visible {
    outline: none;
  }

  .select-row:has(select:focus-visible) {
    box-shadow: inset 0 0 0 2px var(--label);
  }

  select[aria-invalid='true'] {
    color: var(--danger);
  }

  .chevron {
    position: absolute;
    right: 0;
    display: grid;
    color: var(--label-2);
    pointer-events: none;
  }
</style>

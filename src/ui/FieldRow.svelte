<script lang="ts">
  import type { FieldSpec } from '../cards/types';
  import { t } from '../i18n/current';
  import { applyMask, caretAfterDigits } from './mask';

  let {
    spec,
    value,
    invalid = false,
    onchange,
    placeholder,
    hint,
  }: {
    spec: FieldSpec;
    /** The stored (normalized) value: digits only for masked fields. */
    value: string;
    invalid?: boolean;
    onchange: (value: string) => void;
    placeholder?: string;
    /** A short trailing word, such as the detected Pix key type. */
    hint?: string;
  } = $props();

  const id = $props.id();

  const display = $derived(spec.mask ? applyMask(spec.mask, value) : value);
  const ok = $derived(!invalid && value !== '' && spec.valid !== undefined && spec.valid(value));
  const shownPlaceholder = $derived(
    placeholder ?? (spec.required ? '' : t('placeholder.optional')),
  );

  function oninput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const raw = input.value;
    if (spec.mask) {
      const caret = input.selectionStart ?? raw.length;
      const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
      const next = spec.normalize(raw);
      const masked = applyMask(spec.mask, next);
      input.value = masked;
      if (document.activeElement === input) {
        const pos = caretAfterDigits(masked, Math.min(digitsBefore, next.length));
        input.setSelectionRange(pos, pos);
      }
      onchange(next);
      return;
    }
    let next = spec.uppercase ? raw.toUpperCase() : raw;
    next = next.slice(0, spec.maxLength);
    if (next !== raw) input.value = next;
    onchange(next);
  }

  /** Free text is normalized (trimmed, filtered) once the person leaves the field. */
  function onblur(e: Event) {
    if (spec.mask) return;
    const input = e.currentTarget as HTMLInputElement;
    const next = spec.normalize(input.value);
    if (next !== input.value) {
      input.value = next;
      onchange(next);
    }
  }
</script>

<div class="row field-row">
  <label for={id}>{t(spec.label)}</label>
  <input
    {id}
    name={spec.id}
    type="text"
    value={display}
    placeholder={shownPlaceholder}
    inputmode={spec.inputmode as 'numeric' | 'text' | undefined}
    autocomplete={spec.autocomplete as import('svelte/elements').FullAutoFill | undefined}
    autocapitalize={spec.uppercase ? 'characters' : spec.verbatim ? 'off' : undefined}
    autocorrect={spec.verbatim ? 'off' : undefined}
    spellcheck={spec.verbatim ? false : undefined}
    maxlength={spec.mask ? spec.mask.length : spec.maxLength}
    aria-invalid={invalid ? 'true' : undefined}
    class:tnum={spec.mask !== undefined}
    {oninput}
    {onblur} />
  {#if hint}
    <span class="hint">{hint}</span>
  {/if}
  {#if ok}
    <span class="ok" aria-hidden="true">✓</span>
  {/if}
</div>

<style>
  label {
    flex: none;
    min-width: 96px;
    font: var(--t-body);
    color: var(--label);
  }

  input {
    flex: 1;
    min-width: 0;
    min-height: var(--target);
    padding: 0;
    border: 0;
    background: transparent;
    font: var(--t-body);
    color: var(--label);
  }

  input::placeholder {
    color: var(--label-2);
  }

  input:focus-visible {
    outline: none;
  }

  .field-row:has(input:focus-visible) {
    box-shadow: inset 0 0 0 2px var(--label);
  }

  input[aria-invalid='true'] {
    color: var(--danger);
  }

  .hint {
    flex: none;
    font: var(--t-footnote);
    color: var(--label-2);
  }

  .ok {
    flex: none;
    font: var(--t-headline);
    color: var(--ok);
  }
</style>

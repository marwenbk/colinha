<script lang="ts">
  import { boolAttr } from './css-vars';

  let {
    label,
    checked,
    onchange,
  }: { label: string; checked: boolean; onchange: (checked: boolean) => void } = $props();

  const id = $props.id();
</script>

<div class="row switch-row">
  <label for={id}>{label}</label>
  <!-- Safari 17.4+ renders `switch` as the native iOS switch. -->
  <input
    {id}
    type="checkbox"
    role="switch"
    {checked}
    use:boolAttr={'switch'}
    onchange={(e) => onchange((e.currentTarget as HTMLInputElement).checked)} />
</div>

<style>
  label {
    flex: 1;
    font: var(--t-body);
  }

  input {
    flex: none;
    width: 51px;
    height: 31px;
    margin: 0;
    accent-color: var(--ok);
  }
</style>

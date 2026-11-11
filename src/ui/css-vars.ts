/**
 * Sets CSS custom properties through CSSOM (`element.style.setProperty`),
 * which the `style-src 'self'` CSP allows. Never write a `style` attribute.
 */
export function cssVars(node: HTMLElement, vars: Record<string, string>) {
  let prev: Record<string, string> = {};
  const apply = (next: Record<string, string>) => {
    for (const k of Object.keys(prev)) if (!(k in next)) node.style.removeProperty(k);
    for (const [k, v] of Object.entries(next)) node.style.setProperty(k, v);
    prev = next;
  };
  apply(vars);
  return { update: apply };
}

/** Sets a boolean attribute that Svelte's element types don't know (e.g. `switch`). */
export function boolAttr(node: HTMLElement, name: string) {
  node.setAttribute(name, '');
}

/**
 * Moves the node to `document.body`, outside `#app`, which is inert and scaled
 * while a sheet is open. The node must be its block's only root element.
 */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
}

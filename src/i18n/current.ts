import { createT, type Locale, type T } from './index';

let current: Locale = 'en';
let translate: T = createT('en');

export function initI18n(next: Locale): void {
  current = next;
  translate = createT(next);
}

export const t: T = (key) => translate(key);
export const locale = (): Locale => current;

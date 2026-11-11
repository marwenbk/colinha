import { en } from './en';
import { pt } from './pt';

export type Locale = 'pt' | 'en';
export type MessageKey = keyof typeof en;
export type T = (key: MessageKey) => string;

export function detectLocale(langs: readonly string[], forced: string | null): Locale {
  if (forced === 'pt' || forced === 'en') return forced;
  for (const l of langs) {
    const tag = l.toLowerCase();
    if (tag.startsWith('pt')) return 'pt';
    if (tag.startsWith('en')) return 'en';
  }
  return 'en';
}

export function createT(locale: Locale): T {
  const table: Record<MessageKey, string> = locale === 'pt' ? pt : en;
  return (key) => table[key];
}

export function forcedLocale(doc: Document): string | null {
  return doc.querySelector('meta[name="colinha-locale"]')?.getAttribute('content') ?? null;
}

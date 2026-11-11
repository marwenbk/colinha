import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { pt } from '../../src/i18n/pt';
import { createT, detectLocale, forcedLocale } from '../../src/i18n/index';
import { initI18n, locale, t } from '../../src/i18n/current';

describe('i18n', () => {
  it('pt has exactly the keys of en', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
  });
  it('detectLocale', () => {
    expect(detectLocale(['pt-BR'], null)).toBe('pt');
    expect(detectLocale(['en-US', 'pt-BR'], null)).toBe('en');
    expect(detectLocale(['es-ES', 'pt-BR'], null)).toBe('pt');
    expect(detectLocale(['fr-FR'], null)).toBe('en');
    expect(detectLocale(['pt-BR'], 'en')).toBe('en');
    expect(detectLocale(['en-US'], 'pt')).toBe('pt');
  });
  it('createT', () => {
    expect(createT('pt')('card.docs')).toBe('Documentos');
    expect(createT('en')('card.docs')).toBe('Documents');
  });
  it('forcedLocale reads the meta tag', () => {
    const a = document.implementation.createHTMLDocument('');
    a.head.innerHTML = '<meta name="colinha-locale" content="en">';
    expect(forcedLocale(a)).toBe('en');
    expect(forcedLocale(document.implementation.createHTMLDocument(''))).toBeNull();
  });
  it('current: defaults to en before init, then follows initI18n', () => {
    expect(locale()).toBe('en');
    expect(t('card.docs')).toBe('Documents');
    initI18n('pt');
    expect(locale()).toBe('pt');
    expect(t('card.docs')).toBe('Documentos');
  });
});

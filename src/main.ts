import './styles/tokens.css';
import './styles/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { detectLocale, forcedLocale } from './i18n';
import { initI18n, locale } from './i18n/current';
import { registerPassWorker } from './pass/deliver';
import { decodeEditLink } from './state/edit-link';
import type { Card } from './cards/types';

initI18n(detectLocale(navigator.languages, forcedLocale(document)));
document.documentElement.lang = locale() === 'pt' ? 'pt-BR' : 'en';
registerPassWorker().catch(() => {
  // No pass worker: deliverPass falls back to a download.
});

// An edit link (#c=...) opens its card; the card data then leaves the address bar.
let initialCard: Card | null = null;
if (location.hash.startsWith('#c=')) {
  initialCard = decodeEditLink(location.hash);
  history.replaceState(null, '', location.pathname);
}

// The static hero (for crawlers) lives inside the mount node; mount() appends, so clear it first.
const target = document.getElementById('app')!;
target.replaceChildren();
mount(App, { target, props: { initialCard } });

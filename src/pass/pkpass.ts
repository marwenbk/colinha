// The whole pipeline: card -> pass.json + images -> manifest -> signature -> .pkpass Blob.
import { toLayout } from '../cards/layout';
import type { Card } from '../cards/types';
import type { T } from '../i18n';
import { encodeEditLink } from '../state/edit-link';
import { type ImageLoader, loadPassImages } from './assets';
import { buildManifest } from './manifest';
import { buildPassJson } from './pass-json';
import { requestSignature } from './sign-client';
import { backgroundImages } from './background';
import { zipPass } from './zip';

export const PKPASS_TYPE = 'application/vnd.apple.pkpass';

export interface PkpassDeps {
  /** Used only for POST /api/sign. */
  fetch?: typeof fetch;
  /** Reads `/pass/<name>.png`; defaults to a cached same-origin fetch. */
  loader?: ImageLoader;
}

/** The card id is the pass serial, so a re-issued pass replaces the old one. */
export async function buildPkpass(
  card: Card,
  t: T,
  origin: string,
  deps: PkpassDeps = {},
): Promise<Blob> {
  const layout = toLayout(card, t, encodeEditLink(card, origin));
  const files: Record<string, Uint8Array> = {
    'pass.json': new TextEncoder().encode(JSON.stringify(buildPassJson(layout, card.id))),
    ...(await loadPassImages(deps.loader)),
    ...backgroundImages(layout.art, layout.tone),
  };
  const manifest = await buildManifest(files);
  const signature = await requestSignature(manifest, deps.fetch);
  const zip = zipPass({ ...files, 'manifest.json': manifest, signature });
  return new Blob([zip as Uint8Array<ArrayBuffer>], { type: PKPASS_TYPE });
}

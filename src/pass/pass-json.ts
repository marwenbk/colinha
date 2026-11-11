// Turns a PassLayout into Apple's pass.json (event ticket style: the only
// style whose background image covers the whole pass, so the card's
// gradient fills it).
import type { PassField, PassLayout } from '../cards/types';
import { ORG_NAME, PASS_TYPE_ID, TEAM_ID } from '../config';

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;').replace(/"/g, '&quot;');

function field(f: PassField, onBack: boolean): Record<string, unknown> {
  // The edit field keeps label '' (labels are optional in PassKit); no ORG_NAME fallback.
  if (f.link) {
    const { href, text } = f.link;
    return {
      key: f.key,
      label: f.label,
      value: text,
      attributedValue: `<a href='${escapeAttr(href)}'>${escapeAttr(text)}</a>`,
      dataDetectorTypes: ['PKDataDetectorTypeLink'],
    };
  }
  const out: Record<string, unknown> = { key: f.key, label: f.label, value: f.value };
  // Data detectors only run on back fields.
  if (onBack && f.detect === false) out.dataDetectorTypes = [];
  if (onBack && f.detect === 'address') out.dataDetectorTypes = ['PKDataDetectorTypeAddress'];
  return out;
}

export function buildPassJson(layout: PassLayout, serial: string): Record<string, unknown> {
  const front = (fs: PassField[]) => fs.map((f) => field(f, false));
  const json: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: TEAM_ID,
    organizationName: ORG_NAME,
    serialNumber: serial,
    description: layout.description,
    logoText: layout.logoText,
    // The pass holds personal data: Wallet hides its Share button.
    sharingProhibited: true,
    backgroundColor: layout.colors.bg,
    foregroundColor: layout.colors.fg,
    labelColor: layout.colors.label,
    eventTicket: {
      primaryFields: front(layout.primary),
      secondaryFields: front(layout.secondary),
      auxiliaryFields: front(layout.auxiliary),
      backFields: layout.back.map((f) => field(f, true)),
    },
  };
  if (layout.barcodes.length > 0)
    json.barcodes = layout.barcodes.map(({ altText, ...b }) => ({
      ...b,
      messageEncoding: 'iso-8859-1',
      ...(altText ? { altText } : {}),
    }));
  return json;
}

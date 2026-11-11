import { describe, expect, it } from 'vitest';
import { toLayout } from '../../../src/cards/layout';
import type { PassLayout } from '../../../src/cards/types';
import { ORG_NAME, PASS_TYPE_ID, TEAM_ID } from '../../../src/config';
import { createT } from '../../../src/i18n';
import { buildPassJson } from '../../../src/pass/pass-json';
import { encodeEditLink } from '../../../src/state/edit-link';
import { SERIAL, addressCard, docsCard, pixCard } from './fixtures';

const t = createT('pt');
const ORIGIN = 'https://colinha.app';
type Field = Record<string, unknown>;
type Generic = Record<'primaryFields' | 'secondaryFields' | 'auxiliaryFields' | 'backFields', Field[]>;

describe('buildPassJson', () => {
  for (const card of [docsCard, addressCard, pixCard]) {
    it(`matches the ${card.type} snapshot`, () => {
      const json = buildPassJson(toLayout(card, t, encodeEditLink(card, ORIGIN)), SERIAL);
      expect(json).toMatchSnapshot();
    });
  }

  it('sets identity, text and colors', () => {
    const json = buildPassJson(toLayout(docsCard, t, 'https://x.test/'), SERIAL);
    expect(json).toMatchObject({
      formatVersion: 1,
      passTypeIdentifier: PASS_TYPE_ID,
      teamIdentifier: TEAM_ID,
      organizationName: ORG_NAME,
      serialNumber: SERIAL,
      description: 'Documentos',
      logoText: 'Documentos',
      backgroundColor: 'rgb(28,28,30)',
      foregroundColor: 'rgb(255,255,255)',
    });
    expect(json.labelColor).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });

  it('turns off data detectors on back fields only', () => {
    const g = buildPassJson(toLayout(docsCard, t, 'https://x.test/'), SERIAL).generic as Generic;
    expect(g.primaryFields[0]).toEqual({ key: 'cpf', label: 'CPF', value: '529.982.247-25' });
    const cpf = g.backFields.find((f) => f.key === 'back_cpf')!;
    expect(cpf.dataDetectorTypes).toEqual([]);
    expect(cpf).not.toHaveProperty('detect');
  });

  it('renders the edit link as a link field', () => {
    const url = encodeEditLink(docsCard, ORIGIN);
    const g = buildPassJson(toLayout(docsCard, t, url), SERIAL).generic as Generic;
    const edit = g.backFields.find((f) => f.key === 'edit')!;
    expect(edit).toEqual({
      key: 'edit',
      label: '',
      value: 'Editar este cartão',
      attributedValue: `<a href='${url}'>Editar este cartão</a>`,
      dataDetectorTypes: ['PKDataDetectorTypeLink'],
    });
  });

  it("escapes ' and < in attributedValue", () => {
    const layout: PassLayout = {
      ...toLayout(docsCard, t, 'x'),
      back: [{ key: 'edit', label: '', value: '', link: { href: "https://x.test/?a='b'<c>&d", text: 'Go <now> & \'then\'' } }],
    };
    const g = buildPassJson(layout, SERIAL).generic as Generic;
    expect(g.backFields[0].attributedValue).toBe(
      "<a href='https://x.test/?a=&#39;b&#39;&lt;c&gt;&amp;d'>Go &lt;now&gt; &amp; &#39;then&#39;</a>",
    );
    expect(g.backFields[0].value).toBe('Go <now> & \'then\'');
  });

  it('adds iso-8859-1 barcodes, and none when the layout has none', () => {
    const json = buildPassJson(toLayout(docsCard, t, 'x'), SERIAL);
    expect(json.barcodes).toEqual([
      { format: 'PKBarcodeFormatCode128', message: '52998224725', messageEncoding: 'iso-8859-1' },
      { format: 'PKBarcodeFormatQR', message: '52998224725', messageEncoding: 'iso-8859-1' },
    ]);
    const none = buildPassJson(toLayout({ ...docsCard, barcode: false }, t, 'x'), SERIAL);
    expect(none).not.toHaveProperty('barcodes');
  });
});

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import type { Card } from '../src/cards/types';
import { pt } from '../src/i18n/pt';

export { pt };

export const STORAGE_KEY = 'colinha.cards.v1';

/** Finds an openssl with `cms` (stock macOS LibreSSL may lack it). */
function opensslEnv(): NodeJS.ProcessEnv {
  if (process.env.OPENSSL) return process.env;
  for (const bin of [
    '/opt/homebrew/opt/openssl@3/bin/openssl',
    '/usr/local/opt/openssl@3/bin/openssl',
  ]) {
    try {
      execFileSync(bin, ['version']);
      return { ...process.env, OPENSSL: bin };
    } catch {
      // try the next one
    }
  }
  return process.env;
}

export type PassJson = {
  serialNumber: string;
  generic: Record<string, { key: string; value: string }[]>;
  [k: string]: unknown;
};

/** Waits for window.__lastPass, unzips it in Node, verifies the signature, returns pass.json. */
export async function lastPass(page: Page): Promise<PassJson> {
  await page.waitForFunction(
    () => (window as unknown as { __lastPass?: Blob }).__lastPass,
  );
  const bytes = await page.evaluate(async () => {
    const blob = (window as unknown as { __lastPass: Blob }).__lastPass;
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const zip = Uint8Array.from(bytes);
  const files = unzipSync(zip);
  const pass = JSON.parse(
    new TextDecoder().decode(files['pass.json']),
  ) as PassJson;

  const dir = mkdtempSync(join(tmpdir(), 'colinha-e2e-'));
  try {
    const file = join(dir, 'pass.pkpass');
    writeFileSync(file, zip);
    for (const [name, data] of Object.entries(files))
      writeFileSync(join(dir, name), data);
    // Throws (failing the test) unless verify-pass.sh exits 0.
    execFileSync(
      'scripts/verify-pass.sh',
      [file, 'worker/test/fixtures/ca.pem'],
      {
        env: opensslEnv(),
        stdio: 'pipe',
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return pass;
}

export async function clearLastPass(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as unknown as { __lastPass?: Blob }).__lastPass;
  });
}

/** Records CSP violations across navigations; assert with `expectNoCspViolations`. */
export async function watchCsp(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.exposeFunction('__cspViolation', (v: string) =>
    violations.push(v),
  );
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (
        window as unknown as { __cspViolation: (v: string) => void }
      ).__cspViolation(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return violations;
}

export async function seedCards(page: Page, cards: Card[]): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k, v),
    [STORAGE_KEY, JSON.stringify(cards)],
  );
  await page.reload();
}

const hex = (n: number) => n.toString(16).padStart(32, '0');

export function docsCard(n = 1, over: Partial<Card> = {}): Card {
  return {
    v: 1,
    id: hex(n),
    type: 'docs',
    color: 'graphite',
    updatedAt: 1_700_000_000_000 + n,
    cpf: '52998224725',
    name: 'Ana Souza',
    rg: '',
    rnm: 'V123456-7',
    passport: '',
    barcode: true,
    ...over,
  } as Card;
}

export function pixCard(n = 2, over: Partial<Card> = {}): Card {
  return {
    v: 1,
    id: hex(n),
    type: 'pix',
    color: 'teal',
    updatedAt: 1_700_000_000_000 + n,
    key: 'ana@exemplo.com',
    keyType: 'email',
    name: 'Ana Souza',
    city: 'Sao Paulo',
    ...over,
  } as Card;
}

export const badge = (page: Page) =>
  page.getByRole('button', { name: 'Adicionar à Carteira Apple' });

export async function expectEditorClosed(page: Page): Promise<void> {
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

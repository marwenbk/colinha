import { expect, test } from '@playwright/test';
import { encodeEditLink } from '../src/state/edit-link';
import {
  badge,
  docsCard,
  expectEditorClosed,
  lastPass,
  pixCard,
  pt,
  seedCards,
  STORAGE_KEY,
  watchCsp,
} from './helpers';

// Flows run on the iPhone (WebKit) project against the VITE_E2E=1 preview build.
test.use({ locale: 'pt-BR' });

let csp: string[] = [];

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'webkit-iphone', 'iPhone flows');
  csp = await watchCsp(page);
  page.on('dialog', (d) => {
    throw new Error(`unexpected dialog: ${d.message()}`);
  });
});

test.afterEach(async () => {
  expect(csp, 'securitypolicyviolation events').toEqual([]);
});

async function fillDocs(
  page: import('@playwright/test').Page,
  name = 'Ana Souza',
) {
  await page.getByLabel(pt['field.cpf'], { exact: true }).fill('52998224725');
  await page.getByLabel(pt['field.name'], { exact: true }).fill(name);
  await page.getByLabel(pt['field.rnm'], { exact: true }).fill('v123456-7');
}

test('creates a Docs card: the pass unzips, has the CPF and its signature verifies', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(pt['card.docs']) }).click();
  const editor = page.getByRole('dialog', { name: pt['card.docs'] });
  await expect(editor).toBeVisible();
  await fillDocs(page);
  // The live pass fills in as you type.
  await expect(editor.locator('.pass').first()).toContainText('529.982.247-25');
  await badge(page).click();
  const pass = await lastPass(page);
  expect(pass.generic.primaryFields[0].value).toBe('529.982.247-25');
  expect(pass.generic.auxiliaryFields.map((f) => f.value)).toContain(
    'V123456-7',
  );
  await expectEditorClosed(page);
  await expect(
    page.getByRole('button', { name: /529\.982\.247-25/ }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) ?? '[]'),
    STORAGE_KEY,
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe(pass.serialNumber);
});

test('privacy: only same-origin requests, and the only POST is /api/sign with 32 bytes', async ({
  page,
  baseURL,
}) => {
  const requests: import('@playwright/test').Request[] = [];
  page.on('request', (r) => requests.push(r));
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(pt['card.docs']) }).click();
  await fillDocs(page);
  await badge(page).click();
  await lastPass(page);
  await expectEditorClosed(page);

  expect(requests.length).toBeGreaterThan(0);
  const origin = new URL(baseURL!).origin;
  const foreign = requests
    .map((r) => r.url())
    .filter((u) => !u.startsWith('data:') && !u.startsWith('blob:'))
    .filter((u) => new URL(u).origin !== origin);
  expect(foreign, 'cross-origin requests').toEqual([]);

  const posts = requests.filter((r) => r.method() !== 'GET');
  expect(posts.length, 'at least one sign request').toBeGreaterThan(0);
  for (const r of posts) {
    expect(`${r.method()} ${new URL(r.url()).pathname}`).toBe('POST /api/sign');
    expect(r.postDataBuffer()?.length).toBe(32);
  }
});

test('an edit link opens the Editor prefilled and clears the hash', async ({
  page,
  baseURL,
}) => {
  const card = docsCard(7, { name: 'Bia Lima' });
  await page.goto(encodeEditLink(card, baseURL!));
  await expect(
    page.getByRole('dialog', { name: pt['card.docs'] }),
  ).toBeVisible();
  await expect(page.getByLabel(pt['field.cpf'], { exact: true })).toHaveValue(
    '529.982.247-25',
  );
  await expect(page.getByLabel(pt['field.name'], { exact: true })).toHaveValue(
    'Bia Lima',
  );
  expect(await page.evaluate(() => location.hash)).toBe('');
});

test('after localStorage is cleared, re-adding from the edit link keeps the serial', async ({
  page,
  baseURL,
}) => {
  const card = docsCard(9);
  await seedCards(page, [card]);
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank'); // a fresh load from the link, as Wallet would open it
  await page.goto(encodeEditLink(card, baseURL!));
  await expect(page.getByLabel(pt['field.cpf'], { exact: true })).toHaveValue(
    '529.982.247-25',
  );
  await badge(page).click();
  const pass = await lastPass(page);
  expect(pass.serialNumber).toBe(card.id);
});

test('an ambiguous Pix key blocks Add until a segment is picked', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: new RegExp(`^${pt['card.pix']}`) })
    .click();
  await page
    .getByLabel(pt['field.pixKey'], { exact: true })
    .fill('11912345684');
  await page.getByLabel(pt['field.name'], { exact: true }).fill('Ana Souza');
  await page.getByLabel(pt['field.city'], { exact: true }).fill('São Paulo');
  const choice = page.getByRole('radiogroup', { name: pt['field.pixKey'] });
  await expect(
    choice.getByRole('radio', { name: pt['pixType.cpf'] }),
  ).toBeVisible();
  await expect(
    choice.getByRole('radio', { name: pt['pixType.phone'] }),
  ).toBeVisible();

  await badge(page).click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => '__lastPass' in window)).toBe(false);
  await expect(
    page.getByRole('dialog', { name: pt['card.pix'] }),
  ).toBeVisible();

  await choice.getByRole('radio', { name: pt['pixType.phone'] }).click();
  await badge(page).click();
  const pass = await lastPass(page);
  expect(pass.generic.primaryFields[0].value).toBe('(11) 91234-5684');
});

test('Delete asks first, then removes the card; Erase everything empties the list and the pass cache', async ({
  page,
}) => {
  await seedCards(page, [docsCard(1), pixCard(2)]);
  await page.getByRole('button', { name: /529\.982\.247-25/ }).click();
  await page.getByRole('button', { name: pt['action.delete'] }).click();
  const confirm = page.getByRole('dialog', { name: pt['confirm.delete'] });
  await expect(confirm).toContainText(pt['confirm.deleteNote']);
  await confirm.getByRole('button', { name: pt['confirm.yes'] }).click();
  await expectEditorClosed(page);
  await expect(
    page.getByRole('button', { name: /529\.982\.247-25/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /ana@exemplo\.com/ }),
  ).toBeVisible();

  await page.evaluate(() => caches.open('colinha-pass'));
  expect(await page.evaluate(() => caches.has('colinha-pass'))).toBe(true);
  await page.getByRole('button', { name: pt['privacy.line'] }).click();
  await page.getByRole('button', { name: pt['action.eraseAll'] }).click();
  const erase = page.getByRole('dialog', { name: pt['confirm.eraseAll'] });
  await expect(erase).toContainText(pt['confirm.eraseAllNote']);
  await erase.getByRole('button', { name: pt['confirm.yes'] }).click();
  await expect(
    page.getByRole('button', { name: /ana@exemplo\.com/ }),
  ).toHaveCount(0);
  await expect(page.getByText(pt['app.tagline'])).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe(
    '[]',
  );
  await expect
    .poll(() => page.evaluate(() => caches.has('colinha-pass')))
    .toBe(false);
});

test('(+) opens the type picker and a second Pix card sits alongside the first', async ({
  page,
}) => {
  await seedCards(page, [pixCard(2)]);
  await page.getByRole('button', { name: pt['a11y.newCard'] }).click();
  const picker = page.getByRole('dialog', { name: pt['a11y.newCard'] });
  for (const k of ['card.docs', 'card.address', 'card.pix'] as const)
    await expect(
      picker.getByRole('button', { name: pt[k], exact: true }),
    ).toBeVisible();
  await picker
    .getByRole('button', { name: pt['card.pix'], exact: true })
    .click();
  const editor = page.getByRole('dialog', { name: pt['card.pix'] });
  await expect(editor).toBeVisible();
  await page
    .getByLabel(pt['field.pixKey'], { exact: true })
    .fill('bia@exemplo.com');
  // Name and city were prefilled? No Docs/Address cards here, so fill them.
  await page.getByLabel(pt['field.name'], { exact: true }).fill('Bia Lima');
  await page.getByLabel(pt['field.city'], { exact: true }).fill('Recife');
  await expect(editor.getByText(pt['pixType.email'])).toBeVisible();
  await badge(page).click();
  await lastPass(page);
  await expectEditorClosed(page);
  await expect(
    page.getByRole('button', { name: /ana@exemplo\.com/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /bia@exemplo\.com/ }),
  ).toBeVisible();
});

test.describe('sign errors', () => {
  // page.route can't see requests that pass through the pass worker.
  test.use({ serviceWorkers: 'block' });

  test('sign errors show a toast and keep the fields; a retry succeeds', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: new RegExp(pt['card.docs']) })
      .click();
    await fillDocs(page);

    await page.route('**/api/sign', (r) =>
      r.fulfill({ status: 500, body: 'no' }),
    );
    await badge(page).click();
    await expect(page.getByRole('status')).toHaveText(pt['error.server']);
    await expect(page.getByLabel(pt['field.cpf'], { exact: true })).toHaveValue(
      '529.982.247-25',
    );

    await page.unroute('**/api/sign');
    await page.route('**/api/sign', (r) => r.abort());
    await badge(page).click();
    await expect(page.getByRole('status')).toHaveText(pt['error.offline']);
    await expect(
      page.getByLabel(pt['field.name'], { exact: true }),
    ).toHaveValue('Ana Souza');
    expect(await page.evaluate(() => '__lastPass' in window)).toBe(false);

    await page.unroute('**/api/sign');
    await badge(page).click();
    const pass = await lastPass(page);
    expect(pass.generic.primaryFields[0].value).toBe('529.982.247-25');
  });
});

test('a markup-looking name renders as text, with no dialog', async ({
  page,
}) => {
  const evil = '<img src=x onerror=alert(1)>';
  await seedCards(page, [docsCard(3, { name: evil })]);
  await expect(page.getByText(evil)).toBeVisible();
  await page.getByRole('button', { name: /529\.982\.247-25/ }).click();
  await expect(page.getByLabel(pt['field.name'], { exact: true })).toHaveValue(
    evil,
  );
  await expect(page.getByRole('dialog').getByText(evil)).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no transform transitions run', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __tx: string[] };
      w.__tx = [];
      document.addEventListener(
        'transitionrun',
        (e) => {
          if (e.propertyName.includes('transform'))
            w.__tx.push(`transition ${e.propertyName}`);
        },
        true,
      );
      document.addEventListener(
        'animationstart',
        (e) => {
          const el = e.target as Element;
          for (const a of el.getAnimations()) {
            const frames =
              (a.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
            if (frames.some((k) => 'transform' in k))
              w.__tx.push(`animation ${e.animationName}`);
          }
        },
        true,
      );
    });
    await page.goto('/');
    await page
      .getByRole('button', { name: new RegExp(pt['card.docs']) })
      .click();
    await fillDocs(page);
    await badge(page).click();
    await lastPass(page);
    await expectEditorClosed(page);
    // Keyframe animations: none of the running ones may move anything.
    const moving = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) =>
            (a.effect as KeyframeEffect | null)
              ?.getKeyframes()
              .some((k) => 'transform' in k),
          ).length,
    );
    expect(moving).toBe(0);
    expect(
      await page.evaluate(() => (window as unknown as { __tx: string[] }).__tx),
    ).toEqual([]);
  });
});

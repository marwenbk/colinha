import { expect, test } from '@playwright/test';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { en } from '../src/i18n/en';
import { decodeEditLink, encodeEditLink } from '../src/state/edit-link';
import { pt, watchCsp } from './helpers';
import { UA } from './user-agents';

test.describe('in-app browser (Instagram)', () => {
  test.use({ locale: 'pt-BR', userAgent: UA.instagram });

  test('shows the banner and no badge', async ({ page }, info) => {
    test.skip(info.project.name !== 'webkit-iphone', 'iPhone only');
    const csp = await watchCsp(page);
    await page.goto('/');
    await page
      .getByRole('button', { name: new RegExp(pt['card.docs']) })
      .click();
    await expect(
      page.getByRole('dialog', { name: pt['card.docs'] }),
    ).toBeVisible();
    await expect(page.getByText(pt['guard.inApp'])).toBeVisible();
    await expect(
      page.getByRole('button', { name: pt['guard.copyLink'] }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Adicionar à Carteira Apple' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('img', { name: 'Adicionar à Carteira Apple' }),
    ).toHaveCount(0);
    expect(csp).toEqual([]);
  });
});

test.describe('desktop handoff', () => {
  test.use({ locale: 'pt-BR' });

  test('"Continuar no iPhone" opens a QR of the edit link', async ({
    page,
    baseURL,
  }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'desktop only');
    const csp = await watchCsp(page);
    await page.goto('/');
    await page
      .getByRole('button', { name: new RegExp(pt['card.docs']) })
      .click();
    await page.getByLabel(pt['field.cpf'], { exact: true }).fill('52998224725');
    await page.getByLabel(pt['field.name'], { exact: true }).fill('Ana Souza');
    await expect(
      page.getByRole('button', { name: 'Adicionar à Carteira Apple' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: pt['guard.desktop'] }).click();

    const sheet = page.getByRole('dialog', { name: pt['guard.desktop'] });
    await expect(sheet).toContainText(pt['guard.desktopHint']);
    const qr = sheet.getByTestId('handoff-qr');
    await expect(qr).toBeVisible();
    await page.waitForTimeout(600); // let the sheet finish sliding in
    const png = await qr.screenshot();
    const { data, info: img } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const code = jsQR(new Uint8ClampedArray(data), img.width, img.height);
    expect(code, 'QR decodes').not.toBeNull();
    const text = code!.data;

    const card = decodeEditLink(new URL(text).hash);
    expect(card).not.toBeNull();
    expect(text).toBe(encodeEditLink(card!, new URL(baseURL!).origin));
    expect(card).toMatchObject({
      type: 'docs',
      cpf: '52998224725',
      name: 'Ana Souza',
    });
    expect(csp).toEqual([]);
  });
});

test.describe('language', () => {
  test.beforeEach(({}, info) => {
    test.skip(
      info.project.name !== 'chromium-desktop',
      'one browser is enough',
    );
  });

  test.describe('pt-BR', () => {
    test.use({ locale: 'pt-BR' });
    test('the UI is Portuguese', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText(pt['app.tagline'])).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(
        'pt-BR',
      );
    });
    test('/en/ is English', async ({ page }) => {
      await page.goto('/en/');
      await expect(page.getByText(en['app.tagline'])).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(
        'en',
      );
    });
  });

  test.describe('en-US', () => {
    test.use({ locale: 'en-US' });
    test('the UI is English', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText(en['app.tagline'])).toBeVisible();
      await expect(page.getByText(en['privacy.line'])).toBeVisible();
    });
  });
});

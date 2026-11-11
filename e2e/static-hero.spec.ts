import { expect, test } from '@playwright/test';

for (const [path, tagline] of [
  ['/', 'Seus números na Carteira.'],
  ['/pt/', 'Seus números na Carteira.'],
  ['/en/', 'Your numbers in Apple Wallet.'],
] as const) {
  test.use({ locale: 'pt-BR' });
  test(`static hero is replaced cleanly on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText(tagline)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Colinha' })).toHaveCount(1);
  });
}

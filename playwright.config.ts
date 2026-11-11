import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'VITE_E2E=1 pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'webkit-iphone', use: { ...devices['iPhone 15'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});

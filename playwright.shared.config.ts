import { defineConfig } from '@playwright/test';
const databaseUrl = process.env.TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !['127.0.0.1', 'localhost'].includes(new URL(databaseUrl).hostname) ||
  !new URL(databaseUrl).pathname.endsWith('/lavaon_test')
)
  throw new Error('Informe TEST_DATABASE_URL de um banco local lavaon_test exclusivo para testes.');
export default defineConfig({
  outputDir: 'test-results-shared',
  testDir: './tests/shared',
  fullyParallel: true,
  workers: 3,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 320, height: 740 } } },
    { name: 'firefox', use: { browserName: 'firefox', viewport: { width: 768, height: 1024 } } },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        launchOptions: process.env.LAVA_WEBKIT_EXECUTABLE
          ? { executablePath: process.env.LAVA_WEBKIT_EXECUTABLE }
          : {},
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://127.0.0.1:3002/api/app?health=1',
      env: { DATABASE_URL: databaseUrl, API_PORT: '3002', APP_ORIGIN: 'http://127.0.0.1:4175' },
      timeout: 30000,
    },
    {
      command:
        'VITE_DATA_MODE=server npm run build -- --outDir /tmp/lava-on-shared-dist && LAVA_API_TARGET=http://127.0.0.1:3002 npm run preview -- --outDir /tmp/lava-on-shared-dist --port 4175 --host 127.0.0.1',
      url: 'http://127.0.0.1:4175',
      timeout: 120000,
    },
  ],
});

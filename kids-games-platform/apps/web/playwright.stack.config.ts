import { defineConfig, devices } from '@playwright/test';

/**
 * Stack E2E configuration — runs against the Podman+Caddy deployment.
 *
 * Preconditions:
 *   podman-compose -f infra/podman/compose.yml up -d
 *   ./infra/podman/smoke-test.sh   (optional but recommended)
 *
 * Usage:
 *   pnpm test:e2e:stack            (from platform root)
 *   pnpm --filter @kids-games/web test:e2e:stack
 *
 * The stack base URL defaults to http://localhost:80 (Caddy HTTP).
 * Override with BASE_URL_STACK env var for HTTPS or a custom port:
 *   BASE_URL_STACK=https://localhost pnpm test:e2e:stack
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: process.env['BASE_URL_STACK'] ?? 'http://localhost',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — stack must already be running before this command is invoked.
});

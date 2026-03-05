/**
 * Minimal end-to-end test: flashcards flow.
 * Requires API running on http://localhost:3000 and web on http://localhost:5173.
 *
 * Run with: pnpm test:e2e
 * Skip in CI by not including this suite (CI runs unit/integration only).
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL = `e2e-${Date.now()}@e2e-test.local`;
const TEST_PASSWORD = 'E2ePass123!';
const TEST_NAME = 'E2E User';

test.describe('Flashcards e2e flow', () => {
  test.beforeAll(async ({ request }) => {
    // Register a fresh user via the API directly
    const res = await request.post('http://localhost:3000/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, displayName: TEST_NAME },
    });
    if (!res.ok()) {
      throw new Error(`Setup failed: could not register test user (${res.status()})`);
    }
  });

  test('register and login flow', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(TEST_EMAIL + '-new');
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByLabel(/display name/i).fill(TEST_NAME);
    await page.getByRole('button', { name: /create account/i }).click();
    // Should redirect to menu after register
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/game library/i)).toBeVisible();
  });

  test('login, open deck, browse cards, mark known, verify progress persists', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');

    // 2. Navigate to flashcards
    await page.getByText('Flash Cards').click();
    await expect(page).toHaveURL('/flashcards');

    // 3. Pick first deck
    const deckCard = page.locator('button').filter({ hasText: /\d+ cards/ }).first();
    await expect(deckCard).toBeVisible();
    await deckCard.click();
    await expect(page.url()).toMatch(/\/flashcards\/.+/);

    // 4. Verify first card is shown
    await expect(page.getByText(/card 1 of/i)).toBeVisible();

    // 5. Mark first card as known
    await page.getByRole('button', { name: /mark as known/i }).click();
    await expect(page.getByRole('button', { name: /known!/i })).toBeVisible();

    // 6. Navigate to next card
    await page.getByRole('button', { name: /next card/i }).click();
    await expect(page.getByText(/card 2 of/i)).toBeVisible();

    // 7. Reload and verify progress persisted (known count ≥ 1)
    await page.reload();
    await expect(page.getByText(/known/i)).toBeVisible();
    const progressText = await page.getByText(/\d+\/\d+ known/).textContent();
    const [known] = (progressText ?? '0/0').split('/');
    expect(parseInt(known ?? '0')).toBeGreaterThanOrEqual(1);
  });
});

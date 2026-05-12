/**
 * Middleware gate tests — Playwright port of scripts/smoke-middleware.ts
 *
 * Tests 13 cases covering public routes (200) and protected routes (→ /login redirect).
 * Does NOT require authentication — all checks are unauthenticated.
 */
import { test, expect } from '@playwright/test';

const BASE = '';

/**
 * Routes that should be accessible without login (200).
 */
const publicRoutes = ['/', '/signup', '/login', '/catalog'];

/**
 * Routes that should redirect to /login when unauthenticated.
 */
const protectedRoutes = [
  '/sell',
  '/sell/new',
  '/buy',
  '/buy/orders',
  '/admin',
  '/admin/members',
  '/verify-phone',
  '/account',
];

for (const path of publicRoutes) {
  test(`public ${path} → 200`, async ({ page }) => {
    const response = await page.goto(BASE + path);
    expect(response?.status()).toBe(200);
  });
}

for (const path of protectedRoutes) {
  test(`protected ${path} (unauthenticated) → /login redirect`, async ({ page }) => {
    await page.goto(BASE + path);
    // After following redirects, URL should contain /login
    expect(page.url()).toContain('/login');
  });
}

test('no-access?reason=agent-required → 200 + 에이전트 text', async ({ page }) => {
  const response = await page.goto(BASE + '/no-access?reason=agent-required');
  expect(response?.status()).toBe(200);
  // Page must contain '에이전트' somewhere (Korean for "agent")
  await expect(page.getByText(/에이전트/)).toBeVisible();
});

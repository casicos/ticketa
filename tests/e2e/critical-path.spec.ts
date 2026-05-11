/**
 * Critical-path E2E specs — MVP level (Section 10.3)
 *
 * Scenario 1: Unauthenticated access redirects
 *   Confirms public routes load and protected routes redirect to /login.
 *
 * Scenario 2: Signup + dev-mode OTP bypass  [opt-in: E2E_SIGNUP=1]
 *   Submits signup form with a random email, lands on /verify-phone,
 *   enters the fixed dev-mode OTP "123456", and expects redirect to /.
 *
 * Assumptions:
 *   - dev server running at baseURL (reuseExistingServer: true)
 *   - NODE_ENV=development → OTP bypass with code 123456 is active
 *   - Supabase local / dev instance accepting new users
 *   - No DB cleanup — leftover test users are acceptable in dev
 *
 * RATE LIMIT NOTE:
 *   The remote Supabase dev instance caps new signups at 2/hour.
 *   Scenario 2 is therefore opt-in: set E2E_SIGNUP=1 to enable it.
 *   When using a local Supabase instance (supabase start) there is no limit.
 */
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Remote Supabase blocks reserved domains (example.com, test.com, etc.).
// Use a non-reserved domain to avoid "Email address is invalid" rejection.
const TEST_EMAIL_DOMAIN = 'ticketa-test.dev';

function randomEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `test-e2e-${ts}-${rand}@${TEST_EMAIL_DOMAIN}`;
}

const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'E2E Test';
const TEST_PHONE = '010-9999-0001';
const DEV_OTP = '123456';

// ---------------------------------------------------------------------------
// Scenario 1: Unauthenticated access redirects
// ---------------------------------------------------------------------------

test.describe('Scenario 1: Unauthenticated redirect gates', () => {
  test('/ homepage is accessible without login', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
  });

  test('/sell redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/sell');
    expect(page.url()).toContain('/login');
  });

  test('/buy redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/buy');
    expect(page.url()).toContain('/login');
  });

  test('/admin redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/admin');
    expect(page.url()).toContain('/login');
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Signup + dev-mode OTP bypass (opt-in via E2E_SIGNUP=1)
// ---------------------------------------------------------------------------

test.describe('Scenario 2: Signup → verify-phone (dev OTP bypass)', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.E2E_SIGNUP) {
      testInfo.skip(
        true,
        'Skipped: remote Supabase rate-limit (2/hour). Run with E2E_SIGNUP=1 against a local Supabase instance.',
      );
    }
  });

  test('signup form → /verify-phone → OTP 123456 → redirect to /', async ({ page }) => {
    const email = randomEmail();

    // Step 1: Navigate to /signup
    await page.goto('/signup');
    await expect(page).toHaveURL(/\/signup/);

    // Step 2: Fill signup form
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill(TEST_PASSWORD);
    await page.getByLabel('이름 (실명)').fill(TEST_NAME);
    await page.getByLabel('휴대폰 번호').fill(TEST_PHONE);

    // Check required consent checkboxes (Radix UI — click the label text)
    await page.getByText('[필수] 이용약관에 동의합니다').click();
    await page.getByText('[필수] 개인정보처리방침에 동의합니다').click();

    // Step 3: Submit — server action redirects to /verify-phone on success
    await page.getByRole('button', { name: '가입하기' }).click();

    // Step 4: Should land on /verify-phone
    await expect(page).toHaveURL(/\/verify-phone/, { timeout: 15_000 });

    // Step 5: Enter dev-mode fixed OTP (NODE_ENV=development → 123456 accepted)
    const otpField = page.getByLabel(/인증번호|OTP|코드/i).first();
    await otpField.fill(DEV_OTP);

    // Submit OTP form
    await page.getByRole('button', { name: /인증|확인|verify/i }).click();

    // Step 6: After successful OTP → redirected to / (or nextPath)
    await expect(page).toHaveURL(/^\/?$|\//, { timeout: 15_000 });
    expect(page.url()).not.toMatch(/verify-phone/);
  });
});

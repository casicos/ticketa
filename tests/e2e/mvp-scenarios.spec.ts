/**
 * MVP scenario smoke tests — 2026-05-11 EOD 마감 시나리오.
 *
 * 인증 없는 공개 영역만 검증한다. 인증된 매입/등록/어드민 흐름은
 * fixture 가 갖춰지면 별도 스펙으로 분리. 여기서는:
 *   - /catalog 가 200 + 매물 카드 또는 빈 상태 렌더
 *   - /sell/new (미로그인 시 /login 으로 redirect)
 *   - /admin/intake (미로그인 시 /login 으로 redirect 또는 /no-access)
 *   - /agent/inventory (미로그인 시 redirect)
 *   - /account/gift "준비중" 안내 노출 (인증 필요해 redirect 만 검증)
 *
 * 회귀 방지 목적이므로 200/302 만 확인. UI 디테일은 critical-path.spec.ts 참고.
 */
import { test, expect } from '@playwright/test';

test.describe('MVP scenarios — public surface', () => {
  test('/catalog 는 비로그인 상태에서 200 응답', async ({ page }) => {
    const res = await page.goto('/catalog');
    expect(res?.status() ?? 0).toBeLessThan(400);
    await expect(page).toHaveURL(/\/catalog/);
    // 카탈로그 페이지 표지 — 헤더 또는 매물 카드 컨테이너
    await expect(page.locator('body')).toContainText(/시세|카탈로그|매물|상품권/);
  });

  test('/sell/new 는 비로그인 시 /login 으로 redirect', async ({ page }) => {
    const res = await page.goto('/sell/new');
    // proxy.ts 가 /login 으로 redirect 또는 페이지가 자체적으로 처리
    await page.waitForURL(/\/(login|verify-phone|sell\/new)/);
    const url = page.url();
    expect(url).toMatch(/(login|verify-phone)/);
    expect(res?.status() ?? 0).toBeLessThan(500);
  });

  test('/admin 은 비로그인 시 /login 으로 redirect', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/(login|no-access)/);
    expect(page.url()).toMatch(/(login|no-access)/);
  });

  test('/agent 는 비로그인 시 /login 으로 redirect', async ({ page }) => {
    await page.goto('/agent');
    await page.waitForURL(/\/(login|no-access)/);
    expect(page.url()).toMatch(/(login|no-access)/);
  });

  test('/account/gift 직접 접근도 /login 으로 redirect (인증 필요)', async ({ page }) => {
    await page.goto('/account/gift');
    await page.waitForURL(/\/(login|verify-phone)/);
    expect(page.url()).toMatch(/(login|verify-phone)/);
  });

  test('/account/gift/[id] 도 /login 으로 (인증 필요한 redirect 우선)', async ({ page }) => {
    await page.goto('/account/gift/00000000-0000-0000-0000-000000000000');
    await page.waitForURL(/\/(login|verify-phone)/);
    expect(page.url()).toMatch(/(login|verify-phone)/);
  });
});

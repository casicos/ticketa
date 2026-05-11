import { describe, it, expect } from 'vitest';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';

describe('sanitizeRedirectPath', () => {
  it('상대 경로 통과', () => {
    expect(sanitizeRedirectPath('/catalog')).toBe('/catalog');
    expect(sanitizeRedirectPath('/sell/listings')).toBe('/sell/listings');
    expect(sanitizeRedirectPath('/buy/orders?tab=shipped')).toBe('/buy/orders?tab=shipped');
  });
  it('외부 도메인 차단 → /', () => {
    expect(sanitizeRedirectPath('https://evil.com')).toBe('/');
    expect(sanitizeRedirectPath('http://evil.com/catalog')).toBe('/');
    expect(sanitizeRedirectPath('//evil.com')).toBe('/');
  });
  it('빈 값 / undefined → /', () => {
    expect(sanitizeRedirectPath(null)).toBe('/');
    expect(sanitizeRedirectPath('')).toBe('/');
    expect(sanitizeRedirectPath(undefined)).toBe('/');
  });
  it('너무 긴 경로 → /', () => {
    expect(sanitizeRedirectPath('/' + 'a'.repeat(3000))).toBe('/');
  });
  it('/ 로 시작하지 않는 경로 → /', () => {
    expect(sanitizeRedirectPath('catalog')).toBe('/');
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/');
  });
});

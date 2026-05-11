/**
 * 외부 도메인/프로토콜 리다이렉트 방지.
 * - 반드시 `/` 로 시작하고 `//` 로 시작하지 않는 경로만 허용.
 * - 프로토콜-상대 URL (`//evil.com`) 및 절대 URL (`https://evil.com`) 차단.
 */
export function sanitizeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (typeof raw !== 'string') return '/';
  if (!raw.startsWith('/')) return '/';
  if (raw.startsWith('//')) return '/';
  // 너무 긴 경로는 이상 징후
  if (raw.length > 2048) return '/';
  return raw;
}

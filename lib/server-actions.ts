/**
 * Server Action 공통 래퍼.
 * - try/catch 후 표준 응답 `{ok, data}` 또는 `{ok:false, code, message}` 반환
 * - AuthError → code 그대로 매핑 (FORBIDDEN, UNAUTHENTICATED, PHONE_UNVERIFIED)
 * - Sentry capture 는 DSN 미설정 시 자동 skip
 * - TODO(Phase 2+): error_log 테이블 insert (admin client 경유 — domain layer wrapper 필요)
 */
import { AuthError } from '@/lib/auth/guards';

export type ServerActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message?: string };

type ActionError = Error & { code?: string };

export async function withServerAction<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<ServerActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (raw) {
    const e = (raw instanceof Error ? raw : new Error(String(raw))) as ActionError;

    let code = 'INTERNAL';
    if (e instanceof AuthError) {
      code = e.code;
    } else if (typeof e.code === 'string') {
      code = e.code;
    }

    // Sentry capture: DSN 없으면 no-op. 동적 import 로 edge runtime 부담 최소화.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(e, { tags: { server_action: name } });
      } catch {
        // Sentry 모듈 미로드 환경 — 무시
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // dev 환경에서는 stderr 기록해 디버깅 지원
      console.error(`[server-action:${name}]`, e);
    }

    return { ok: false, code, message: e.message };
  }
}

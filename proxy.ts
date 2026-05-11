import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Edge middleware — 라우트 접근 게이트.
 *
 * 보호 규칙:
 *   - /sell/**, /buy/**, /account, /verify-phone → 미로그인 시 /login?next=... 로 302
 *   - /sell/**, /buy/**, /account                → phone_verified 필요
 *   - /buy/**                                    → agent role 필요
 *   - /admin/**                                  → admin role 필요
 *
 * /catalog 는 공개 시세 뷰 — 누구나 열람 가능. 매입 버튼만 페이지 내에서
 * agent/admin role 로 게이팅 (시세만 보는 일반 사용자도 허용).
 */

type Role = 'seller' | 'agent' | 'admin';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // 미들웨어는 경로 게이트 용도. JWT 는 Supabase 서버가 서명 — 위조 불가.
  // getUser() 는 매 요청마다 /auth/v1/user 로 HTTP 콜 (500ms–1s) 을 때리는 반면
  // getSession() 은 쿠키만 디코드 (수 ms). 토큰 만료 시 자동 refresh.
  // 실제 데이터 접근 시점에 supabase 가 다시 토큰을 검증하므로 보안상 충분.
  let user:
    | NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>['user']
    | null = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error) user = data.session?.user ?? null;
  } catch (e) {
    if (!isSupabaseAuthError(e)) throw e;
  }

  // --- 미로그인 처리 ---
  if (!user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(redirect);
  }

  const roles = extractRoles(user.app_metadata);

  // --- /admin/** → admin role 필요 ---
  if (pathname.startsWith('/admin')) {
    if (!roles.includes('admin')) {
      return redirectNoAccess(request, 'admin-required');
    }
    // admin 경로는 phone_verified 체크 생략 (운영 접근성 우선)
    return response;
  }

  // --- /agent/** → agent role 필요 (admin 도 통과) ---
  if (pathname.startsWith('/agent')) {
    if (!roles.includes('agent') && !roles.includes('admin')) {
      return redirectNoAccess(request, 'agent-required');
    }
    return response;
  }

  // --- /buy/** → 어떤 phone_verified 회원이든 매입 가능 (P2P 모델로 전환됨) ---
  // 이전: agent/admin role 게이트. 현재: phone_verified 만 요구.

  // --- phone_verified 필요 경로 ---
  const needsPhoneVerified =
    pathname.startsWith('/sell') || pathname.startsWith('/buy') || pathname === '/account';

  if (needsPhoneVerified) {
    const { data: profile } = await supabase
      .from('users')
      .select('phone_verified')
      .eq('id', user.id)
      .maybeSingle<{ phone_verified: boolean }>();

    if (!profile?.phone_verified) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = '/verify-phone';
      redirect.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(redirect);
    }
  }

  return response;
}

function redirectNoAccess(request: NextRequest, reason: string): NextResponse {
  const redirect = request.nextUrl.clone();
  redirect.pathname = '/no-access';
  redirect.search = `?reason=${reason}`;
  return NextResponse.redirect(redirect);
}

function isSupabaseAuthError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && ('__isAuthError' in e || 'isAuthError' in e);
}

function extractRoles(appMetadata: unknown): Role[] {
  const meta = (appMetadata ?? {}) as Record<string, unknown>;
  const raw = meta['roles'];
  if (!Array.isArray(raw)) return [];
  const allowed: Role[] = ['seller', 'agent', 'admin'];
  return raw.filter((r): r is Role => typeof r === 'string' && (allowed as string[]).includes(r));
}

export const config = {
  matcher: [
    '/sell/:path*',
    '/buy/:path*',
    '/admin/:path*',
    '/agent/:path*',
    '/account',
    '/verify-phone',
  ],
};

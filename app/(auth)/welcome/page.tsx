import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, ChevronRight } from 'lucide-react';
import { LogoLockup } from '@/components/landing/logo';
import { getCurrentUser } from '@/lib/auth/guards';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';

const NEXT_STEPS = [
  {
    n: 1,
    title: '마일리지 충전',
    sub: '전용계좌 무통장 입금으로 1만원부터 충전할 수 있어요',
    href: '/account/mileage/charge',
  },
  {
    n: 2,
    title: '시세 살펴보기',
    sub: '백화점별 실시간 평균가와 최저가를 한눈에',
    href: '/catalog',
  },
  {
    n: 3,
    title: '첫 매물 구매',
    sub: '검수센터에서 봉인 검수 → 등기 발송까지 평균 12분',
    href: '/catalog',
  },
] as const;

const CONFETTI = [
  { l: '8%', t: '12%', s: 6, c: '#D4A24C' },
  { l: '14%', t: '28%', s: 4, c: '#fff' },
  { l: '18%', t: '62%', s: 8, c: '#3D7BFF' },
  { l: '88%', t: '18%', s: 5, c: '#D4A24C' },
  { l: '92%', t: '52%', s: 7, c: '#fff' },
  { l: '78%', t: '74%', s: 4, c: '#3D7BFF' },
  { l: '6%', t: '78%', s: 5, c: '#D4A24C' },
];

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = sanitizeRedirectPath(typeof next === 'string' ? next : '/');

  const current = await getCurrentUser();
  if (!current) redirect('/login');
  if (!current.profile?.phone_verified) {
    redirect(`/verify-phone?next=${encodeURIComponent(nextPath)}`);
  }

  const name =
    current.profile?.full_name?.trim() ||
    current.profile?.nickname?.trim() ||
    current.profile?.username ||
    '회원';

  const carrier = '본인 명의';

  return (
    <div
      className="relative flex min-h-svh flex-col overflow-hidden text-white"
      style={{
        background: 'linear-gradient(180deg, #0F1620 0%, #11161E 30%, #0E1A1A 100%)',
      }}
    >
      {/* Decorative glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: -200,
          right: -200,
          width: 700,
          height: 700,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(212,162,76,0.18), transparent 65%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          bottom: -240,
          left: -160,
          width: 600,
          height: 600,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(0,102,255,0.16), transparent 70%)',
        }}
      />

      {/* Confetti dots */}
      {CONFETTI.map((d, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            left: d.l,
            top: d.t,
            width: d.s,
            height: d.s,
            background: d.c,
            opacity: 0.7,
          }}
        />
      ))}

      {/* Top brand */}
      <div className="relative z-10 flex w-full justify-center px-8 pt-10 sm:pt-10">
        <LogoLockup symbolSize={32} wordmarkHeight={20} color="#fff" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center gap-9 px-6 py-12">
        {/* Hero */}
        <div className="text-center">
          <div
            className="mx-auto inline-flex size-[92px] items-center justify-center rounded-full text-[42px] font-extrabold"
            style={{
              background: 'linear-gradient(135deg, #D4A24C 0%, #B8853A 100%)',
              color: '#0F1620',
              boxShadow: '0 0 0 8px rgba(212,162,76,0.18), 0 24px 60px rgba(212,162,76,0.35)',
            }}
          >
            <Check className="size-12" strokeWidth={3} />
          </div>
          <div
            className="mt-7 text-[14px] font-bold tracking-[0.16em]"
            style={{ color: '#D4A24C' }}
          >
            WELCOME TO TICKETA
          </div>
          <h1 className="mt-3.5 text-[32px] leading-[1.2] font-extrabold tracking-[-0.028em] sm:text-[44px]">
            가입을 환영해요, <span style={{ color: '#D4A24C' }}>{name}</span>님
          </h1>
          <p
            className="mx-auto mt-3.5 max-w-[560px] text-[15px] leading-[1.65] sm:text-lg"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            본인인증까지 모두 완료됐어요. 이제 백화점 상품권을 안전하게 사고팔 수 있습니다.
          </p>
        </div>

        {/* Next-step card */}
        <div
          className="w-full rounded-2xl px-5 py-2 backdrop-blur-md sm:px-7"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <div
            className="px-0 pt-5 text-[14px] font-bold tracking-[0.1em]"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            NEXT · 첫 거래까지 3단계
          </div>

          {/* Done step */}
          <div
            className="flex items-start gap-4 py-[18px]"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold"
              style={{ background: '#D4A24C', color: '#0F1620' }}
            >
              <Check className="size-[18px]" strokeWidth={3} />
            </div>
            <div className="flex-1">
              <div
                className="text-[16px] font-bold tracking-[-0.012em] line-through"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                회원가입 · 본인인증
              </div>
              <div className="mt-0.5 text-[14px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {carrier}
              </div>
            </div>
          </div>

          {/* Pending steps */}
          {NEXT_STEPS.map((s, i, arr) => (
            <Link
              key={s.n}
              href={s.href}
              className="flex items-start gap-4 py-[18px] transition-opacity hover:opacity-80"
              style={{
                borderBottom: i === arr.length - 1 ? '0' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                {s.n}
              </div>
              <div className="flex-1">
                <div className="text-[16px] font-bold tracking-[-0.012em] text-white">
                  {s.title}
                </div>
                <div className="mt-0.5 text-[14px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {s.sub}
                </div>
              </div>
              <ChevronRight
                className="mt-2 size-5 shrink-0"
                strokeWidth={1.75}
                style={{ color: 'rgba(255,255,255,0.35)' }}
              />
            </Link>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:gap-3">
            <Link
              href={nextPath}
              className="flex h-[56px] flex-1 cursor-pointer items-center justify-center rounded-[12px] px-9 text-[16px] font-extrabold tracking-[-0.012em] transition-transform active:translate-y-px sm:flex-none"
              style={{
                background: 'linear-gradient(135deg, #D4A24C 0%, #B8853A 100%)',
                color: '#0F1620',
                boxShadow: '0 12px 32px rgba(212,162,76,0.32)',
              }}
            >
              홈으로 가기 →
            </Link>
            <Link
              href="/account/mileage/charge"
              className="flex h-[56px] flex-1 cursor-pointer items-center justify-center rounded-[12px] px-7 text-[15px] font-bold tracking-[-0.01em] transition-colors hover:bg-white/[0.08] sm:flex-none"
              style={{
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
              }}
            >
              마일리지 먼저 충전
            </Link>
          </div>

          <p className="text-center text-[14px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            가입 보너스 마일리지나 첫 거래 수수료 할인은{' '}
            <span style={{ color: '#D4A24C', fontWeight: 700 }}>준비 중</span>
            이에요
          </p>
        </div>
      </div>
    </div>
  );
}

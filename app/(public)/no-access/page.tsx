import Link from 'next/link';
import { headers } from 'next/headers';

type NoAccessKind = 'agent-required' | 'admin-required' | 'verify-required' | 'default';

interface NoAccessMeta {
  code: string;
  kicker: string;
  title: string;
  sub: string;
  bg: string;
  glyph: string;
  accent: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  infoBox?: string;
}

const META: Record<NoAccessKind, NoAccessMeta> = {
  'verify-required': {
    code: '403',
    kicker: 'NO ACCESS',
    title: '접근 권한이 없어요',
    sub: '이 페이지는 본인인증을 완료한 회원만 이용할 수 있어요. 본인인증 후 다시 시도해주세요.',
    bg: 'linear-gradient(140deg, #11161E 0%, #1F2540 100%)',
    glyph: '403',
    accent: '#A8C0FF',
    primaryCta: { label: '본인인증 하러가기', href: '/verify-phone' },
    secondaryCta: { label: '홈으로', href: '/' },
    infoBox: '본인인증을 마치면 일일 한도 500만원, 월 한도 3,000만원으로 즉시 거래가 시작돼요.',
  },
  'agent-required': {
    code: '403',
    kicker: 'NO ACCESS',
    title: '구매자 권한이 필요합니다',
    sub: '이 페이지는 에이전트(구매자) 권한이 있는 사용자만 접근할 수 있어요. 구매자 신청은 어드민에 문의해주세요.',
    bg: 'linear-gradient(140deg, #11161E 0%, #1F2540 100%)',
    glyph: '403',
    accent: '#A8C0FF',
    primaryCta: { label: '홈으로', href: '/' },
  },
  'admin-required': {
    code: '403',
    kicker: 'NO ACCESS',
    title: '관리자 권한이 필요합니다',
    sub: '이 페이지는 관리자만 접근할 수 있어요.',
    bg: 'linear-gradient(140deg, #11161E 0%, #1F2540 100%)',
    glyph: '403',
    accent: '#A8C0FF',
    primaryCta: { label: '홈으로', href: '/' },
  },
  default: {
    code: '403',
    kicker: 'NO ACCESS',
    title: '접근 권한이 없어요',
    sub: '이 페이지는 본인인증을 완료한 회원만 이용할 수 있어요. 본인인증 후 다시 시도해주세요.',
    bg: 'linear-gradient(140deg, #11161E 0%, #1F2540 100%)',
    glyph: '403',
    accent: '#A8C0FF',
    primaryCta: { label: '본인인증 하러가기', href: '/verify-phone' },
    secondaryCta: { label: '홈으로', href: '/' },
    infoBox: '본인인증을 마치면 일일 한도 500만원, 월 한도 3,000만원으로 즉시 거래가 시작돼요.',
  },
};

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  // suppress unused warning — headers() used for cache opt-out
  await headers();

  const kind: NoAccessKind =
    reason === 'agent-required' || reason === 'admin-required' || reason === 'verify-required'
      ? reason
      : 'default';
  const M = META[kind];

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col">
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        {/* Desktop: side-by-side */}
        <div className="hidden w-full max-w-[980px] items-center gap-14 md:grid md:grid-cols-[420px_1fr]">
          {/* Glyph card */}
          <GlyphCard M={M} />
          {/* Body */}
          <ErrorBody M={M} />
        </div>

        {/* Mobile: stacked */}
        <div className="flex w-full max-w-sm flex-col gap-4 md:hidden">
          <MobileGlyphCard M={M} />
          <Link
            href={M.primaryCta.href}
            className="bg-ticketa-blue-500 flex h-[52px] items-center justify-center rounded-xl text-[14px] font-extrabold text-white"
          >
            {M.primaryCta.label}
          </Link>
          {M.secondaryCta && (
            <Link
              href={M.secondaryCta.href}
              className="border-border text-foreground flex h-[44px] items-center justify-center rounded-xl border bg-white text-[14px] font-bold"
            >
              {M.secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function GlyphCard({ M }: { M: NoAccessMeta }) {
  return (
    <div
      className="relative flex h-[380px] flex-col justify-between overflow-hidden rounded-3xl p-10 text-white"
      style={{ background: M.bg }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          right: -80,
          top: -80,
          width: 280,
          height: 280,
          borderRadius: 999,
          background: `radial-gradient(circle, ${M.accent}33, transparent 65%)`,
        }}
      />
      <div className="text-[14px] font-extrabold tracking-[0.16em]" style={{ color: M.accent }}>
        {M.kicker}
      </div>
      <div
        className="font-mono text-[220px] leading-[0.9] font-black tracking-[-0.06em]"
        style={{ color: 'transparent', WebkitTextStroke: `1.5px ${M.accent}` }}
      >
        {M.glyph}
      </div>
      <div className="font-mono text-[14px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
        req-id: tx-2026-04829-a3f1
      </div>
    </div>
  );
}

function MobileGlyphCard({ M }: { M: NoAccessMeta }) {
  return (
    <div
      className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[18px] p-6 text-white"
      style={{ background: M.bg, minHeight: 260 }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          right: -50,
          top: -50,
          width: 180,
          height: 180,
          borderRadius: 999,
          background: `radial-gradient(circle, ${M.accent}33, transparent 65%)`,
        }}
      />
      <div className="text-[14px] font-extrabold tracking-[0.16em]" style={{ color: M.accent }}>
        {M.kicker}
      </div>
      <div
        className="text-center font-mono text-[140px] leading-[0.9] font-black"
        style={{ color: 'transparent', WebkitTextStroke: `1.5px ${M.accent}` }}
      >
        {M.code}
      </div>
      <div>
        <div className="text-[22px] leading-[1.25] font-extrabold tracking-[-0.018em]">
          {M.title}
        </div>
        <div
          className="mt-2 text-[15px] leading-[1.65]"
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          {M.sub}
        </div>
      </div>
    </div>
  );
}

function ErrorBody({ M }: { M: NoAccessMeta }) {
  return (
    <div>
      <div className="text-muted-foreground text-[15px] font-bold tracking-[0.1em]">
        HTTP {M.code}
      </div>
      <h1 className="mt-2 text-[36px] leading-[1.18] font-extrabold tracking-[-0.022em]">
        {M.title}
      </h1>
      <p className="text-muted-foreground mt-3.5 text-base leading-[1.7]">{M.sub}</p>
      <div className="mt-7 flex gap-2.5">
        <Link
          href={M.primaryCta.href}
          className="bg-ticketa-blue-500 flex h-12 items-center rounded-[10px] px-[22px] text-[15px] font-extrabold text-white"
        >
          {M.primaryCta.label}
        </Link>
        {M.secondaryCta && (
          <Link
            href={M.secondaryCta.href}
            className="border-border text-foreground flex h-12 items-center rounded-[10px] border bg-white px-[22px] text-[15px] font-extrabold"
          >
            {M.secondaryCta.label}
          </Link>
        )}
      </div>
      {M.infoBox && (
        <div
          className="mt-5 rounded-[10px] px-4 py-3.5 text-[15px] font-semibold"
          style={{
            background: 'rgba(212,162,76,0.10)',
            color: 'var(--ticketa-gold-700)',
          }}
        >
          {M.infoBox}
        </div>
      )}
    </div>
  );
}

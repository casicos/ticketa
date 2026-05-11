import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoLockup } from '@/components/landing/logo';
import { getCurrentUser } from '@/lib/auth/guards';
import { VerifyPhoneForm } from './verify-phone-form';

export default async function VerifyPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = typeof next === 'string' && next.startsWith('/') ? next : '/';

  const current = await getCurrentUser();
  if (!current) {
    redirect(`/login?next=${encodeURIComponent('/verify-phone')}`);
  }
  if (current.profile?.phone_verified) {
    redirect(nextPath);
  }

  const phone = current.profile?.phone ?? '';
  const fullName = current.profile?.full_name ?? '';
  const devMode = process.env.ENABLE_DEV_OTP === 'true';

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel — hidden on mobile */}
      <div
        className="relative hidden flex-col overflow-hidden p-14 text-white lg:flex lg:w-[54%]"
        style={{
          background: 'linear-gradient(140deg, #11161E 0%, #1A2230 60%, #142823 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute"
          style={{
            right: -120,
            top: -100,
            width: 460,
            height: 460,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            left: -80,
            bottom: -120,
            width: 360,
            height: 360,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(0,102,255,0.18), transparent 70%)',
          }}
        />

        <LogoLockup symbolSize={32} wordmarkHeight={20} color="#fff" />

        <div className="mt-auto max-w-[460px]">
          <div className="text-[13px] font-bold tracking-[0.12em]" style={{ color: '#E5C387' }}>
            SAFE EXCHANGE
          </div>
          <h1 className="mt-3 text-[38px] leading-[1.18] font-extrabold tracking-[-0.025em]">
            본인인증 한 번이면
            <br />
            다음부턴 묻지 않아요
          </h1>
          <p className="mt-3.5 text-base leading-[1.7]" style={{ color: 'rgba(255,255,255,0.66)' }}>
            중고 상품권 거래는 명의 도용·차명 거래 위험이 높아요. 통신사 본인인증을 거친 회원만
            안전하게 거래·출금할 수 있어요.
          </p>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="border-border flex flex-1 flex-col border-l bg-white px-6 py-8 sm:px-14 sm:py-12">
        {/* Mobile logo */}
        <div className="mb-6 lg:hidden">
          <Link href="/" aria-label="Ticketa 홈">
            <LogoLockup symbolSize={28} wordmarkHeight={17} />
          </Link>
        </div>

        <div className="w-full lg:mx-auto lg:max-w-[420px]">
          <div className="text-ticketa-blue-700 text-[13px] font-bold tracking-[0.12em]">
            SIGN UP · 2/2
          </div>
          <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.022em]">
            본인인증을 진행할게요
          </h2>
          <p className="text-muted-foreground mt-2 text-[15px]">
            통신사 등록 명의로만 인증 가능해요
          </p>

          {/* Step indicator */}
          <div className="mt-6 mb-7 flex items-center gap-2 text-[13px] font-bold tracking-[0.02em]">
            <div className="text-ticketa-blue-700 flex items-center gap-1.5">
              <span className="bg-ticketa-blue-500 inline-flex size-[22px] items-center justify-center rounded-full text-[13px] font-extrabold text-white">
                ✓
              </span>
              <span className="hidden sm:inline">가입 정보</span>
            </div>
            <div className="bg-ticketa-blue-500 h-0.5 flex-1" />
            <div className="text-ticketa-blue-700 flex items-center gap-1.5">
              <span className="bg-ticketa-blue-500 inline-flex size-[22px] items-center justify-center rounded-full text-[13px] font-extrabold text-white">
                2
              </span>
              <span className="hidden sm:inline">본인인증</span>
            </div>
            <div className="bg-muted h-0.5 flex-1" />
            <div className="text-muted-foreground flex items-center gap-1.5">
              <span className="bg-muted inline-flex size-[22px] items-center justify-center rounded-full text-[13px] font-extrabold">
                3
              </span>
              <span className="hidden sm:inline">완료</span>
            </div>
          </div>

          <VerifyPhoneForm
            phone={phone}
            initialFullName={fullName}
            nextPath={nextPath}
            devMode={devMode}
          />
        </div>
      </div>
    </div>
  );
}

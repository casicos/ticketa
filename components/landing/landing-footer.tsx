'use client';

import { toast } from 'sonner';
import { LogoLockup } from './logo';

/**
 * 랜딩 풋터 — 회사 정보 / 고객센터 / 약관 링크.
 * 데스크톱은 3-column rich 레이아웃, 모바일은 스택형 카드.
 *
 * disabled 플래그가 있는 링크는 클릭 시 "준비중" 토스트만 띄움.
 * 실제 페이지·기능 추가 시 disabled 제거하고 href 연결. (TODO — docs/launch-checklist.md 참조)
 */

type FooterLink = {
  label: string;
  href: string;
  strong?: boolean;
  disabled?: boolean;
};

const FOOTER_LINKS: FooterLink[] = [
  { label: '회사소개', href: '#', disabled: true },
  { label: '이용약관', href: '/legal/terms' },
  { label: '개인정보 처리방침', href: '/legal/privacy', strong: true },
  { label: '청소년 보호정책', href: '#', disabled: true },
  { label: '이메일 무단수집 거부', href: '#', disabled: true },
  { label: '에이전트 입점 문의', href: '#', disabled: true },
  { label: '제휴 문의', href: '#', disabled: true },
  { label: '고객센터', href: '#', disabled: true },
];

function notifyComingSoon() {
  toast('준비중이에요', { description: '곧 만나요!' });
}

const COMPANY_INFO = {
  legalName: '(주)명길',
  ceo: '김광식',
  bizNumber: '577-88-03280',
  founded: '2025.02.06',
  ecommerceFiling: '제2026-서울성동-0024호',
  category: '상품권판매업·전자상거래 소매업',
  address: '서울특별시 성동구 아차산로7길 15-1, 3층 3119호',
  addressDetail: '(성수동2가, 제이제이빌딩)',
  customerPhone: '1588 – 0000',
  customerEmail: 'help@ticketa.kr',
  customerHours: '평일 09:00–18:00 · 주말·공휴일 휴무',
  customerChat: '채팅 상담 24시간 · 평균 응답 4분',
};

export function DesktopLandingFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`text-warm-700 text-[14px] ${className}`}
      style={{ background: 'var(--warm-50)', borderTop: '1px solid var(--border)' }}
    >
      {/* Top link bar — centered */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="mx-auto flex flex-wrap items-center justify-center px-8 py-4"
          style={{ maxWidth: 1216 }}
        >
          {FOOTER_LINKS.map((it, i) => {
            const cls = `text-[14px] tracking-tight cursor-pointer ${
              it.strong ? 'font-bold text-warm-900' : 'font-medium text-warm-700'
            }`;
            return (
              <span key={it.label} className="flex items-center">
                {it.disabled ? (
                  <button type="button" onClick={notifyComingSoon} className={cls}>
                    {it.label}
                  </button>
                ) : (
                  <a href={it.href} className={cls}>
                    {it.label}
                  </a>
                )}
                {i < FOOTER_LINKS.length - 1 && (
                  <span
                    aria-hidden
                    className="mx-[18px]"
                    style={{ width: 1, height: 11, background: 'var(--warm-300)' }}
                  />
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Body — 3 columns */}
      <div
        className="mx-auto grid items-start gap-10 px-8 pt-9 pb-7"
        style={{ maxWidth: 1216, gridTemplateColumns: '220px 1fr 260px' }}
      >
        {/* Brand + trust badges */}
        <div className="flex flex-col gap-4">
          <LogoLockup symbolSize={26} wordmarkHeight={16} />
          <div className="text-warm-600 text-[14px] leading-[1.55] tracking-[-0.005em]">
            검수한 상품권만 거래되는
            <br />
            안전한 마켓플레이스
          </div>
          <div className="flex flex-col gap-2">
            <TrustBadge
              icon="i"
              iconBg="var(--ticketa-blue-500)"
              iconShape="rounded"
              title="ISMS"
              sub="정보보호 관리체계 인증"
            />
            <TrustBadge
              icon="₩"
              iconBg="var(--ticketa-gold-500)"
              iconShape="circle"
              title="에스크로"
              sub="안전결제 제공"
            />
          </div>
        </div>

        {/* Business info */}
        <div>
          <div className="text-warm-500 mb-3 text-xs font-bold tracking-[0.08em]">
            BUSINESS INFO
          </div>
          <div
            className="text-warm-700 grid gap-y-3 text-[14px]"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 48 }}
          >
            <CompanyKV k="법인명" v={COMPANY_INFO.legalName} />
            <CompanyKV k="대표자" v={COMPANY_INFO.ceo} />
            <CompanyKV
              k="사업자등록번호"
              v={
                <span className="text-warm-800 font-mono font-semibold">
                  {COMPANY_INFO.bizNumber}
                </span>
              }
            />
            <CompanyKV k="개업" v={COMPANY_INFO.founded} />
            <CompanyKV
              k="통신판매업신고"
              v={
                <span className="text-warm-800 font-mono font-semibold whitespace-nowrap">
                  {COMPANY_INFO.ecommerceFiling}
                </span>
              }
            />
            <CompanyKV k="업태·종목" v={COMPANY_INFO.category} />
          </div>
          <div className="border-border text-warm-700 mt-3.5 flex gap-3 border-t border-dashed pt-3.5 text-[14px]">
            <span className="text-warm-500 w-24 shrink-0">사업장 소재지</span>
            <span className="leading-[1.55]">
              {COMPANY_INFO.address}
              <br />
              <span className="text-warm-500">{COMPANY_INFO.addressDetail}</span>
            </span>
          </div>
        </div>

        {/* Customer center */}
        <div>
          <div className="text-warm-500 mb-3 text-xs font-bold tracking-[0.08em]">
            CUSTOMER CENTER
          </div>
          <div className="text-warm-900 font-mono text-[28px] leading-[1.1] font-semibold tracking-tight">
            {COMPANY_INFO.customerPhone}
          </div>
          <div className="text-warm-600 mt-2 text-[14px] leading-[1.6]">
            {COMPANY_INFO.customerHours}
            <br />
            {COMPANY_INFO.customerChat}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={notifyComingSoon}
              className="bg-ticketa-blue-500 hover:bg-ticketa-blue-600 flex h-10 cursor-pointer items-center justify-between rounded-md px-3.5 text-[14px] font-bold text-white"
            >
              <span>1:1 채팅 상담</span>
              <span aria-hidden className="opacity-85">
                →
              </span>
            </button>
            <a
              href={`mailto:${COMPANY_INFO.customerEmail}`}
              className="border-border text-warm-800 flex h-10 items-center justify-between rounded-md border bg-white px-3.5 text-[14px] font-semibold"
            >
              <span className="font-mono">{COMPANY_INFO.customerEmail}</span>
              <span aria-hidden className="text-muted-foreground">
                →
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mx-auto px-8 pb-7" style={{ maxWidth: 1216 }}>
        <div className="border-border text-warm-500 rounded-md border bg-white px-4 py-3 text-xs leading-[1.65]">
          <strong className="text-warm-700 font-bold">{COMPANY_INFO.legalName}</strong>은
          통신판매중개자로서 통신판매의 당사자가 아니며, 회원 간 거래에 대한 책임은 거래 당사자에게
          있습니다. 검수를 통과한 상품권에 한해 에스크로(안전결제)가 제공됩니다.
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-warm-500 mx-auto px-8 py-4 text-xs" style={{ maxWidth: 1216 }}>
          <span>
            Copyright © 2026 <strong className="text-warm-700">{COMPANY_INFO.legalName}</strong>.
            All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}

function TrustBadge({
  icon,
  iconBg,
  iconShape,
  title,
  sub,
}: {
  icon: string;
  iconBg: string;
  iconShape: 'rounded' | 'circle';
  title: string;
  sub: string;
}) {
  return (
    <span className="border-border text-warm-700 inline-flex w-fit items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-semibold">
      <span
        className={`grid place-items-center text-[12px] font-extrabold text-white ${
          iconShape === 'circle' ? 'rounded-full' : 'rounded-[4px]'
        }`}
        style={{ width: 18, height: 18, background: iconBg }}
      >
        {icon}
      </span>
      <span className="text-warm-900 font-bold">{title}</span>
      <span className="text-warm-500">{sub}</span>
    </span>
  );
}

function CompanyKV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <span className="flex items-baseline gap-2.5">
      <span className="text-warm-500 min-w-24">{k}</span>
      <span className="text-warm-800">{v}</span>
    </span>
  );
}

// ─────────────────────────────────────────────
// Mobile footer
// ─────────────────────────────────────────────

const MOBILE_FOOTER_LINKS: FooterLink[] = [
  { label: '회사소개', href: '#', disabled: true },
  { label: '이용약관', href: '/legal/terms' },
  { label: '개인정보 처리방침', href: '/legal/privacy', strong: true },
  { label: '청소년 보호정책', href: '#', disabled: true },
  { label: '고객센터', href: '#', disabled: true },
  { label: '제휴 문의', href: '#', disabled: true },
];

export function MobileLandingFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`text-warm-700 mt-4 px-4 pt-4 pb-5 ${className}`}
      style={{ background: 'var(--warm-50)', borderTop: '1px solid var(--border)' }}
    >
      {/* Link rows */}
      <div className="flex flex-wrap items-center text-[14px]">
        {MOBILE_FOOTER_LINKS.map((it, i) => {
          const cls = it.strong ? 'font-bold text-warm-900' : 'font-medium text-warm-700';
          return (
            <span key={it.label} className="flex items-center">
              {it.disabled ? (
                <button type="button" onClick={notifyComingSoon} className={cls}>
                  {it.label}
                </button>
              ) : (
                <a href={it.href} className={cls}>
                  {it.label}
                </a>
              )}
              {i < MOBILE_FOOTER_LINKS.length - 1 && (
                <span
                  aria-hidden
                  className="mx-2.5"
                  style={{ width: 1, height: 10, background: 'var(--warm-300)' }}
                />
              )}
            </span>
          );
        })}
      </div>

      {/* Customer center card */}
      <div className="border-border mt-3.5 flex items-center justify-between rounded-[10px] border bg-white px-3.5 py-3">
        <div>
          <div className="text-warm-500 text-[12px] font-bold tracking-[0.08em]">CUSTOMER</div>
          <div className="text-warm-900 font-mono text-xl font-semibold tracking-tight">
            {COMPANY_INFO.customerPhone}
          </div>
          <div className="text-warm-500 text-xs">평일 09:00–18:00 · 채팅 24h</div>
        </div>
        <button
          type="button"
          onClick={notifyComingSoon}
          className="bg-ticketa-blue-500 hover:bg-ticketa-blue-600 h-9 cursor-pointer rounded-md px-3 text-[14px] font-bold text-white"
        >
          채팅 상담
        </button>
      </div>

      {/* Company info */}
      <div className="border-border mt-3.5 rounded-[10px] border bg-white px-3.5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-warm-900 text-[14px] font-bold">
            {COMPANY_INFO.legalName} 사업자정보
          </span>
          <span aria-hidden className="text-muted-foreground text-xs">
            ▾
          </span>
        </div>
        <div className="text-warm-600 mt-2 text-xs leading-[1.7]">
          <div>
            <span className="text-warm-500">대표 </span>
            {COMPANY_INFO.ceo} · <span className="text-warm-500">개업 </span>
            {COMPANY_INFO.founded}
          </div>
          <div>
            <span className="text-warm-500">사업자등록번호 </span>
            <span className="text-warm-800 font-mono">{COMPANY_INFO.bizNumber}</span>
          </div>
          <div>
            <span className="text-warm-500">통신판매업신고 </span>
            <span className="text-warm-800 font-mono">{COMPANY_INFO.ecommerceFiling}</span>
          </div>
          <div>
            <span className="text-warm-500">업태·종목 </span>
            {COMPANY_INFO.category}
          </div>
          <div className="mt-1">
            <span className="text-warm-500">주소 </span>
            {COMPANY_INFO.address} {COMPANY_INFO.addressDetail}
          </div>
        </div>
      </div>

      <div className="text-warm-500 mt-3.5 text-[12px] leading-[1.6]">
        {COMPANY_INFO.legalName}은 통신판매중개자로서 통신판매의 당사자가 아니며, 회원 간 거래에
        대한 책임은 거래 당사자에게 있습니다.
      </div>

      <div className="text-warm-500 mt-2.5 flex items-center justify-between text-[12px]">
        <span>© 2026 {COMPANY_INFO.legalName}</span>
        <span className="inline-flex items-center gap-2">
          <span className="border-border text-ticketa-blue-700 rounded-full border bg-white px-2 py-0.5 font-bold">
            ISMS
          </span>
          <span className="border-border text-warm-700 rounded-full border bg-white px-2 py-0.5 font-bold">
            에스크로
          </span>
        </span>
      </div>
    </footer>
  );
}

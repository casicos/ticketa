import { DeptMark, type Department } from '@/components/ticketa/dept-mark';

// TODO: backend wiring — needs gifts table with columns:
//   id uuid, sender_id uuid, recipient_id uuid, sku_id uuid,
//   message text, face_value int, status (unclaimed|claimed|expired|refunded),
//   expires_at timestamptz, created_at timestamptz
// TODO: backend wiring — needs claim_gift RPC (physical card dispatch path)
// TODO: backend wiring — needs convert_gift_to_mileage RPC
// All data below is static stub placeholder.

export type GiftClaimStub = {
  giftCode: string;
  senderName: string;
  recipientName: string;
  dept: Department;
  skuLabel: string;
  faceValue: number;
  expiresAt: string;
  remainingBalance: number;
  message: string;
  sentAt: string;
  senderTxCount: number;
  senderRating: number;
  currentMileage: number;
  expiresInLabel: string;
};

const STUB: GiftClaimStub = {
  giftCode: 'GFT-2026-00821',
  senderName: '박서연',
  recipientName: '지민',
  dept: 'hyundai',
  skuLabel: '현대백화점 30만원권',
  faceValue: 300000,
  expiresAt: '2027.11.06',
  remainingBalance: 300000,
  message: '지민아 생일 진심으로 축하해 🎂\n올해는 백화점에서 마음껏 쇼핑하길!\n— 서연 언니가',
  sentAt: '2026.11.05 18:22',
  senderTxCount: 162,
  senderRating: 4.94,
  currentMileage: 847300,
  expiresInLabel: '4일 13시간',
};

export function DesktopGiftClaim({ className }: { className?: string }) {
  const g = STUB;

  return (
    <div className={`mx-auto w-full max-w-3xl px-6 py-8 ${className ?? ''}`}>
      {/* Breadcrumb — internal code shown only here as auxiliary info per policy */}
      <div className="text-muted-foreground mb-4 text-sm">
        <span>마이룸</span>
        <span className="mx-1">›</span>
        <span>선물함</span>
        <span className="mx-1">›</span>
        <b className="text-foreground font-mono">{g.giftCode}</b>
      </div>

      {/* Gift hero */}
      <div
        className="relative mb-4 overflow-hidden rounded-2xl border"
        style={{
          background: 'linear-gradient(140deg, #FFF6E2 0%, #FFE9C0 45%, #FAD08A 100%)',
          borderColor: 'rgba(212,162,76,0.35)',
          boxShadow: '0 24px 60px -20px rgba(212,162,76,0.40), 0 4px 12px rgba(212,162,76,0.18)',
        }}
      >
        {/* Decorative orbs */}
        <div
          className="pointer-events-none absolute -top-20 -left-20 size-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 65%)' }}
        />
        <div
          className="pointer-events-none absolute -right-16 -bottom-24 size-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,162,76,0.30), transparent 65%)' }}
        />

        <div className="relative px-10 pt-9 pb-7">
          {/* Ribbon tag */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#11161E] px-3 py-1.5 text-xs font-extrabold tracking-widest text-[#FAD08A]">
            🎁 GIFT FROM TICKETA
          </div>

          <p className="text-warm-700 mt-5 text-lg font-bold tracking-tight">{g.senderName}님이</p>
          <h1 className="mt-1 text-4xl leading-tight font-black tracking-tight text-[#3F2A0A]">
            {g.skuLabel}을<br />
            선물로 보냈어요
          </h1>

          {/* Voucher card */}
          <div
            className="mt-6 flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm"
            style={{ borderColor: 'rgba(212,162,76,0.30)' }}
          >
            <DeptMark dept={g.dept} size={64} />
            <div className="min-w-0 flex-1">
              <div className="text-ticketa-gold-700 text-xs font-extrabold tracking-widest uppercase">
                HYUNDAI · 모바일상품권
              </div>
              <div className="mt-1 text-xl font-black tracking-tight">{g.skuLabel}</div>
              <div className="text-muted-foreground mt-1 text-sm">
                유효기간 {g.expiresAt} · 잔액 {g.remainingBalance.toLocaleString('ko-KR')}원 전액
                미사용
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                액면가
              </div>
              <div className="text-3xl font-black tracking-tight tabular-nums">
                {g.faceValue.toLocaleString('ko-KR')}
                <span className="text-muted-foreground ml-1 text-base font-bold">원</span>
              </div>
            </div>
          </div>

          {/* Sender message */}
          <div
            className="mt-4 rounded-xl border p-5"
            style={{
              background: 'rgba(255,255,255,0.55)',
              borderColor: 'rgba(212,162,76,0.40)',
              borderStyle: 'dashed',
            }}
          >
            <div className="text-ticketa-gold-700 mb-2 text-xs font-extrabold tracking-widest uppercase">
              FROM {g.senderName}
            </div>
            <p className="text-base leading-relaxed font-semibold whitespace-pre-line text-[#3F2A0A]">
              {g.message}
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-5 flex gap-2.5">
            <button
              className="h-14 flex-[2] rounded-xl text-base font-extrabold tracking-tight text-white"
              style={{
                background: 'linear-gradient(135deg, #11161E, #1A2230)',
                boxShadow: '0 8px 20px rgba(17,22,30,0.30)',
                border: 0,
              }}
            >
              {/* TODO: wire to claim_gift RPC → dispatch physical card */}
              수령하기 →
            </button>
            <button
              className="h-14 flex-1 rounded-xl text-sm font-bold text-[#11161E]"
              style={{
                border: '1.5px solid rgba(17,22,30,0.20)',
                background: 'rgba(255,255,255,0.6)',
              }}
            >
              {/* TODO: wire to convert_gift_to_mileage RPC */}
              마일리지로 보관 ({g.faceValue.toLocaleString('ko-KR')}M)
            </button>
          </div>
          <p className="text-muted-foreground mt-2.5 text-center text-sm">
            받기 만료까지 <b className="text-destructive">{g.expiresInLabel}</b> 남았어요 · 만료 시
            자동으로 발신자에게 환불돼요
          </p>
        </div>
      </div>

      {/* Claim options */}
      <div className="mb-4 grid grid-cols-2 gap-3.5">
        <div className="rounded-xl border bg-white p-5">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="inline-flex size-9 items-center justify-center rounded-xl text-xl"
              style={{ background: 'rgba(212,162,76,0.16)', color: 'var(--ticketa-gold-700)' }}
            >
              🎫
            </span>
            <span className="text-sm font-extrabold tracking-tight">실물 카드로 받기</span>
            <span className="bg-ticketa-gold-100 text-ticketa-gold-700 inline-flex items-center rounded-sm px-1.5 py-0.5 text-[12px] font-bold">
              추천
            </span>
          </div>
          <p className="text-warm-700 mt-1.5 text-sm leading-relaxed">
            현대백화점 상품권 실물을 등기로 받습니다. 영업일 +1 출고 · 운송장은 마이페이지에서 확인.
          </p>
          <ul className="text-muted-foreground mt-2.5 list-disc pl-4 text-sm leading-loose">
            <li>유효기간 {g.expiresAt}까지</li>
            <li>받은 후 24시간 내 잔액 확인 권장</li>
            <li>한번 받으면 마일리지 전환 불가</li>
          </ul>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="text-ticketa-blue-700 inline-flex size-9 items-center justify-center rounded-xl text-xl"
              style={{ background: 'var(--ticketa-blue-50)' }}
            >
              ₩
            </span>
            <span className="text-sm font-extrabold tracking-tight">마일리지로 보관</span>
          </div>
          <p className="text-warm-700 mt-1.5 text-sm leading-relaxed">
            {g.faceValue.toLocaleString('ko-KR')}M로 마일리지 잔액에 즉시 입금돼요. 다른 백화점
            상품권 구매·출금에도 쓸 수 있어요.
          </p>
          <ul className="text-muted-foreground mt-2.5 list-disc pl-4 text-sm leading-loose">
            <li>1M = 1원, 출금 가능</li>
            <li>전환 후 실물 카드 발급 불가</li>
            <li>
              현재 잔액 {g.currentMileage.toLocaleString('ko-KR')}M →{' '}
              {(g.currentMileage + g.faceValue).toLocaleString('ko-KR')}M
            </li>
          </ul>
        </div>
      </div>

      {/* Sender info */}
      <div className="mb-3.5 rounded-xl border bg-white p-5">
        <div className="text-muted-foreground mb-3 text-xs font-extrabold tracking-widest uppercase">
          보낸 사람 정보
        </div>
        <div className="flex items-center gap-3.5">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-black text-[#11161E]"
            style={{ background: 'linear-gradient(135deg, #FCE9C8, #D4A24C)' }}
          >
            {g.senderName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-extrabold">
              {g.senderName}
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold"
                style={{ background: 'rgba(46,124,82,0.10)', color: '#1F6B43' }}
              >
                본인인증 완료
              </span>
            </div>
            <div className="text-muted-foreground mt-0.5 text-sm">
              {g.sentAt} 발송 · 거래 {g.senderTxCount}건 · 평점 {g.senderRating}
            </div>
          </div>
          <button className="h-9 rounded-lg border bg-white px-3.5 text-sm font-bold">
            감사 인사 보내기
          </button>
        </div>
      </div>

      {/* Safety notice */}
      <div
        className="text-ticketa-blue-700 flex items-start gap-2.5 rounded-xl px-4 py-3.5 text-sm leading-relaxed font-semibold"
        style={{ background: 'rgba(0,102,255,0.06)' }}
      >
        <span className="mt-0.5 text-lg">🛡</span>
        <span>
          티켓타 검수센터에서 카드의 잔액과 유효성을 확인했어요. 안심하고 받으셔도 됩니다.
        </span>
      </div>
    </div>
  );
}

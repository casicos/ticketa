import { DeptMark } from '@/components/ticketa/dept-mark';

// TODO: backend wiring — needs agent_inbound_requests table:
//   id uuid, agent_id uuid, sku_id uuid, quantity int,
//   suggested_price int, storage_type (vault|agent), expiry_date date,
//   notes text, status (pending|approved|rejected|in_transit|received),
//   created_at timestamptz, reviewed_at timestamptz, reviewed_by uuid
// TODO: backend wiring — needs submit_inbound_request RPC
// TODO: backend wiring — needs admin approval workflow (/admin/intake/inbound)
// All data below is static stub placeholder.

const RECENT_REQUESTS = [
  { label: '신세계 10만 · 800매', date: '11.05', statusLabel: '검수 통과', tone: 'ok' as const },
  { label: '롯데 5만 · 500매', date: '10.28', statusLabel: '운송 중', tone: 'wait' as const },
  {
    label: '현대 20만 · 200매',
    date: '10.20',
    statusLabel: '거부 (유효기간 부족)',
    tone: 'fail' as const,
  },
] as const;

const TONE_DOT: Record<'ok' | 'wait' | 'fail', string> = {
  ok: 'bg-success',
  wait: 'bg-ticketa-gold-700',
  fail: 'bg-destructive',
};

const STEPS = ['SKU 정보', '수량·가격', '인증·서류', '배송·검수'] as const;

// Step index currently shown (1 = "수량·가격")
const CURRENT_STEP = 1;

export function DesktopAgentInbound({ className }: { className?: string }) {
  return (
    <div className={`w-full ${className ?? ''}`}>
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">위탁 입고 신청</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            신규 SKU를 운영자 검수센터(Vault-A)로 보내고 위탁 판매를 시작합니다
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="h-9 rounded-lg border bg-white px-3.5 text-sm font-bold">
            임시저장
          </button>
          <button
            className="h-9 rounded-lg px-3.5 text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)', border: 0 }}
          >
            {/* TODO: wire to submit_inbound_request RPC */}
            입고 신청 제출
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div
        className="mb-5 flex items-center rounded-xl border bg-white px-4.5 py-3.5"
        style={{ padding: '14px 18px' }}
      >
        {STEPS.map((s, i) => {
          const done = i < CURRENT_STEP;
          const active = i === CURRENT_STEP;
          return (
            <div key={s} className="flex flex-1 items-center">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex size-7 items-center justify-center rounded-full text-sm font-extrabold text-white"
                  style={{
                    background: done ? '#1F6B43' : active ? '#D4A24C' : 'var(--warm-200)',
                    color: done || active ? '#fff' : 'var(--warm-700)',
                    boxShadow: active ? '0 0 0 5px rgba(212,162,76,0.18)' : undefined,
                  }}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className="text-sm"
                  style={{
                    fontWeight: active ? 800 : done ? 600 : 400,
                    color: active || done ? 'var(--foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="mx-4 h-0.5 flex-1"
                  style={{ background: done ? '#1F6B43' : 'var(--warm-100)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Body grid: form left, summary right */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Form card */}
        <div className="rounded-xl border bg-white px-7 py-6">
          <h2 className="mb-1 text-lg font-extrabold tracking-tight">2단계 · 수량과 권장 판매가</h2>
          <p className="text-muted-foreground mb-5 text-sm">
            이번에 입고할 수량과 운영자가 검토할 권장 판매가를 입력해주세요.
          </p>

          <div className="mb-3.5 grid grid-cols-2 gap-3.5">
            <InboundField label="백화점" required>
              <select className="inbound-input">
                <option>현대백화점</option>
                <option>롯데백화점</option>
                <option>신세계백화점</option>
                <option>갤러리아</option>
                <option>AK플라자</option>
              </select>
            </InboundField>
            <InboundField label="권종 (액면가)" required>
              <select className="inbound-input">
                <option>100,000원</option>
                <option>50,000원</option>
                <option>200,000원</option>
                <option>300,000원</option>
              </select>
            </InboundField>
          </div>

          <InboundField label="입고 수량" required hint="1회 입고 한도 1,000매 · 초과 시 분할 신청">
            <div className="flex items-center gap-2">
              <input
                className="inbound-input flex-1 text-lg font-extrabold tabular-nums"
                style={{ height: 48 }}
                defaultValue="500"
                type="number"
                min={1}
                max={1000}
              />
              <span className="text-muted-foreground text-sm font-bold">매</span>
            </div>
          </InboundField>

          <InboundField
            label="권장 판매가 / 매"
            required
            hint="시세 평균 대비 ±2% 이내로 자동 조정될 수 있어요"
          >
            <div className="grid grid-cols-2 gap-2">
              <input className="inbound-input font-bold tabular-nums" defaultValue="96,500원" />
              <div
                className="flex items-center justify-between rounded-lg px-3 text-sm"
                style={{ background: 'var(--warm-50)', height: 40 }}
              >
                <span className="text-muted-foreground font-semibold">시세 평균</span>
                <span className="font-extrabold tabular-nums">96,800원</span>
              </div>
            </div>
          </InboundField>

          <InboundField
            label="유효기간 (가장 빠른 만료일)"
            required
            hint="만료 6개월 미만은 입고 불가"
          >
            <input className="inbound-input" defaultValue="2027.11.06" />
          </InboundField>

          <InboundField label="카드 보관 방식">
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: '운영자 Vault 보관', d: '추천 · 검수 후 즉시 판매 가능', sel: true },
                { l: '에이전트 자체 보관', d: '주문 발생 시 30분 내 전달 의무', sel: false },
              ].map((o) => (
                <div
                  key={o.l}
                  className="cursor-pointer rounded-xl p-3.5"
                  style={{
                    border: o.sel ? '2px solid #D4A24C' : '1px solid var(--border)',
                    background: o.sel ? 'rgba(212,162,76,0.06)' : '#fff',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-4 rounded-full bg-white"
                      style={{
                        border: o.sel ? '5px solid #D4A24C' : '1.5px solid var(--warm-300)',
                      }}
                    />
                    <span className="text-sm font-extrabold">{o.l}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 text-sm">{o.d}</div>
                </div>
              ))}
            </div>
          </InboundField>

          <InboundField label="비고" hint="운영자 검수팀에 전달됩니다 (선택)">
            <textarea
              className="inbound-input resize-y"
              rows={3}
              style={{ height: 'auto', padding: '10px 12px' }}
              defaultValue="11월 프로모션용 추가 입고. 시세 -1.5% 수준으로 빠르게 회전 부탁드립니다."
            />
          </InboundField>

          <div className="mt-5 flex justify-between border-t pt-4">
            <button className="h-10 rounded-lg border bg-white px-4 text-sm font-bold">
              ← 이전 단계
            </button>
            <button
              className="h-10 rounded-lg px-5 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)', border: 0 }}
            >
              다음 단계 →
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Summary card */}
          <div className="rounded-xl border bg-white p-5">
            <div className="text-ticketa-gold-700 mb-2.5 text-[13px] font-extrabold tracking-widest uppercase">
              입고 요약
            </div>
            <div className="flex items-center gap-3 border-b border-dashed pb-3">
              <DeptMark dept="hyundai" size={42} />
              <div>
                <div className="text-sm font-extrabold">현대백화점 10만원권</div>
                <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                  SKU-HD-10 · 신규
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {[
                ['입고 수량', '500매'],
                ['총 액면가', '50,000,000원'],
                ['권장 판매가', '96,500원 / 매'],
                ['예상 매출', '48,250,000원'],
                ['플랫폼 수수료 (1.5%)', '−723,750원'],
                ['에이전트 수익', '47,526,250원'],
              ].map(([k, v], i, arr) => (
                <div
                  key={k}
                  className="flex justify-between"
                  style={
                    i === arr.length - 1
                      ? { paddingTop: 8, borderTop: '1px solid var(--border)' }
                      : undefined
                  }
                >
                  <span className="text-muted-foreground font-semibold">{k}</span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontWeight: i === arr.length - 1 ? 900 : 700,
                      color: i === arr.length - 1 ? 'var(--ticketa-gold-700)' : 'var(--foreground)',
                      fontSize: i === arr.length - 1 ? 17 : 14,
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div
            className="rounded-xl border p-4.5"
            style={{
              background: 'rgba(212,162,76,0.08)',
              borderColor: 'rgba(212,162,76,0.30)',
              padding: '18px 20px',
            }}
          >
            <div className="text-ticketa-gold-700 mb-2 text-sm font-extrabold">알아두기</div>
            <ul className="text-warm-700 list-disc pl-4 text-sm leading-relaxed">
              <li>
                제출 후 운영자 검토에 평균 <b>4시간</b> 소요
              </li>
              <li>승인 시 등기택배로 발송 안내</li>
              <li>
                검수센터 도착 후 <b>샘플 검증 + 잔액 조회</b> 완료 시 자동 판매 시작
              </li>
              <li>거부 시 사유와 함께 알림 + 재신청 가능</li>
            </ul>
          </div>

          {/* Recent requests */}
          <div className="rounded-xl border bg-white p-4">
            <div className="text-muted-foreground mb-2 text-[13px] font-extrabold tracking-wider uppercase">
              최근 입고 신청
            </div>
            <div className="flex flex-col gap-2">
              {RECENT_REQUESTS.map((r, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`inline-block size-1.5 shrink-0 rounded-full ${TONE_DOT[r.tone]}`}
                  />
                  <span className="flex-1 font-semibold">{r.label}</span>
                  <span className="text-muted-foreground text-[13px]">
                    {r.date} · {r.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InboundField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <div className="text-warm-700 mb-1.5 text-[13px] font-extrabold tracking-wide">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </div>
      {children}
      {hint && <div className="text-muted-foreground mt-1.5 text-xs">{hint}</div>}
    </div>
  );
}

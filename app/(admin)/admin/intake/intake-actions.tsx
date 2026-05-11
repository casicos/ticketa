'use client';

import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  markReceivedAction,
  markVerifiedAction,
  markShippedNotifyAction,
  adminCancelAction,
  adminForceCompleteAction,
  markPreVerifiedReceivedAction,
} from './actions';
import { SHIPPING_CARRIERS } from './data';
import type { ServerActionResult } from '@/lib/server-actions';

function handleResult(result: ServerActionResult<unknown>, successMsg: string) {
  if (result.ok) {
    toast.success(successMsg);
  } else {
    const codeMap: Record<string, string> = {
      BAD_STATE: '현재 상태에서 이 작업을 수행할 수 없습니다.',
      FORBIDDEN: '권한이 없습니다.',
      LISTING_NOT_FOUND: '매물을 찾을 수 없습니다.',
      INVALID_INPUT: '입력값을 확인하세요.',
    };
    toast.error(codeMap[result.code] ?? result.message ?? '오류가 발생했습니다.');
  }
}

// ------------------------------------------------------------------
// 사전 송부 검수 완료 (submitted + pre_verified, verified_at 미생성 → verified_at 갱신)
// ------------------------------------------------------------------

export function MarkPreVerifiedReceivedButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      if (memo.trim()) fd.set('memo', memo.trim());
      const result = await markPreVerifiedReceivedAction(fd);
      handleResult(result, '사전 송부 수령·검수 완료로 처리됐어요.');
      if (result.ok) {
        setOpen(false);
        setMemo('');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">검수 완료</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사전 송부 검수 완료</DialogTitle>
          <DialogDescription>
            실물 수령 + 진위 확인이 끝났나요? 매물이 카탈로그에서 &quot;인증&quot; 라벨로 노출되고
            판매자에게 알림이 발송됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="pre-memo">메모 (선택)</Label>
          <Textarea
            id="pre-memo"
            placeholder="검수 메모, 송장 번호, 상태 등 (200자 이내)"
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, 200))}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={confirm} disabled={pending}>
            {pending ? '처리 중…' : '확정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 수령 확인 (handed_over → received)
// ------------------------------------------------------------------

export function MarkReceivedButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      const result = await markReceivedAction(fd);
      handleResult(result, '실물 수령 완료로 변경됐어요.');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          수령 확인
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수령 확인</DialogTitle>
          <DialogDescription>
            실물이 도착했음을 확인합니다. 상태가 &quot;수령 완료&quot;로 바뀌고 판매자·구매자에게
            알림이 전송돼요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={confirm} disabled={pending}>
            {pending ? '처리 중…' : '확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 검증 완료 (received → verified)
// ------------------------------------------------------------------

export function MarkVerifiedButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      const result = await markVerifiedAction(fd);
      handleResult(result, '검증 완료로 변경됐어요.');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">검증 완료</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>검증 완료</DialogTitle>
          <DialogDescription>
            진위 검증이 끝났나요? 확정하면 구매자에게 &quot;곧 발송된다&quot; 알림이 발송됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={confirm} disabled={pending}>
            {pending ? '처리 중…' : '확정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 구매자 발송 (verified 유지 + 운송장 메모 + 알림)
// ------------------------------------------------------------------

// 디자인 매핑 — actions.ts SHIPPING_CARRIERS 의 code 와 동일.
// 화면용 브랜드 컬러/짧은 라벨/서브 라벨만 추가.
const COURIER_VISUAL: Record<string, { short: string; bg: string; fg?: string; sub?: string }> = {
  kpost: { short: '우체', bg: '#E4032E', sub: '우편 배송' },
  cj: { short: 'CJ', bg: '#A50034', sub: '국내 1위' },
  hanjin: { short: '한진', bg: '#0067B5' },
  lotte: { short: '롯데', bg: '#E50012' },
  logen: { short: '로젠', bg: '#1B7F3B' },
  cvs_cu: { short: 'CU', bg: '#5A2989', sub: '편의점 픽업' },
  cvs_gs25: { short: 'GS', bg: '#005CAA', sub: '편의점 픽업' },
  cvs_emart24: { short: '이마', bg: '#FFCD0E', fg: '#1B1B1B', sub: '편의점 픽업' },
  cvs_seven: { short: '세븐', bg: '#008C44', sub: '편의점 픽업' },
  etc: { short: '기타', bg: '#57534E', sub: '직접 입력' },
};

function CourierChip({
  code,
  label,
  active,
  onClick,
  disabled,
}: {
  code: string;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const v = COURIER_VISUAL[code] ?? { short: '?', bg: '#888' };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-bold tracking-[-0.01em] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        border: active ? `2px solid ${v.bg}` : '1px solid var(--border)',
        background: active ? `${v.bg}0E` : '#fff',
        boxShadow: active ? `0 0 0 3px ${v.bg}1A` : 'none',
        color: 'var(--foreground)',
      }}
    >
      <span
        className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-md text-[12px] font-black tracking-[-0.02em]"
        style={{ background: v.bg, color: v.fg ?? '#fff' }}
      >
        {v.short}
      </span>
      <span className="flex flex-col gap-px">
        <span>{label}</span>
        {v.sub && <span className="text-muted-foreground text-[12px] font-medium">{v.sub}</span>}
      </span>
      {active && (
        <span className="ml-auto inline-flex" style={{ color: v.bg }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="m4 8.5 2.5 2.5L12 5.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

export function MarkShippedButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState<string>('cj');
  const [tracking, setTracking] = useState('');
  const [memo, setMemo] = useState('');
  const [pending, startTransition] = useTransition();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      setCarrier('cj');
      setTracking('');
      setMemo('');
    }
  }

  const trackingValid = /^[0-9-]+$/.test(tracking.trim()) && tracking.trim().length >= 8;
  const canSubmit = !!carrier && trackingValid && !pending;

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      fd.set('shipping_carrier', carrier);
      fd.set('tracking_no', tracking.trim());
      if (memo.trim()) fd.set('memo', memo.trim());
      const result = await markShippedNotifyAction(fd);
      handleResult(result, '구매자 발송 처리됐어요.');
      handleOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="primary">
          발송 처리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[720px]">
        <DialogHeader className="border-border border-b pb-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-[4px] px-2 py-0.5 text-[12px] font-extrabold tracking-[0.06em]"
              style={{
                background: 'var(--ticketa-blue-50)',
                color: 'var(--ticketa-blue-700)',
              }}
            >
              상태 · 검수 완료 → 발송 중
            </span>
          </div>
          <DialogTitle className="text-[20px] font-extrabold tracking-[-0.022em]">
            발송 처리
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[14px]">
            택배사와 송장번호를 입력해서 매물을 발송 중 상태로 전환합니다. 구매자에게 송장 정보가
            알림으로 전송돼요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Couriers */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[14px] font-bold">
                택배사 <span className="text-destructive">*</span>
              </span>
              <span className="text-muted-foreground text-[13px]">한국 택배사 10종</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SHIPPING_CARRIERS.map((c) => (
                <CourierChip
                  key={c.code}
                  code={c.code}
                  label={c.label}
                  active={carrier === c.code}
                  onClick={() => setCarrier(c.code)}
                  disabled={pending}
                />
              ))}
            </div>
          </div>

          {/* Tracking */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[14px] font-bold">
                송장번호 <span className="text-destructive">*</span>
              </span>
              <span className="text-muted-foreground text-[13px]">숫자 / 하이픈만</span>
            </div>
            <div className="relative">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value.replace(/[^\d-]/g, ''))}
                placeholder="6193-4827-1029"
                maxLength={60}
                disabled={pending}
                className="border-ticketa-blue-500 h-12 w-full rounded-[10px] border bg-white px-3.5 font-mono text-[16px] font-semibold tracking-[0.02em] tabular-nums outline-none"
                style={{ boxShadow: '0 0 0 3px var(--ticketa-blue-50)' }}
              />
              {trackingValid && (
                <span
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded-[4px] px-2 py-1 text-[13px] font-extrabold tracking-[0.04em]"
                  style={{ background: '#1F6B43', color: '#fff' }}
                >
                  유효
                </span>
              )}
            </div>
          </div>

          {/* Memo */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[14px] font-bold">
                발송 메모 <span className="text-muted-foreground font-medium">(선택)</span>
              </span>
              <span className="text-muted-foreground text-[13px]">구매자에게 노출되지 않음</span>
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="검수센터 내부 기록용 (예: 봉인 번호, 발송 직원)"
              disabled={pending}
              rows={3}
              className="border-border w-full resize-none rounded-[10px] border bg-white p-3 text-[14px] outline-none"
            />
          </div>

          {/* Inline notice */}
          <div className="border-border bg-warm-50 text-warm-700 flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-[14px] leading-[1.6]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="text-ticketa-blue-700 mt-0.5 shrink-0"
            >
              <path
                d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              <b className="text-foreground">발송 처리</b>를 누르면 매물이{' '}
              <b className="text-foreground">발송 중</b> 상태로 전환되고 구매자에게 송장 정보가
              알림으로 전송돼요.
            </span>
          </div>
        </div>

        <DialogFooter className="border-border bg-warm-50 border-t px-6 py-3.5">
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {pending ? '처리 중…' : '발송 처리 →'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 자동완료 (shipped → completed) — 3일 자동완료 수동 버튼
// ------------------------------------------------------------------

export function ForceCompleteButton({
  listingId,
  shippedAt,
}: {
  listingId: string;
  shippedAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // 시각적으로만 안내. 다이얼로그가 열린 순간을 기준으로 계산 (재계산 안전).
  const [daysSinceShipped] = useState<number | null>(() =>
    shippedAt
      ? Math.floor((Date.now() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null,
  );
  const meetsThreshold = daysSinceShipped === null || daysSinceShipped >= 3;

  function confirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      const result = await adminForceCompleteAction(fd);
      handleResult(result, '거래 완료 처리됐어요.');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          자동완료 처리
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>거래 자동완료</DialogTitle>
          <DialogDescription>
            구매자가 인수 확인을 안 한 매물을 어드민이 직접 완료 처리합니다. 판매자에게 정산이 즉시
            지급돼요.
            {daysSinceShipped !== null && (
              <span className="mt-2 block text-[14px] font-semibold">
                발송 후 {daysSinceShipped}일 경과
                {meetsThreshold ? ' · 정책상 자동완료 가능' : ' · 3일 미만이지만 강제 완료 가능'}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={confirm} disabled={pending}>
            {pending ? '처리 중…' : '완료 처리'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 어드민 취소 (임의 상태 → cancelled)
// ------------------------------------------------------------------

export function AdminCancelButton({
  listingId,
  label = '취소 처리',
}: {
  listingId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  const canSubmit = reason.trim().length >= 5 && confirmed && !pending;

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      setReason('');
      setConfirmed(false);
    }
  }

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      fd.set('reason', reason.trim());
      const result = await adminCancelAction(fd);
      handleResult(result, '매물이 취소 처리됐어요.');
      handleOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>매물 취소 처리</DialogTitle>
          <DialogDescription className="text-destructive font-medium">
            이 작업은 되돌릴 수 없습니다. 구매자가 이미 결제했다면 마일리지가 환불돼요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`admin-cancel-reason-${listingId}`}>
              취소 사유 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`admin-cancel-reason-${listingId}`}
              placeholder="최소 5자 이상 입력하세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={400}
              disabled={pending}
            />
            {reason.trim().length > 0 && reason.trim().length < 5 && (
              <p className="text-destructive text-xs">최소 5자 이상 입력해야 합니다.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`admin-cancel-confirm-${listingId}`}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={pending}
            />
            <Label htmlFor={`admin-cancel-confirm-${listingId}`} className="cursor-pointer">
              상기 내용을 이해했습니다. 이 매물을 취소 처리합니다.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={pending}>
            돌아가기
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!canSubmit}>
            {pending ? '처리 중…' : '취소 처리 실행'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

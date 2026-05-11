'use client';

import { useState, useTransition } from 'react';
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
import { releasePayoutAction } from './actions';
import type { ServerActionResult } from '@/lib/server-actions';

type Props = {
  payoutId: string;
  sellerName: string;
  netAmount: number;
  bankCode: string | null;
  accountLast4: string | null;
};

function handleResult(result: ServerActionResult<{ ok: true }>, successMsg: string): boolean {
  if (result.ok) {
    toast.success(successMsg);
    return true;
  }
  const codeMap: Record<string, string> = {
    FORBIDDEN: '권한이 없습니다.',
    UNAUTHENTICATED: '로그인이 필요합니다.',
    INVALID_INPUT: '입력값을 확인하세요.',
    PAYOUT_NOT_FOUND: '정산 건을 찾을 수 없습니다.',
  };
  // RPC 가 raise exception 으로 내려주는 상태 에러 매핑
  const msg = result.message ?? '';
  if (msg.includes('NON_RELEASABLE_STATE')) {
    toast.error('이미 처리된 정산이거나 릴리즈 불가 상태입니다.');
    return false;
  }
  if (msg.includes('PAYOUT_DRIFT')) {
    toast.error('정산 금액 불일치(drift)가 감지되었습니다. 관리자에게 문의하세요.');
    return false;
  }
  toast.error(codeMap[result.code] ?? (msg || '오류가 발생했습니다.'));
  return false;
}

function formatKRW(amount: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ReleasePayoutButton({
  payoutId,
  sellerName,
  netAmount,
  bankCode,
  accountLast4,
}: Props) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const accountMissing = !bankCode || !accountLast4;
  const canSubmit = confirmed && !isPending;

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      setMemo('');
      setConfirmed(false);
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('payout_id', payoutId);
      if (memo.trim().length > 0) fd.set('memo', memo.trim());
      const result = await releasePayoutAction(fd);
      if (handleResult(result, '정산 완료 처리되었습니다.')) {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm">정산 완료</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>정산 완료 처리</DialogTitle>
          <DialogDescription>
            실제 이체를 완료한 뒤 이 버튼을 눌러주세요. 전이는 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="border-border bg-muted/40 rounded-lg border px-3 py-2">
            <div className="text-muted-foreground text-xs">판매자</div>
            <div className="font-medium">{sellerName}</div>
            <div className="text-muted-foreground mt-2 text-xs">지급 금액 (net)</div>
            <div className="font-mono font-semibold">{formatKRW(netAmount)}</div>
            <div className="text-muted-foreground mt-2 text-xs">계좌</div>
            <div className="text-sm">
              {accountMissing ? (
                <span className="text-destructive font-medium">
                  ⚠️ 정산계좌 미등록 — 릴리즈 전 판매자에게 확인 필요
                </span>
              ) : (
                <>
                  {bankCode} · ****{accountLast4}
                </>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`memo-${payoutId}`}>관리 메모 (선택)</Label>
            <Textarea
              id={`memo-${payoutId}`}
              rows={2}
              maxLength={400}
              placeholder="이체 참조번호, 메모 등"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`confirm-${payoutId}`}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={isPending}
            />
            <Label htmlFor={`confirm-${payoutId}`} className="cursor-pointer">
              실제 이체를 완료했습니다. 이 정산 건을 &quot;released&quot; 로 전이합니다.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            돌아가기
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? '처리 중…' : '정산 완료 처리'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

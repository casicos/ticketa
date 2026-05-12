'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  adminConfirmChargeAction,
  adminRejectChargeAction,
  adminResolveWithdrawAction,
} from './actions';
import type { ServerActionResult } from '@/lib/server-actions';

function handleResult<T>(result: ServerActionResult<T>, successMsg: string): boolean {
  if (result.ok) {
    toast.success(successMsg);
    return true;
  }
  const codeMap: Record<string, string> = {
    FORBIDDEN: '권한이 없습니다.',
    UNAUTHENTICATED: '로그인이 필요합니다.',
    INVALID_INPUT: '입력값을 확인하세요.',
    NOT_FOUND: '요청을 찾을 수 없습니다.',
    BAD_STATE: '현재 상태에서 수행할 수 없는 작업이에요.',
    DB_ERROR: 'DB 오류가 발생했습니다.',
    RPC_ERROR: 'RPC 오류가 발생했습니다.',
  };
  toast.error(codeMap[result.code] ?? result.message ?? '오류가 발생했습니다.');
  return false;
}

// ------------------------------------------------------------------
// 충전 승인
// ------------------------------------------------------------------

export function ConfirmChargeButton({
  chargeId,
  amount,
  depositorName,
  method,
}: {
  chargeId: number;
  amount: number;
  depositorName: string | null;
  method: 'bank_transfer' | 'pg';
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const bucketLabel = method === 'pg' ? 'PG (거래 필요)' : '무통장 (출금 가능)';

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('charge_id', String(chargeId));
      const result = await adminConfirmChargeAction(fd);
      if (handleResult(result, '충전이 승인됐어요.')) setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">승인</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>충전 승인 처리</DialogTitle>
          <DialogDescription>
            실제 입금 내역을 확인한 뒤 승인해주세요. 적립 후에는 되돌릴 수 없어요.
          </DialogDescription>
        </DialogHeader>
        <div className="border-border bg-muted/40 space-y-1 rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">금액</span>
            <span className="font-mono font-semibold">{amount.toLocaleString('ko-KR')}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">입금자명</span>
            <span>{depositorName ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">적립 버킷</span>
            <span>{bucketLabel}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? '처리 중…' : '승인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 충전 반려
// ------------------------------------------------------------------

export function RejectChargeButton({ chargeId }: { chargeId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) setReason('');
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('charge_id', String(chargeId));
      fd.set('reason', reason.trim());
      const result = await adminRejectChargeAction(fd);
      if (handleResult(result, '반려 처리됐어요.')) setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          반려
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>충전 요청 반려</DialogTitle>
          <DialogDescription>
            반려 사유를 입력해주세요. 사용자에게 알림으로 전달돼요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor={`charge-reject-${chargeId}`}>
            사유 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id={`charge-reject-${chargeId}`}
            rows={3}
            maxLength={400}
            placeholder="예: 입금 내역 확인 불가"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || isPending}
          >
            {isPending ? '처리 중…' : '반려 처리'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 출금 상태 변경
// ------------------------------------------------------------------

type WithdrawStatus = 'processing' | 'completed' | 'rejected';

function withdrawLabel(status: WithdrawStatus) {
  switch (status) {
    case 'processing':
      return '처리 중으로 변경';
    case 'completed':
      return '완료 처리';
    case 'rejected':
      return '반려';
  }
}

function withdrawTone(status: WithdrawStatus) {
  switch (status) {
    case 'processing':
      return 'outline' as const;
    case 'completed':
      return 'primary' as const;
    case 'rejected':
      return 'destructive' as const;
  }
}

export function ResolveWithdrawButton({
  withdrawId,
  status,
  amount,
  accountHolder,
  bankCode,
  accountLast4,
}: {
  withdrawId: number;
  status: WithdrawStatus;
  amount: number;
  accountHolder: string;
  bankCode: string;
  accountLast4: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const rejectRequired = status === 'rejected';

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) setReason('');
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('withdraw_id', String(withdrawId));
      fd.set('status', status);
      if (reason.trim().length > 0) fd.set('reason', reason.trim());
      const result = await adminResolveWithdrawAction(fd);
      if (
        handleResult(
          result,
          status === 'completed'
            ? '출금 완료 처리됐어요.'
            : status === 'rejected'
              ? '출금 요청이 반려됐어요.'
              : '출금 상태가 업데이트됐어요.',
        )
      ) {
        setOpen(false);
      }
    });
  }

  const canSubmit = !isPending && (!rejectRequired || reason.trim().length >= 1);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={withdrawTone(status)}>
          {withdrawLabel(status)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{withdrawLabel(status)}</DialogTitle>
          <DialogDescription>
            {status === 'completed'
              ? '실제 이체를 마쳤을 때만 눌러주세요. 되돌릴 수 없어요.'
              : status === 'rejected'
                ? '홀드된 cash_balance 가 복원되고 사용자에게 알림이 전송돼요.'
                : '처리 중 단계로 상태만 전환돼요 (잔액 변동 없음).'}
          </DialogDescription>
        </DialogHeader>
        <div className="border-border bg-muted/40 space-y-1 rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">금액</span>
            <span className="font-mono font-semibold">{amount.toLocaleString('ko-KR')}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">예금주</span>
            <span>{accountHolder}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">계좌</span>
            <span>
              {bankCode} · ****{accountLast4}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 py-1">
          <Label htmlFor={`withdraw-memo-${withdrawId}`}>
            메모 {rejectRequired && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id={`withdraw-memo-${withdrawId}`}
            rows={3}
            maxLength={400}
            placeholder={rejectRequired ? '반려 사유 (필수)' : '참조번호 등 (선택)'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button variant={withdrawTone(status)} onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? '처리 중…' : withdrawLabel(status)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

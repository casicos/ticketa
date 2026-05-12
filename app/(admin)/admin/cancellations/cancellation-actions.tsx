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
import { adminApproveCancellationAction, adminRejectCancellationAction } from './actions';
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
    RPC_ERROR: 'RPC 오류가 발생했습니다.',
    DB_ERROR: 'DB 오류가 발생했습니다.',
  };
  toast.error(codeMap[result.code] ?? result.message ?? '오류가 발생했습니다.');
  return false;
}

export function ApproveCancellationButton({
  requestId,
  refundAmount,
  listingShortId,
}: {
  requestId: number;
  refundAmount: number | null;
  listingShortId: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) setConfirmed(false);
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('request_id', String(requestId));
      const result = await adminApproveCancellationAction(fd);
      if (handleResult(result, '거래가 취소 처리됐어요.')) setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm">승인 (취소 실행)</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>거래 취소 승인</DialogTitle>
          <DialogDescription className="text-destructive font-medium">
            이 작업은 되돌릴 수 없어요. 구매자에게 자동 환불되고 매물이 cancelled 상태로 전환돼요.
          </DialogDescription>
        </DialogHeader>
        <div className="border-border bg-muted/40 space-y-1 rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">매물</span>
            <span className="font-mono">#{listingShortId}</span>
          </div>
          {refundAmount !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">예상 환불액</span>
              <span className="font-mono font-semibold">
                {refundAmount.toLocaleString('ko-KR')}원
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 py-1">
          <Checkbox
            id={`approve-confirm-${requestId}`}
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
            disabled={isPending}
          />
          <Label htmlFor={`approve-confirm-${requestId}`} className="cursor-pointer">
            환불 금액과 매물 상태를 확인했어요. 취소를 실행합니다.
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            돌아가기
          </Button>
          <Button onClick={handleSubmit} disabled={!confirmed || isPending}>
            {isPending ? '처리 중…' : '승인 및 취소 실행'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectCancellationButton({ requestId }: { requestId: number }) {
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
      fd.set('request_id', String(requestId));
      fd.set('reason', reason.trim());
      const result = await adminRejectCancellationAction(fd);
      if (handleResult(result, '취소 요청이 반려됐어요.')) setOpen(false);
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
          <DialogTitle>취소 요청 반려</DialogTitle>
          <DialogDescription>
            반려 사유를 입력해주세요. 요청자에게 알림으로 전달돼요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor={`reject-cancel-${requestId}`}>
            반려 사유 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id={`reject-cancel-${requestId}`}
            rows={3}
            maxLength={400}
            placeholder="예: 요청 사유가 거래 취소 기준에 부합하지 않아요"
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

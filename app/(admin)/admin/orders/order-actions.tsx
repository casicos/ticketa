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
  confirmPaymentAction,
  markShippedAction,
  markDeliveredAction,
  adminCancelOrderAction,
} from './actions';
import type { ServerActionResult } from '@/lib/server-actions';

function handleResult(result: ServerActionResult<{ ok: boolean }>, successMsg: string) {
  if (result.ok) {
    toast.success(successMsg);
  } else {
    const codeMap: Record<string, string> = {
      BAD_STATE: '현재 상태에서 이 작업을 수행할 수 없습니다.',
      FORBIDDEN: '권한이 없습니다.',
      INVALID_INPUT: '입력값을 확인하세요.',
      ORDER_NOT_FOUND: '주문을 찾을 수 없습니다.',
      DB_ERROR: 'DB 오류가 발생했습니다.',
    };
    toast.error(codeMap[result.code] ?? result.message ?? '오류가 발생했습니다.');
  }
}

// ------------------------------------------------------------------
// 결제 확인 버튼 (pending_payment → payment_confirmed)
// ------------------------------------------------------------------

export function ConfirmPaymentButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('order_id', orderId);
      const result = await confirmPaymentAction(fd);
      handleResult(result, '결제 확인 처리되었습니다.');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">결제 확인</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>결제 확인</DialogTitle>
          <DialogDescription>
            입금을 확인합니다. 상태가 &quot;결제 확인됨&quot;으로 변경됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? '처리 중…' : '확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 발송 처리 버튼 (payment_confirmed → shipped)
// ------------------------------------------------------------------

export function MarkShippedButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('order_id', orderId);
      const result = await markShippedAction(fd);
      handleResult(result, '발송 처리되었습니다.');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">발송 처리</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>발송 처리</DialogTitle>
          <DialogDescription>
            상품을 발송합니다. 모든 주문 아이템이 &quot;fulfilled&quot; 상태로 전환됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? '처리 중…' : '발송 확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 수령 확인 버튼 (shipped → delivered)
// ------------------------------------------------------------------

export function MarkDeliveredButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('order_id', orderId);
      const result = await markDeliveredAction(fd);
      handleResult(result, '수령 확인 처리되었습니다.');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">수령 확인</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수령 확인</DialogTitle>
          <DialogDescription>
            구매자가 상품을 수령했음을 확인합니다. 상태가 &quot;배송 완료&quot;로 변경됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? '처리 중…' : '수령 확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 주문 취소 버튼 (2단계 확인 모달 — AC 9.4)
// ------------------------------------------------------------------

export function AdminCancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canSubmit = reason.trim().length >= 5 && confirmed && !isPending;

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      setReason('');
      setConfirmed(false);
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('order_id', orderId);
      fd.set('reason', reason.trim());
      const result = await adminCancelOrderAction(fd);
      handleResult(result, '주문이 취소 처리되었습니다.');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          주문 취소
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>주문 취소 처리</DialogTitle>
          <DialogDescription className="text-destructive font-medium">
            이 작업은 되돌릴 수 없습니다. 재고가 복원됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`cancel-reason-${orderId}`}>
              취소 사유 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`cancel-reason-${orderId}`}
              placeholder="최소 5자 이상 입력하세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isPending}
            />
            {reason.trim().length > 0 && reason.trim().length < 5 && (
              <p className="text-destructive text-sm">최소 5자 이상 입력해야 합니다.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`cancel-confirm-${orderId}`}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={isPending}
            />
            <Label htmlFor={`cancel-confirm-${orderId}`} className="cursor-pointer">
              상기 내용을 이해했습니다. 이 주문을 취소 처리합니다.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            돌아가기
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? '처리 중…' : '취소 처리 실행'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

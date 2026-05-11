'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { formatDateTime } from '@/lib/format';
import { acceptListingAction, requestBuyerCancellationAction } from '../actions';

type PendingRequest = {
  id: number;
  status: string;
  reason: string;
  requested_at: string;
};

type Props = {
  listingId: string;
  canAccept: boolean;
  canRequestCancel: boolean;
  pendingRequest: PendingRequest | null;
};

export function OrderDetailClient({
  listingId,
  canAccept,
  canRequestCancel,
  pendingRequest,
}: Props) {
  if (!canAccept && !canRequestCancel && !pendingRequest) return null;

  return (
    <div className="border-border flex flex-col gap-3 rounded-md border p-4">
      <p className="text-sm font-medium">구매 관리</p>

      {pendingRequest && (
        <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">취소 요청이 접수됐어요.</p>
          <p className="mt-1 text-xs">
            어드민 승인 후 취소 처리됩니다. (요청 시각 {formatDateTime(pendingRequest.requested_at)}
            )
          </p>
          <p className="mt-1 text-xs">사유: {pendingRequest.reason}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canAccept && <AcceptButton listingId={listingId} />}
        {canRequestCancel && <BuyerCancelButton listingId={listingId} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 인수 확인 (verified → completed via complete_listing RPC)
// ------------------------------------------------------------------

function AcceptButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) setConfirmed(false);
  }

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      const result = await acceptListingAction(fd);
      if (result.ok) {
        toast.success('인수 확인이 완료됐어요. 판매자 정산이 처리됩니다.');
        handleOpen(false);
        router.refresh();
      } else if (result.code === 'INVALID_STATE') {
        toast.error('현재 상태에서는 인수 확인을 할 수 없어요');
      } else {
        toast.error(result.message ?? '인수 확인에 실패했어요');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm">인수 확인</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>인수 확인</DialogTitle>
          <DialogDescription>
            실물 상품권을 수령했고 정상 사용 가능한가요? 인수 확인을 누르면 판매자에게 마일리지가
            정산됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id={`accept-confirm-${listingId}`}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={pending}
            />
            <Label htmlFor={`accept-confirm-${listingId}`} className="cursor-pointer text-sm">
              상품권을 수령했으며 정상임을 확인합니다.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={pending}>
            닫기
          </Button>
          <Button onClick={submit} disabled={!confirmed || pending}>
            {pending ? '처리 중…' : '인수 확정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 취소 요청 (purchased~verified 구간)
// ------------------------------------------------------------------

function BuyerCancelButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  const canSubmit = reason.trim().length >= 10 && !pending;

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) setReason('');
  }

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      fd.set('reason', reason.trim());
      const result = await requestBuyerCancellationAction(fd);
      if (result.ok) {
        toast.success('취소 요청이 접수됐어요');
        handleOpen(false);
        router.refresh();
      } else if (result.code === 'ALREADY_PENDING') {
        toast.error('이미 검토 중인 취소 요청이 있어요');
      } else if (result.code === 'INVALID_STATE') {
        toast.error('현재 상태에서는 취소 요청을 보낼 수 없어요');
      } else {
        toast.error(result.message ?? '취소 요청에 실패했어요');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          취소 요청
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>취소 요청</DialogTitle>
          <DialogDescription>
            어드민 승인 후 취소·환불 처리됩니다. 사유를 10자 이상 적어주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`buyer-cancel-reason-${listingId}`}>
            취소 사유 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id={`buyer-cancel-reason-${listingId}`}
            placeholder="예) 상품 정보와 다른 실물이 도착했어요"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={400}
            rows={4}
            disabled={pending}
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-destructive text-xs">최소 10자 이상 입력해주세요.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={pending}>
            닫기
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!canSubmit}>
            {pending ? '보내는 중…' : '요청 보내기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

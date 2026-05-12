'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { handOverListingAction, requestSellerCancellationAction } from '../../actions';

type PendingCancelRequest = {
  id: number;
  status: string;
  reason: string;
  requested_at: string;
};

type Props = {
  listingId: string;
  canHandover: boolean;
  canRequestCancel: boolean;
  pendingCancelRequest: PendingCancelRequest | null;
};

/**
 * 판매자 매물 상세 액션 바.
 *  - purchased → "인계 확인" (2단계: 운송장(선택) + 발송 체크)
 *  - submitted/purchased/handed_over/received/verified → "취소 요청" (사유 10자+)
 *  - cancellation_requests 이 pending 이면 안내 카드 표시.
 */
export function SellerListingActions({
  listingId,
  canHandover,
  canRequestCancel,
  pendingCancelRequest,
}: Props) {
  if (!canHandover && !canRequestCancel && !pendingCancelRequest) return null;

  return (
    <div className="border-border flex flex-col gap-3 rounded-md border p-4">
      <p className="text-sm font-medium">매물 관리</p>

      {pendingCancelRequest && (
        <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">취소 요청이 접수됐어요</p>
          <p className="mt-1 text-xs">
            어드민 승인 후 취소 처리됩니다. (요청 시각{' '}
            {formatDateTime(pendingCancelRequest.requested_at)})
          </p>
          <p className="mt-1 text-xs">사유: {pendingCancelRequest.reason}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canHandover && <HandoverButton listingId={listingId} />}
        {canRequestCancel && <SellerCancelButton listingId={listingId} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 인계 확인 (purchased → handed_over)
// ------------------------------------------------------------------

function HandoverButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      setTracking('');
      setConfirmed(false);
    }
  }

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      if (tracking.trim()) fd.set('tracking_no', tracking.trim());
      const result = await handOverListingAction(fd);
      if (result.ok) {
        toast.success('인계 확인이 완료됐어요');
        handleOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? '인계 처리에 실패했어요');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm">인계 확인</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>인계 확인</DialogTitle>
          <DialogDescription>
            실물 상품권을 중간업체 주소로 발송하셨나요? 발송이 끝났으면 확인해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`handover-tracking-${listingId}`}>운송장 번호 (선택)</Label>
            <Input
              id={`handover-tracking-${listingId}`}
              placeholder="예) 1234567890"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              maxLength={60}
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              입력하면 구매자·어드민 알림에 함께 전달됩니다.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id={`handover-confirm-${listingId}`}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={pending}
            />
            <Label htmlFor={`handover-confirm-${listingId}`} className="cursor-pointer text-sm">
              실물 발송을 완료했음을 확인합니다.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={pending}>
            닫기
          </Button>
          <Button onClick={submit} disabled={!confirmed || pending}>
            {pending ? '처리 중…' : '인계 확정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// 취소 요청 (cancellation_requests pending)
// ------------------------------------------------------------------

function SellerCancelButton({ listingId }: { listingId: string }) {
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
      const result = await requestSellerCancellationAction(fd);
      if (result.ok) {
        toast.success('취소 요청이 접수됐어요. 어드민이 검토해요.');
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
            어드민 승인 후 취소 처리됩니다. 사유를 10자 이상 적어주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`seller-cancel-reason-${listingId}`}>
            취소 사유 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id={`seller-cancel-reason-${listingId}`}
            placeholder="예) 상품권을 다른 경로로 판매했습니다"
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

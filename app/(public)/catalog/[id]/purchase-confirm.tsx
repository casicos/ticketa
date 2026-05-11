'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatKRW } from '@/lib/format';
import { purchaseListingAction } from './actions';

type Props = {
  listingId: string;
  gross: number;
};

/**
 * 2단계 확인 모달 후 purchaseListingAction 호출.
 * 성공 시 Server Action 내부에서 redirect 되므로 클라이언트는 err 만 처리.
 */
export function PurchaseConfirm({ listingId, gross }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      const result = await purchaseListingAction(fd);
      // 성공 시 내부 redirect 로 여기 도달하지 않음. 도달 = 실패 경로.
      if (!result) return;
      if (result.ok) return;
      if (result.code === 'FORBIDDEN') {
        toast.error('구매 권한이 없습니다');
      } else if (result.code === 'UNAUTHENTICATED') {
        toast.error('로그인이 만료됐습니다');
      } else if (result.code === 'PHONE_UNVERIFIED') {
        toast.error('휴대폰 인증이 필요합니다');
      } else if (result.code === 'SELF_PURCHASE_FORBIDDEN') {
        toast.error('본인이 등록한 매물은 구매할 수 없어요');
      } else if (result.code === 'INVALID_STATE') {
        toast.error('이미 다른 에이전트가 구매했거나 상태가 바뀌었어요');
      } else if (result.code === 'LISTING_NOT_FOUND') {
        toast.error('매물을 찾을 수 없어요');
      } else {
        toast.error(result.message ?? '구매에 실패했어요');
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" className="mt-4 w-full" onClick={() => setOpen(true)}>
        구매 확정 · {formatKRW(gross)}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background ring-foreground/10 w-full max-w-md rounded-lg p-5 ring-1">
            <h2 className="text-base font-medium">구매 확정</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {formatKRW(gross)} 마일리지를 차감하고 이 매물을 구매합니다. 이후 취소는 어드민 승인이
              필요해요.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">계속할까요?</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                닫기
              </Button>
              <Button type="button" size="sm" onClick={handleConfirm} disabled={pending}>
                {pending ? '처리 중…' : '구매 확정'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

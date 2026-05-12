'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DeptMark } from '@/components/ticketa/dept-mark';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listingId: string;
  skuName: string;
  brand: string;
  amount: number;
  orderId: string;
  /** Server action: returns { ok, code?, message? } */
  acceptAction: (fd: FormData) => Promise<{ ok: boolean; code?: string; message?: string }>;
};

export function DialogPickup({
  open,
  onOpenChange,
  listingId,
  skuName,
  brand,
  amount,
  orderId,
  acceptAction,
}: Props) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v) setConfirmed(false);
  }

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      const result = await acceptAction(fd);
      if (result.ok) {
        toast.success('인수 확인이 완료됐어요. 판매자 정산이 처리됩니다.');
        handleClose(false);
        router.refresh();
      } else if (result.code === 'INVALID_STATE') {
        toast.error('현재 상태에서는 인수 확인을 할 수 없어요');
      } else {
        toast.error(result.message ?? '인수 확인에 실패했어요');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 pt-2 text-center">
            <div
              className="flex size-16 items-center justify-center rounded-full text-3xl font-black text-white"
              style={{
                background: 'linear-gradient(135deg, #2E7C52, #1F6B43)',
                boxShadow: '0 8px 20px rgba(46,124,82,0.32)',
              }}
            >
              ✓
            </div>
            <div>
              <DialogTitle className="text-lg">실물 카드 정상 수령을 확인하시나요?</DialogTitle>
              <DialogDescription className="mt-1 text-base leading-relaxed">
                확인 즉시 거래가 완료되며, 판매자에게 정산이 시작돼요.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Order summary */}
          <div className="bg-warm-50 flex items-center gap-4 rounded-xl px-4 py-3.5">
            <DeptMark dept={brand.toLowerCase()} size={42} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold">{skuName}</div>
              <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                #{orderId.slice(0, 12)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black tracking-tight tabular-nums">
                {amount.toLocaleString('ko-KR')}
                <span className="text-muted-foreground ml-0.5 text-sm font-semibold">M</span>
              </div>
            </div>
          </div>

          {/* Confirm checkbox */}
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="pickup-confirm"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={pending}
            />
            <Label
              htmlFor="pickup-confirm"
              className="text-warm-700 cursor-pointer text-base leading-relaxed"
            >
              카드 잔액을 확인했고, 정상 사용이 가능함을 동의합니다. 이 단계 이후엔 거래 취소가
              어려워요.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={pending}>
            아직요
          </Button>
          <Button
            onClick={submit}
            disabled={!confirmed || pending}
            className="bg-[#1F6B43] text-white hover:bg-[#18573A]"
          >
            {pending ? '처리 중…' : '수령 확인 → 거래 완료'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

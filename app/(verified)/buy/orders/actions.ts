'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requirePhoneVerified } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { callCompleteListing } from '@/lib/domain/mileage';
import { canBuyerAccept, type ListingStatus } from '@/lib/domain/listings';
import { submitCancellationRequestAction, type CancellationRole } from '@/lib/domain/cancellations';

/**
 * Wave 3: 구매자 인수 확인 (verified → completed).
 * 내부에서 complete_listing RPC 를 호출하면 판매자 마일리지 정산 + 알림 까지 처리된다.
 */
const acceptSchema = z.object({
  listing_id: z.string().uuid('유효하지 않은 매물 ID 입니다'),
});

export async function acceptListingAction(formData: FormData) {
  return withServerAction('acceptListing', async () => {
    await requirePhoneVerified();
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw Object.assign(new Error('UNAUTHENTICATED'), {
        code: 'UNAUTHENTICATED',
      });
    }

    const parsed = acceptSchema.safeParse({
      listing_id: formData.get('listing_id'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? 'VALIDATION'), {
        code: 'VALIDATION',
      });
    }

    const { listing_id } = parsed.data;

    const { data: row } = await supabase
      .from('listing')
      .select('buyer_id, status')
      .eq('id', listing_id)
      .maybeSingle<{ buyer_id: string | null; status: ListingStatus }>();

    if (!row || row.buyer_id !== user.id) {
      throw Object.assign(new Error('매물을 찾을 수 없습니다'), {
        code: 'FORBIDDEN',
      });
    }
    if (!canBuyerAccept(row.status)) {
      throw Object.assign(new Error('현재 상태에서는 인수 확인을 할 수 없어요'), {
        code: 'INVALID_STATE',
      });
    }

    await callCompleteListing({ actorId: user.id, listingId: listing_id });

    revalidatePath(`/buy/orders/${listing_id}`);
    revalidatePath('/buy/orders');
    revalidatePath('/account');
    return { ok: true as const };
  });
}

/**
 * 구매자 취소 요청. submitCancellationRequestAction 래퍼.
 * 기존 requestBuyerCancellationAction 의 호출 계약(FormData listing_id + reason) 을 그대로 유지.
 */
export async function requestBuyerCancellationAction(formData: FormData) {
  const listingIdRaw = formData.get('listing_id');
  const reasonRaw = formData.get('reason');
  const role: CancellationRole = 'buyer';
  const result = await submitCancellationRequestAction({
    listing_id: typeof listingIdRaw === 'string' ? listingIdRaw : '',
    role_at_request: role,
    reason: typeof reasonRaw === 'string' ? reasonRaw : '',
  });
  if (result.ok && typeof listingIdRaw === 'string') {
    revalidatePath(`/buy/orders/${listingIdRaw}`);
    revalidatePath('/buy/orders');
  }
  return result;
}

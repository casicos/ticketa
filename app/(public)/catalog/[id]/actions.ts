'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requirePhoneVerified } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { callPurchaseListing } from '@/lib/domain/mileage';
import { sendGiftFromListing } from '@/lib/domain/gifts';
import { lookupUserByUsername } from '@/lib/domain/auth/users';

/**
 * purchaseListingAction — /catalog/[id] 에서 호출되는 구매 확정 Server Action.
 *
 * 흐름:
 *   1. phone_verified 확인 (P2P 모델 — 별도 role 게이트 없음)
 *   2. callPurchaseListing RPC 호출 (서버사이드 잔액 체크 포함)
 *   3. 성공 → /buy/orders/<listingId> 로 redirect
 *   4. 잔액 부족(SHORT_BALANCE) → /account/mileage/charge?amount=...&returnTo=... 로 redirect
 *   5. 기타 에러 → withServerAction 이 code/message 로 변환 후 클라이언트에서 toast
 */

const schema = z.object({
  listing_id: z.string().uuid(),
  qty: z.coerce.number().int().min(1).max(10_000),
});

export async function purchaseListingAction(formData: FormData) {
  const result = await withServerAction('purchaseListing', async () => {
    await requirePhoneVerified();

    const parsed = schema.parse({
      listing_id: formData.get('listing_id'),
      qty: formData.get('qty') ?? 1,
    });

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const err = new Error('UNAUTHENTICATED') as Error & { code?: string };
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    const rpc = await callPurchaseListing({
      buyerId: user.id,
      listingId: parsed.listing_id,
      qty: parsed.qty,
    });

    if (!rpc.ok) {
      if (rpc.code === 'SHORT_BALANCE' && typeof rpc.shortage === 'number') {
        // 특수 반환 — 바깥에서 charge 페이지로 redirect.
        return {
          action: 'charge_required' as const,
          shortage: rpc.shortage,
          listing_id: parsed.listing_id,
        };
      }
      const message = 'message' in rpc ? rpc.message : undefined;
      const err = new Error(message ?? rpc.code) as Error & { code?: string };
      err.code = rpc.code;
      throw err;
    }

    revalidatePath('/catalog');
    revalidatePath('/buy/orders');
    revalidatePath('/sell/listings');
    // rpc.listing_id 는 분할된 자식 listing id (구매자의 주문 단위)
    return { action: 'purchased' as const, listing_id: rpc.listing_id };
  });

  if (result.ok) {
    if (result.data.action === 'charge_required') {
      redirect(
        `/account/mileage/charge?amount=${result.data.shortage}&returnTo=/catalog/${result.data.listing_id}`,
      );
    }
    redirect(`/buy/orders/${result.data.listing_id}`);
  }
  return result;
}

/**
 * sendGiftFromListingAction — 에이전트 매물의 카탈로그 페이지에서 선물 발송.
 *
 * send_gift_from_listing RPC 가 atomic 으로 처리:
 *   - listing.pre_verified=true 검증
 *   - listing.quantity_remaining 차감
 *   - inventory.qty_reserved 차감
 *   - cash 차감 + gifts insert + 수령자 알림
 */
const giftSchema = z.object({
  listing_id: z.string().uuid(),
  recipient_username: z.string().trim().min(1, '받는 사람 아이디를 입력하세요').max(40),
  qty: z.coerce.number().int().min(1).max(100),
  message: z.string().trim().max(200).optional().or(z.literal('')),
});

export async function sendGiftFromListingAction(formData: FormData) {
  return withServerAction('sendGiftFromListing', async () => {
    await requirePhoneVerified();
    const parsed = giftSchema.safeParse({
      listing_id: formData.get('listing_id'),
      recipient_username: formData.get('recipient_username'),
      qty: formData.get('qty'),
      message: formData.get('message') ?? '',
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();
    const giftId = await sendGiftFromListing(supabase, {
      recipientUsername: parsed.data.recipient_username,
      listingId: parsed.data.listing_id,
      qty: parsed.data.qty,
      message: parsed.data.message ? parsed.data.message : null,
    });

    revalidatePath(`/catalog/${parsed.data.listing_id}`);
    revalidatePath('/account/gift');
    revalidatePath('/account/mileage');
    return { ok: true as const, gift_id: giftId };
  });
}

/**
 * 선물 받는 사람 아이디(username) 사전 검증 (on-blur).
 *  - username 존재 여부 + 본인 여부만 반환. ID 등 메타데이터는 클라이언트로 전달 안 함.
 */
const lookupSchema = z.object({
  username: z.string().trim().min(1).max(40),
});

export async function lookupGiftRecipientAction(formData: FormData) {
  return withServerAction('lookupGiftRecipient', async () => {
    await requirePhoneVerified();
    const parsed = lookupSchema.safeParse({ username: formData.get('username') });
    if (!parsed.success) {
      return { ok: true as const, found: false, isSelf: false };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const err = new Error('UNAUTHENTICATED') as Error & { code?: string };
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    const found = await lookupUserByUsername(parsed.data.username);
    if (!found) return { ok: true as const, found: false, isSelf: false };
    return {
      ok: true as const,
      found: true,
      isSelf: found.id === user.id,
    };
  });
}

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requirePhoneVerified } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { callPurchaseListing } from '@/lib/domain/mileage';
import { sendGift } from '@/lib/domain/gifts';

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

const schema = z.object({ listing_id: z.string().uuid() });

export async function purchaseListingAction(formData: FormData) {
  const result = await withServerAction('purchaseListing', async () => {
    await requirePhoneVerified();

    const parsed = schema.parse({ listing_id: formData.get('listing_id') });

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
    return { action: 'purchased' as const, listing_id: parsed.listing_id };
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
 * 흐름:
 *   1. listing 의 seller_id 가 agent 인지 검증
 *   2. agent 의 inventory 중 같은 sku_id, qty_available >= qty 인 행 선택 (가장 저렴한 unit_cost 우선)
 *   3. send_gift RPC 호출 — 발송자 cash 차감 + agent_inventory 감소 + gift 생성
 */
const giftSchema = z.object({
  listing_id: z.string().uuid(),
  recipient_nickname: z.string().trim().min(1, '받는 사람 닉네임을 입력하세요').max(40),
  qty: z.coerce.number().int().min(1).max(100),
  message: z.string().trim().max(200).optional().or(z.literal('')),
});

export async function sendGiftFromListingAction(formData: FormData) {
  return withServerAction('sendGiftFromListing', async () => {
    await requirePhoneVerified();
    const parsed = giftSchema.safeParse({
      listing_id: formData.get('listing_id'),
      recipient_nickname: formData.get('recipient_nickname'),
      qty: formData.get('qty'),
      message: formData.get('message') ?? '',
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();

    // listing 조회 + agent role 확인
    const { data: listing } = await supabase
      .from('listing')
      .select('id, seller_id, sku_id, unit_price, quantity_offered, status, pre_verified')
      .eq('id', parsed.data.listing_id)
      .maybeSingle<{
        id: string;
        seller_id: string;
        sku_id: string;
        unit_price: number;
        quantity_offered: number;
        status: string;
        pre_verified: boolean;
      }>();
    if (!listing) {
      throw Object.assign(new Error('매물을 찾을 수 없어요'), { code: 'NOT_FOUND' });
    }
    if (listing.status !== 'submitted') {
      throw Object.assign(new Error('판매 가능한 매물이 아니에요'), { code: 'INVALID_STATE' });
    }

    const { data: agentRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', listing.seller_id)
      .eq('role', 'agent')
      .is('revoked_at', null)
      .maybeSingle();
    if (!agentRole) {
      throw Object.assign(new Error('에이전트 매물만 선물할 수 있어요'), { code: 'NOT_AGENT' });
    }

    // 같은 에이전트의 inventory 에서 qty_available 충분한 row 선택 (가장 저렴한 단가 우선)
    const { data: inv } = await supabase
      .from('agent_inventory')
      .select('id, qty_available, unit_cost')
      .eq('agent_id', listing.seller_id)
      .eq('sku_id', listing.sku_id)
      .gte('qty_available', parsed.data.qty)
      .order('unit_cost', { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string; qty_available: number; unit_cost: number }>();
    if (!inv) {
      throw Object.assign(new Error('에이전트의 재고가 부족해요'), {
        code: 'INVENTORY_INSUFFICIENT',
      });
    }

    const giftId = await sendGift(supabase, {
      recipientNickname: parsed.data.recipient_nickname,
      inventoryId: inv.id,
      qty: parsed.data.qty,
      unitPrice: listing.unit_price,
      message: parsed.data.message ? parsed.data.message : null,
    });

    revalidatePath(`/catalog/${parsed.data.listing_id}`);
    revalidatePath('/account/gift');
    revalidatePath('/account/mileage');
    return { ok: true as const, gift_id: giftId };
  });
}

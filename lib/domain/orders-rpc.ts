import { createSupabaseTransactionClient } from '@/lib/supabase/transaction';
import type { CreateOrderResult } from '@/lib/domain/orders';

/**
 * create_order_transaction RPC 래퍼.
 *
 * Wave B 의 checkout Server Action 이 이 함수를 import.
 * transaction 클라이언트를 쓰는 이유: RPC 는 SECURITY DEFINER 로 실행되지만,
 * "service-role 전용 채널" 을 거치면 JWT 만료/RLS 혼동 제거 → 더 단단함.
 * 플랜 Principle 5 의 "명시적 예외 경로" 에 해당.
 *
 * ESLint boundaries 상 `lib/supabase/transaction.ts` 는 `lib/domain/**` 에서만 import 허용.
 * 이 파일은 lib/domain/ 내부이므로 허용 구역.
 */
export async function callCreateOrderTransaction(args: {
  buyer: string;
  items: Array<{ sku_id: string; quantity: number }>;
  preview_signature: string | null;
  shipping: Record<string, unknown>;
}): Promise<CreateOrderResult> {
  const supabase = createSupabaseTransactionClient();
  const { data, error } = await supabase.rpc('create_order_transaction', {
    p_buyer: args.buyer,
    p_items: args.items,
    p_preview_signature: args.preview_signature,
    p_shipping: args.shipping,
  });
  if (error) throw error;
  return data as unknown as CreateOrderResult;
}

/**
 * restore_listing_stock RPC 래퍼.
 * 주문 취소 시 재고 복원 + 상태 전이. idempotent (이미 cancelled 면 no-op).
 */
export async function callRestoreListingStock(orderId: string): Promise<void> {
  const supabase = createSupabaseTransactionClient();
  const { error } = await supabase.rpc('restore_listing_stock', { p_order: orderId });
  if (error) throw error;
}

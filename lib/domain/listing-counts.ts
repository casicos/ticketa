import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 현재 인증 사용자의 sell/buy 8 상태별 listing 카운트.
 *
 * 0048 migration 의 `get_my_listing_counts` RPC 를 호출. RLS security invoker
 * 라 caller 의 auth.uid() 가 그대로 적용됨 — 다른 사용자 데이터 노출 위험 없음.
 *
 * /account 페이지 한 번 진입에서 발생하던 10 개 count(*) round-trip 을 1 RPC 로 통합.
 */
export type ListingCounts = {
  sellSubmitted: number;
  sellInProgress: number;
  sellCompleted: number;
  sellCancelled: number;
  buyPurchased: number;
  buyInProgress: number;
  buyCompleted: number;
  buyCancelled: number;
};

export async function fetchMyListingCounts(supabase: SupabaseClient): Promise<ListingCounts> {
  const { data, error } = await supabase.rpc('get_my_listing_counts').single<{
    sell_submitted: number | string;
    sell_in_progress: number | string;
    sell_completed: number | string;
    sell_cancelled: number | string;
    buy_purchased: number | string;
    buy_in_progress: number | string;
    buy_completed: number | string;
    buy_cancelled: number | string;
  }>();
  if (error || !data) {
    return {
      sellSubmitted: 0,
      sellInProgress: 0,
      sellCompleted: 0,
      sellCancelled: 0,
      buyPurchased: 0,
      buyInProgress: 0,
      buyCompleted: 0,
      buyCancelled: 0,
    };
  }
  // pg bigint 는 supabase-js 가 string 으로 직렬화할 수 있어 Number() 강제.
  return {
    sellSubmitted: Number(data.sell_submitted),
    sellInProgress: Number(data.sell_in_progress),
    sellCompleted: Number(data.sell_completed),
    sellCancelled: Number(data.sell_cancelled),
    buyPurchased: Number(data.buy_purchased),
    buyInProgress: Number(data.buy_in_progress),
    buyCompleted: Number(data.buy_completed),
    buyCancelled: Number(data.buy_cancelled),
  };
}

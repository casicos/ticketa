-- 0048_listing_counts_rpc.sql
-- 목적: /account, MyRoomShell 에서 호출되는 다수의 count(*) 쿼리를 단일 RPC 로 합침.
--
-- 효과:
--   - /account: getSellCounts(3 쿼리) + getBuyCounts(3 쿼리) → 1 RPC (6 round-trip → 1)
--   - MyRoomShell.fetchCounts: 4 쿼리 → 1 RPC
--   - account 페이지 진입 시 listing count 관련 round-trip 10개 → 1개
--
-- RLS: security invoker → 호출자 auth.uid() 기준 RLS 정책이 그대로 적용됨.
-- 다른 사용자의 listing 은 RLS 가 차단.
--
-- 멱등성: create or replace.

create or replace function public.get_my_listing_counts()
returns table (
    sell_submitted bigint,
    sell_in_progress bigint,
    sell_completed bigint,
    sell_cancelled bigint,
    buy_purchased bigint,
    buy_in_progress bigint,
    buy_completed bigint,
    buy_cancelled bigint
)
language sql
security invoker
stable
as $$
    select
        count(*) filter (where seller_id = auth.uid() and status = 'submitted') as sell_submitted,
        count(*) filter (where seller_id = auth.uid()
            and status in ('purchased','handed_over','received','verified','shipped')) as sell_in_progress,
        count(*) filter (where seller_id = auth.uid() and status = 'completed') as sell_completed,
        count(*) filter (where seller_id = auth.uid() and status = 'cancelled') as sell_cancelled,
        count(*) filter (where buyer_id = auth.uid() and status = 'purchased') as buy_purchased,
        count(*) filter (where buyer_id = auth.uid()
            and status in ('handed_over','received','verified','shipped')) as buy_in_progress,
        count(*) filter (where buyer_id = auth.uid() and status = 'completed') as buy_completed,
        count(*) filter (where buyer_id = auth.uid() and status = 'cancelled') as buy_cancelled
    from public.listing
    where (seller_id = auth.uid() or buyer_id = auth.uid())
      -- 분할 매입 자식 listing 제외 (sell 측 카운트는 부모 단위, buy 측은 자식 단위 — 현재 정책)
      -- 단, buyer_id 가 본인이면 child 도 자기 매입이므로 포함해야 함.
      -- 따라서 seller_id=self 인 경우만 parent 만 카운트.
      and (
          buyer_id = auth.uid()
          or (seller_id = auth.uid() and parent_listing_id is null)
      );
$$;

grant execute on function public.get_my_listing_counts() to authenticated;

comment on function public.get_my_listing_counts is
    '현재 인증 사용자의 sell/buy listing 8 상태별 카운트. RLS security invoker.';

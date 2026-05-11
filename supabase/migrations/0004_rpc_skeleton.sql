-- 0004_rpc_skeleton.sql
-- Phase 4/5 에서 구현할 RPC 함수의 선언만 미리 배치한다.
-- 참조: .omc/plans/b2c-giftcard-broker-mvp.md Section 8 Phase 2 step 22, Phase 4 step 30/33, Phase 5 step 37
--
-- 본 마이그레이션은 **의도적으로 스켈레톤**이다. 실제 구현은 Phase 4 에서
--   0007_rpc_order.sql 등 별도 마이그레이션에서 CREATE OR REPLACE 로 덮어쓴다.
-- 이렇게 배치하는 이유:
--   (1) 환경 간 함수 signature drift 방지
--   (2) 호출 코드(lib/supabase/transaction.ts 등)가 타입 생성 시점에 시그니처를 알 수 있음
--   (3) 호출 시도 시 명확한 에러로 실패 (구현 안 된 상태 인지 용이)

create or replace function public.create_order_transaction(
    p_buyer uuid,
    p_items jsonb,                       -- [{sku_id, quantity}, ...]
    p_preview_signature text,
    p_shipping jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    raise exception 'create_order_transaction not implemented yet (Phase 4)'
        using errcode = 'P0001';
end;
$$;

create or replace function public.restore_listing_stock(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    raise exception 'restore_listing_stock not implemented yet (Phase 4)'
        using errcode = 'P0001';
end;
$$;

create or replace function public.release_payout(p_payout uuid, p_admin uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    raise exception 'release_payout not implemented yet (Phase 5)'
        using errcode = 'P0001';
end;
$$;

-- 0017_shipped_state.sql
-- 6단계 → 7단계 상태 머신 확장.
--   submitted → purchased → handed_over → received → verified → shipped → completed
-- 기존: verified 단계에서 어드민이 "발송 처리" 를 해도 상태가 그대로였음.
-- 새로: verified (검증 완료) → shipped (구매자에게 발송됨) → completed (구매자 인수 확인)
-- 구매자 인수 확인 버튼은 shipped 에서만 노출 (verified 아님).

-- 1. listing.status CHECK 확장 + shipped_at 컬럼
alter table public.listing
  drop constraint if exists listing_status_check;
alter table public.listing
  add constraint listing_status_check check (
    status in (
      'submitted', 'purchased', 'handed_over',
      'received', 'verified', 'shipped', 'completed',
      'cancelled'
    )
  );

alter table public.listing
  add column if not exists shipped_at timestamptz;

-- 2. 구 데이터 forward migrate: admin_memo 에 '[구매자발송]' 이 포함된 verified 행은 shipped 로.
update public.listing
   set status = 'shipped',
       shipped_at = coalesce(shipped_at, now())
 where status = 'verified'
   and admin_memo ilike '%[구매자발송]%';

-- 3. complete_listing 재정의: shipped → completed (기존 verified → completed 에서 변경)
create or replace function public.complete_listing(
  p_actor uuid,
  p_listing uuid
) returns void
language plpgsql security definer as $$
declare v_listing record;
begin
  select * into v_listing from public.listing where id = p_listing for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_listing.status <> 'shipped' then raise exception 'INVALID_STATE: %', v_listing.status; end if;
  if v_listing.buyer_id <> p_actor then raise exception 'FORBIDDEN'; end if;

  update public.listing set status = 'completed', completed_at = now() where id = p_listing;

  -- 판매자 정산: cash 버킷
  perform public.credit_mileage(
    v_listing.seller_id, v_listing.seller_net_amount, 'settle', 'cash', p_listing, null, null,
    format('정산: listing=%s gross=%s commission=%s', p_listing, v_listing.gross_amount, v_listing.commission_total)
  );

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (p_actor, 'listing', p_listing, 'status_change:completed', 'shipped', 'completed',
          jsonb_build_object('settled_amount', v_listing.seller_net_amount));

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_listing.seller_id, 'listing_settled', '정산이 완료됐어요',
          format('%s 마일리지가 적립됐습니다.', v_listing.seller_net_amount),
          format('/sell/listings/%s', p_listing));
end;
$$;

grant execute on function public.complete_listing to authenticated;

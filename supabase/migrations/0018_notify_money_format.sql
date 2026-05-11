-- 0018_notify_money_format.sql
-- 사용자에게 보이는 알림 본문의 금액 표기를 모두 #,##0 (three-digit comma) 로 통일.
-- to_char(n, 'FM999,999,999,999') 사용 — FM 은 앞뒤 공백 제거.

-- 1. complete_listing: '%s 마일리지가 적립됐습니다.' → 쉼표 포맷
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

  perform public.credit_mileage(
    v_listing.seller_id, v_listing.seller_net_amount, 'settle', 'cash', p_listing, null, null,
    format('정산: listing=%s gross=%s commission=%s',
           p_listing,
           to_char(coalesce(v_listing.gross_amount, 0), 'FM999,999,999,999'),
           to_char(coalesce(v_listing.commission_total, 0), 'FM999,999,999,999'))
  );

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (p_actor, 'listing', p_listing, 'status_change:completed', 'shipped', 'completed',
          jsonb_build_object('settled_amount', v_listing.seller_net_amount));

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_listing.seller_id, 'listing_settled', '정산이 완료됐어요',
          format('%s 마일리지가 적립됐습니다.',
                 to_char(coalesce(v_listing.seller_net_amount, 0), 'FM999,999,999,999')),
          format('/sell/listings/%s', p_listing));
end;
$$;
grant execute on function public.complete_listing to authenticated;

-- 2. cancel_listing: '%s 마일리지가 환불됐습니다.' → 쉼표 포맷
create or replace function public.cancel_listing(
  p_admin uuid,
  p_listing uuid,
  p_reason text
) returns void
language plpgsql security definer as $$
declare v_listing record;
begin
  if not exists (select 1 from public.user_roles where user_id = p_admin and role = 'admin' and revoked_at is null)
  then raise exception 'FORBIDDEN'; end if;
  select * into v_listing from public.listing where id = p_listing for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_listing.status = 'completed' then raise exception 'ALREADY_COMPLETED'; end if;
  if v_listing.status = 'cancelled' then return; end if;

  if v_listing.buyer_id is not null and v_listing.gross_amount is not null then
    perform public.credit_mileage(
      v_listing.buyer_id, v_listing.gross_amount, 'refund', 'cash', p_listing, null, null,
      format('취소 환불: listing=%s reason=%s', p_listing, p_reason)
    );
  end if;

  update public.listing set status = 'cancelled', cancelled_at = now(),
    cancelled_by = p_admin, cancel_reason = p_reason
    where id = p_listing;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (p_admin, 'listing', p_listing, 'status_change:cancelled', v_listing.status, 'cancelled',
          jsonb_build_object('reason', p_reason, 'refund_amount', v_listing.gross_amount));

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_listing.seller_id, 'listing_cancelled', '거래가 취소됐어요', p_reason, format('/sell/listings/%s', p_listing));
  if v_listing.buyer_id is not null then
    insert into public.notifications(user_id, kind, title, body, link_to)
    values (v_listing.buyer_id, 'listing_cancelled', '거래가 취소됐어요',
            format('%s 마일리지가 환불됐습니다.',
                   to_char(coalesce(v_listing.gross_amount, 0), 'FM999,999,999,999')),
            format('/buy/orders/%s', p_listing));
  end if;
end;
$$;
grant execute on function public.cancel_listing to authenticated;

-- 3. 출금 완료/반려 알림에 금액 포함하려면 별도 업데이트 필요하지만 MVP 는 현 메시지 유지
--    (payload 가 단순 status 변경이라 사용자가 대시보드 가서 확인). 변경 없음.

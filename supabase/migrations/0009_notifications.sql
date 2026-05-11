-- 0009_notifications.sql
-- Phase 6: DB 트리거 기반 알림 자동 생성
-- notifications 테이블 RLS: 본인만 (0002_rls_policies.sql 에서 이미 설정됨)

-- ------------------------------------------------------------------
-- 1) 주문 상태 전이 시 구매자에게 알림
-- ------------------------------------------------------------------

create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_title text;
  v_body  text;
  v_link  text := format('/buy/orders/%s', new.id);
begin
  if new.status is distinct from old.status then
    case new.status
      when 'payment_confirmed' then
        v_title := '입금이 확인됐어요';
        v_body  := format('주문 %s 의 결제가 확인됐습니다. 곧 발송됩니다.', substring(new.id::text, 1, 8));
      when 'shipped' then
        v_title := '상품권이 발송됐어요';
        v_body  := format('주문 %s 가 발송됐습니다. 곧 수령하실 거예요.', substring(new.id::text, 1, 8));
      when 'delivered' then
        v_title := '수령이 완료됐어요';
        v_body  := format('주문 %s 수령이 확인됐습니다.', substring(new.id::text, 1, 8));
      when 'cancelled' then
        v_title := '주문이 취소됐어요';
        v_body  := format('주문 %s 가 취소됐습니다.', substring(new.id::text, 1, 8));
      else
        return new;
    end case;
    insert into public.notifications (user_id, kind, title, body, link_to)
    values (new.buyer_id, 'order_' || new.status, v_title, v_body, v_link);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_order_status on public.orders;
create trigger trg_notify_order_status
  after update of status on public.orders
  for each row execute function public.notify_order_status_change();

-- ------------------------------------------------------------------
-- 2) 신규 주문 생성 시 판매자에게 알림 (order_items insert 시점)
-- ------------------------------------------------------------------

create or replace function public.notify_new_order_to_seller()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, kind, title, body, link_to)
  values (
    new.seller_id,
    'order_placed_seller',
    '새 주문이 들어왔어요',
    format('%s장이 주문됐습니다. 어드민이 입금 확인 후 발송 준비합니다.', new.quantity),
    '/sell/listings'
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_order_seller on public.order_items;
create trigger trg_notify_new_order_seller
  after insert on public.order_items
  for each row execute function public.notify_new_order_to_seller();

-- ------------------------------------------------------------------
-- 3) payout released 시 판매자에게 알림
-- ------------------------------------------------------------------

create or replace function public.notify_payout_released()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'released' and (old.status is distinct from 'released') then
    insert into public.notifications (user_id, kind, title, body, link_to)
    values (
      new.seller_id,
      'payout_released',
      '정산이 완료됐어요',
      format('%s원이 계좌로 입금됐습니다.', to_char(new.net_amount, 'FM999,999,999')),
      '/sell/payouts'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_payout_released on public.payouts;
create trigger trg_notify_payout_released
  after update of status on public.payouts
  for each row execute function public.notify_payout_released();

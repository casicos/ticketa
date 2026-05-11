-- 0039_gift_by_username.sql
--
-- 선물 발송 시 수령자 식별을 nickname → username 으로 변경.
-- (사용자 친화적 ID 가 username 임. nickname 은 표시명 용도.)
-- gifts.recipient_nickname_snapshot 컬럼은 그대로 두되 username 값을 snapshot 으로 저장한다.

-- Postgres 는 CREATE OR REPLACE 로 파라미터 이름 변경 불가 → drop 후 create
drop function if exists public.send_gift_from_listing(text, uuid, int, text);

create function public.send_gift_from_listing(
  p_recipient_username text,
  p_listing_id uuid,
  p_qty int,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_listing record;
  v_inv_id uuid;
  v_inv record;
  v_recipient_id uuid;
  v_recipient_username text;
  v_total_price int;
  v_total_cost int;
  v_gift_id uuid;
begin
  if v_sender is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'INVALID_QTY'; end if;
  if p_recipient_username is null or length(trim(p_recipient_username)) = 0 then
    raise exception 'INVALID_RECIPIENT';
  end if;

  -- 수령자 매칭 — username (대소문자 구분, @ 접두사 허용)
  select id, username into v_recipient_id, v_recipient_username
    from public.users
   where username = ltrim(trim(p_recipient_username), '@')
   limit 1;
  if v_recipient_id is null then raise exception 'RECIPIENT_NOT_FOUND'; end if;
  if v_recipient_id = v_sender then raise exception 'SELF_GIFT_FORBIDDEN'; end if;

  -- listing 락 + 검증
  select * into v_listing
    from public.listing
   where id = p_listing_id
   for update;
  if v_listing.id is null then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_listing.parent_listing_id is not null then raise exception 'CANNOT_GIFT_CHILD'; end if;
  if v_listing.status <> 'submitted' then raise exception 'INVALID_STATE: %', v_listing.status; end if;
  if v_listing.pre_verified = false then raise exception 'NOT_AGENT_LISTING'; end if;
  if v_listing.quantity_remaining < p_qty then
    raise exception 'INSUFFICIENT_QUANTITY: have=%, need=%', v_listing.quantity_remaining, p_qty;
  end if;
  if v_listing.seller_id = v_sender then raise exception 'SELF_GIFT_FORBIDDEN'; end if;

  select (e.metadata->>'inventory_id')::uuid into v_inv_id
    from public.audit_events e
   where e.entity_type = 'listing'
     and e.entity_id = p_listing_id
     and e.event = 'agent_listing_created'
   order by e.created_at asc
   limit 1;
  if v_inv_id is null then raise exception 'INVENTORY_NOT_FOUND'; end if;

  select id, agent_id, sku_id, qty_available, qty_reserved, unit_cost
    into v_inv
    from public.agent_inventory
   where id = v_inv_id
   for update;
  if v_inv.id is null then raise exception 'INVENTORY_NOT_FOUND'; end if;
  if v_inv.qty_reserved < p_qty then
    raise exception 'INVENTORY_RESERVED_INSUFFICIENT: reserved=%, need=%', v_inv.qty_reserved, p_qty;
  end if;

  v_total_price := p_qty * v_listing.unit_price;
  v_total_cost := p_qty * v_inv.unit_cost;

  perform public.debit_mileage(v_sender, v_total_price, 'gift_sent', null,
    format('선물 발송 (listing=%s) → @%s', p_listing_id, v_recipient_username));

  update public.listing
     set quantity_remaining = quantity_remaining - p_qty
   where id = p_listing_id;

  update public.agent_inventory
     set qty_reserved = qty_reserved - p_qty,
         updated_at = now()
   where id = v_inv.id;

  insert into public.gifts(
    sender_id, recipient_id, recipient_nickname_snapshot,
    inventory_id, agent_id, sku_id,
    qty, unit_price, unit_cost, total_price, total_cost,
    message, status
  ) values (
    v_sender, v_recipient_id, v_recipient_username,
    v_inv.id, v_inv.agent_id, v_inv.sku_id,
    p_qty, v_listing.unit_price, v_inv.unit_cost, v_total_price, v_total_cost,
    nullif(trim(coalesce(p_message, '')), ''), 'sent'
  ) returning id into v_gift_id;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, to_state, metadata)
  values (v_sender, 'gift', v_gift_id, 'gift_sent_from_listing', 'sent',
          jsonb_build_object(
            'recipient_id', v_recipient_id,
            'recipient_username', v_recipient_username,
            'listing_id', p_listing_id,
            'qty', p_qty,
            'total_price', v_total_price
          ));

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_recipient_id, 'gift_received',
          '선물이 도착했어요',
          format('%s매 선물이 도착했어요. 마일리지로 받거나 현물로 받아보세요.', p_qty),
          format('/account/gift?tab=inbox&gift=%s', v_gift_id));

  return v_gift_id;
end;
$$;

grant execute on function public.send_gift_from_listing(text, uuid, int, text) to authenticated;

comment on function public.send_gift_from_listing is
  '선물 발송 — 에이전트 listing 의 quantity_remaining 과 inventory.qty_reserved 를 함께 차감. 수령자는 username 기준.';

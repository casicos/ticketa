-- 0035_gift_from_listing.sql
--
-- 선물 발송이 에이전트 listing 의 quantity_remaining 도 차감하도록 통합.
--   - 에이전트가 보유 재고를 모두 listing 으로 묶었더라도 (qty_available=0) 선물 가능
--   - listing.quantity_remaining -= qty
--   - agent_inventory.qty_reserved -= qty  (listing 에서 해제)
--   - 나머지는 send_gift 와 동일: cash 차감, gifts insert, 수령자 알림
--
-- 부수: 카탈로그는 quantity_remaining > 0 만 노출이라 자동으로 hidden.

create or replace function public.send_gift_from_listing(
  p_recipient_nickname text,
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
  v_recipient_nickname text;
  v_total_price int;
  v_total_cost int;
  v_gift_id uuid;
begin
  if v_sender is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'INVALID_QTY'; end if;
  if p_recipient_nickname is null or length(trim(p_recipient_nickname)) = 0 then
    raise exception 'INVALID_RECIPIENT';
  end if;

  -- 수령자 매칭
  select id, nickname into v_recipient_id, v_recipient_nickname
    from public.users
   where nickname = trim(p_recipient_nickname)
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

  -- listing 의 inventory_id 추적
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

  -- 발송자 cash 차감
  perform public.debit_mileage(v_sender, v_total_price, 'gift_sent', null,
    format('선물 발송 (listing=%s) → %s', p_listing_id, v_recipient_nickname));

  -- listing 차감
  update public.listing
     set quantity_remaining = quantity_remaining - p_qty
   where id = p_listing_id;

  -- inventory.qty_reserved 차감 (listing 에서 해제 — 이 아이템들은 더 이상 listing 에 묶이지 않음)
  update public.agent_inventory
     set qty_reserved = qty_reserved - p_qty,
         updated_at = now()
   where id = v_inv.id;

  -- gifts insert
  insert into public.gifts(
    sender_id, recipient_id, recipient_nickname_snapshot,
    inventory_id, agent_id, sku_id,
    qty, unit_price, unit_cost, total_price, total_cost,
    message, status
  ) values (
    v_sender, v_recipient_id, v_recipient_nickname,
    v_inv.id, v_inv.agent_id, v_inv.sku_id,
    p_qty, v_listing.unit_price, v_inv.unit_cost, v_total_price, v_total_cost,
    nullif(trim(coalesce(p_message, '')), ''), 'sent'
  ) returning id into v_gift_id;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, to_state, metadata)
  values (v_sender, 'gift', v_gift_id, 'gift_sent_from_listing', 'sent',
          jsonb_build_object(
            'recipient_id', v_recipient_id,
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
  '선물 발송 — 에이전트 listing 의 quantity_remaining 과 inventory.qty_reserved 를 함께 차감하는 atomic RPC.';

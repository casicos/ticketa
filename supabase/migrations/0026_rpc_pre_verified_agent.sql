-- 0026_rpc_pre_verified_agent.sql
--
-- 시나리오 [1]·[3]·[4] 통합:
--   - purchase_listing: 모든 phone_verified 사용자 매입 가능 + pre_verified 매물은 verified 로 직행.
--   - create_agent_listing: 에이전트가 자기 inventory 한 건에서 listing 생성 (자동 [인증]).
--   - force_complete_listing: 어드민이 shipped → completed 강제 처리 (3일 자동완료 수동 버튼).
--   - listing 상태 변화에 따라 agent_inventory 의 reserved/available 자동 조정.

-- ---------------------------------------------------------------
-- 1) purchase_listing: 역할 제한 제거 + pre_verified 분기
-- ---------------------------------------------------------------
create or replace function public.purchase_listing(
  p_buyer uuid,
  p_listing uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
  v_sku record;
  v_balance int;
  v_gross int;
  v_commission int;
  v_seller_net int;
  v_now timestamptz := now();
  v_to_state text;
begin
  if p_buyer is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  -- 모든 phone_verified 회원이 매입 가능 (P2P 모델). 본인 매물만 차단.
  if not exists (
    select 1 from public.users
     where id = p_buyer and phone_verified = true
  ) then
    raise exception 'PHONE_UNVERIFIED';
  end if;

  select * into v_listing
    from public.listing
   where id = p_listing
   for update;

  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  if v_listing.status <> 'submitted' then
    raise exception 'INVALID_STATE: %', v_listing.status;
  end if;

  if v_listing.seller_id = p_buyer then
    raise exception 'SELF_PURCHASE_FORBIDDEN';
  end if;

  -- pre_verified 매물은 admin 검수가 끝났어야 매입 가능 (verified_at 세팅 확인).
  -- 단, 에이전트 매물은 inventory 단계에서 자동으로 verified_at 이 채워져 있다.
  if v_listing.pre_verified and v_listing.verified_at is null then
    raise exception 'PRE_VERIFICATION_PENDING';
  end if;

  select * into v_sku from public.sku where id = v_listing.sku_id;
  if not found then
    raise exception 'SKU_NOT_FOUND';
  end if;

  v_gross := v_listing.quantity_offered * v_listing.unit_price;

  if v_sku.commission_type = 'fixed' then
    v_commission := v_sku.commission_amount * v_listing.quantity_offered;
  else
    v_commission := (v_gross * v_sku.commission_amount) / 10000;
  end if;

  v_seller_net := v_gross - v_commission;

  select balance
    into v_balance
    from public.mileage_accounts
   where user_id = p_buyer
   for update;

  if v_balance is null or v_balance < v_gross then
    return jsonb_build_object(
      'ok', false,
      'code', 'SHORT_BALANCE',
      'needed', v_gross,
      'balance', coalesce(v_balance, 0),
      'shortage', v_gross - coalesce(v_balance, 0)
    );
  end if;

  perform public.debit_mileage(
    p_buyer,
    v_gross,
    'spend',
    p_listing,
    format('매입: listing=%s', p_listing)
  );

  -- pre_verified 면 receive/verify 단계 스킵하고 verified 로. 비-pre_verified 면 기존 'purchased'.
  if v_listing.pre_verified then
    v_to_state := 'verified';
    update public.listing
       set status = 'verified',
           buyer_id = p_buyer,
           purchased_at = v_now,
           received_at  = coalesce(received_at, v_now),
           verified_at  = coalesce(verified_at, v_now),
           commission_type = v_sku.commission_type,
           commission_amount = v_sku.commission_amount,
           commission_charged_to = v_sku.commission_charged_to,
           gross_amount = v_gross,
           commission_total = v_commission,
           seller_net_amount = v_seller_net
     where id = p_listing;
  else
    v_to_state := 'purchased';
    update public.listing
       set status = 'purchased',
           buyer_id = p_buyer,
           purchased_at = v_now,
           commission_type = v_sku.commission_type,
           commission_amount = v_sku.commission_amount,
           commission_charged_to = v_sku.commission_charged_to,
           gross_amount = v_gross,
           commission_total = v_commission,
           seller_net_amount = v_seller_net
     where id = p_listing;
  end if;

  insert into public.audit_events(
    actor_id, entity_type, entity_id, event, from_state, to_state, metadata
  ) values (
    p_buyer,
    'listing',
    p_listing,
    format('status_change:%s', v_to_state),
    'submitted',
    v_to_state,
    jsonb_build_object(
      'gross', v_gross,
      'commission', v_commission,
      'seller_net', v_seller_net,
      'pre_verified', v_listing.pre_verified
    )
  );

  -- 알림: pre_verified 면 admin 들에게 발송 대기, 비-pre_verified 면 판매자에게 인계 요청
  if v_listing.pre_verified then
    insert into public.notifications(user_id, kind, title, body, link_to)
    select u.id, 'listing_ready_to_ship',
           '발송 대기: 사전검수 매물',
           '매입 완료된 사전검수 매물입니다. 송장 입력 후 발송 처리해주세요.',
           '/admin/intake'
      from public.users u
      join public.user_roles ur on ur.user_id = u.id
     where ur.role = 'admin' and ur.revoked_at is null;
  else
    insert into public.notifications(user_id, kind, title, body, link_to)
    values (
      v_listing.seller_id,
      'listing_purchased',
      '매물이 매입됐어요',
      '실물을 안내받은 주소로 발송 후 인계 확인해주세요.',
      format('/sell/listings/%s', p_listing)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'listing_id', p_listing,
    'status', v_to_state,
    'gross', v_gross,
    'commission', v_commission,
    'seller_net', v_seller_net,
    'pre_verified', v_listing.pre_verified
  );
end;
$$;

grant execute on function public.purchase_listing(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------
-- 2) create_agent_listing: 에이전트 inventory 에서 listing 생성
-- ---------------------------------------------------------------
create or replace function public.create_agent_listing(
  p_agent uuid,
  p_inventory uuid,
  p_qty int,
  p_unit_price int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_listing_id uuid;
begin
  if p_agent is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.user_roles
     where user_id = p_agent
       and role = 'agent'
       and revoked_at is null
  ) then
    raise exception 'FORBIDDEN: agent role required';
  end if;

  if p_qty is null or p_qty < 1 then
    raise exception 'INVALID_QTY';
  end if;
  if p_unit_price is null or p_unit_price < 1000 then
    raise exception 'INVALID_PRICE';
  end if;

  select * into v_inv
    from public.agent_inventory
   where id = p_inventory and agent_id = p_agent
   for update;

  if not found then
    raise exception 'INVENTORY_NOT_FOUND';
  end if;

  if v_inv.qty_available < p_qty then
    raise exception 'INSUFFICIENT_INVENTORY: have=%, need=%', v_inv.qty_available, p_qty;
  end if;

  -- listing insert (자동 [인증]: pre_verified=true + verified_at=now)
  insert into public.listing(
    seller_id, sku_id, quantity_offered, quantity_remaining, unit_price,
    status, submitted_at, received_at, verified_at, pre_verified
  ) values (
    p_agent, v_inv.sku_id, p_qty, p_qty, p_unit_price,
    'submitted', now(), now(), now(), true
  )
  returning id into v_listing_id;

  -- inventory: available → reserved
  update public.agent_inventory
     set qty_available = qty_available - p_qty,
         qty_reserved = qty_reserved + p_qty,
         updated_at = now()
   where id = p_inventory;

  insert into public.audit_events(
    actor_id, entity_type, entity_id, event, to_state, metadata
  ) values (
    p_agent, 'listing', v_listing_id, 'agent_listing_created', 'submitted',
    jsonb_build_object('inventory_id', p_inventory, 'qty', p_qty, 'unit_price', p_unit_price)
  );

  return jsonb_build_object(
    'ok', true,
    'listing_id', v_listing_id
  );
end;
$$;

grant execute on function public.create_agent_listing(uuid, uuid, int, int) to authenticated;

-- ---------------------------------------------------------------
-- 3) force_complete_listing: 어드민이 shipped → completed 수동 처리
--    (3일 자동완료를 cron 대신 수동 버튼으로 운영)
-- ---------------------------------------------------------------
create or replace function public.force_complete_listing(
  p_admin uuid,
  p_listing uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
begin
  if p_admin is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.user_roles
     where user_id = p_admin
       and role = 'admin'
       and revoked_at is null
  ) then
    raise exception 'FORBIDDEN: admin role required';
  end if;

  select * into v_listing
    from public.listing
   where id = p_listing
   for update;

  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  if v_listing.status <> 'shipped' then
    raise exception 'INVALID_STATE: only shipped → completed allowed (got %)', v_listing.status;
  end if;

  -- complete_listing RPC 와 동일한 정산 흐름. p_buyer 는 자동완료라 admin 으로 actor_id 만 기록.
  perform public.complete_listing(
    coalesce(v_listing.buyer_id, p_admin),
    p_listing
  );

  insert into public.audit_events(
    actor_id, entity_type, entity_id, event, from_state, to_state, metadata
  ) values (
    p_admin, 'listing', p_listing, 'admin_force_complete', 'shipped', 'completed',
    jsonb_build_object('reason', '3일_자동완료_수동')
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.force_complete_listing(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------
-- 4) agent_inventory 자동 조정 트리거
--    listing 상태가 completed → reserved 와 available 동시에 차감
--    listing 상태가 cancelled → reserved 만 풀어서 available 로 복구
-- ---------------------------------------------------------------
create or replace function public._sync_agent_inventory_on_listing_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv_id uuid;
  v_qty int;
begin
  -- pre_verified=true + agent role 가 seller 인 listing 만 대상
  if new.status not in ('completed', 'cancelled') then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;

  -- 매칭되는 inventory row 찾기 (sku 동일, 가용 reserved 있음).
  -- agent_listing 생성 시 inventory_id 를 audit_events 에 metadata 로 남김 — 그것 이용.
  select (e.metadata->>'inventory_id')::uuid
    into v_inv_id
    from public.audit_events e
   where e.entity_type = 'listing'
     and e.entity_id = new.id
     and e.event = 'agent_listing_created'
   order by e.created_at asc
   limit 1;

  if v_inv_id is null then
    return new;  -- agent_inventory 와 무관한 listing
  end if;

  v_qty := new.quantity_offered;

  if new.status = 'completed' then
    update public.agent_inventory
       set qty_reserved = greatest(qty_reserved - v_qty, 0),
           updated_at = now()
     where id = v_inv_id;
  elsif new.status = 'cancelled' then
    update public.agent_inventory
       set qty_reserved = greatest(qty_reserved - v_qty, 0),
           qty_available = qty_available + v_qty,
           updated_at = now()
     where id = v_inv_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_agent_inventory on public.listing;
create trigger trg_sync_agent_inventory
  after update of status on public.listing
  for each row
  execute function public._sync_agent_inventory_on_listing_change();

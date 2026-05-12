-- 0033_partial_purchase.sql
--
-- 부분 매입(split-at-purchase) 도입.
--   - listing.parent_listing_id 추가: 자식 listing 이 부모를 참조
--   - purchase_listing(p_buyer, p_listing, p_qty) — 부분 매입 RPC
--       * 부모 listing 에서 p_qty 만큼 떼서 새 child listing 을 생성하고 매입 처리
--       * 부모 quantity_remaining -= p_qty, 0 도달 시 부모 'completed'(sold_out)
--       * 부모.pre_verified 면 자식 즉시 'verified', 아니면 'purchased'
--   - _sync_agent_inventory_on_listing_change 갱신:
--       * 자식 listing 도 부모의 inventory_id 를 audit_events 통해 추적
--   - 기존 2-arg purchase_listing(p_buyer, p_listing) 는 호환 wrapper (전량 매입)
--
-- ---------------------------------------------------------------

-- 1) parent_listing_id 컬럼
alter table public.listing
  add column if not exists parent_listing_id uuid references public.listing(id) on delete restrict;

create index if not exists ix_listing_parent
  on public.listing(parent_listing_id)
  where parent_listing_id is not null;

-- 2) 새 3-arg purchase_listing
create or replace function public.purchase_listing(
  p_buyer uuid,
  p_listing uuid,
  p_qty int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent record;
  v_sku record;
  v_balance int;
  v_gross int;
  v_commission int;
  v_seller_net int;
  v_now timestamptz := now();
  v_child_id uuid;
  v_child_status text;
  v_parent_inv_id uuid;
  v_remaining_after int;
begin
  if p_buyer is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_qty is null or p_qty < 1 then
    raise exception 'INVALID_QTY';
  end if;

  if not exists (
    select 1 from public.users where id = p_buyer and phone_verified = true
  ) then
    raise exception 'PHONE_UNVERIFIED';
  end if;

  select * into v_parent
    from public.listing
   where id = p_listing
   for update;

  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  if v_parent.status <> 'submitted' then
    raise exception 'INVALID_STATE: %', v_parent.status;
  end if;

  if v_parent.seller_id = p_buyer then
    raise exception 'SELF_PURCHASE_FORBIDDEN';
  end if;

  if v_parent.quantity_remaining < p_qty then
    raise exception 'INSUFFICIENT_QUANTITY: have=%, need=%', v_parent.quantity_remaining, p_qty;
  end if;

  if v_parent.pre_verified and v_parent.verified_at is null then
    raise exception 'PRE_VERIFICATION_PENDING';
  end if;

  if v_parent.parent_listing_id is not null then
    raise exception 'CANNOT_PURCHASE_CHILD';
  end if;

  select * into v_sku from public.sku where id = v_parent.sku_id;
  if not found then
    raise exception 'SKU_NOT_FOUND';
  end if;

  v_gross := p_qty * v_parent.unit_price;

  if v_sku.commission_type = 'fixed' then
    v_commission := v_sku.commission_amount * p_qty;
  else
    v_commission := (v_gross * v_sku.commission_amount) / 10000;
  end if;

  v_seller_net := v_gross - v_commission;

  select balance into v_balance
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
    p_buyer, v_gross, 'spend', p_listing,
    format('매입: listing=% qty=%s', p_listing, p_qty)
  );

  -- 자식 listing 생성 — 부모의 검수상태 이어받음
  if v_parent.pre_verified then
    v_child_status := 'verified';
  else
    v_child_status := 'purchased';
  end if;

  insert into public.listing(
    parent_listing_id, seller_id, sku_id,
    quantity_offered, quantity_remaining, unit_price,
    status, submitted_at, purchased_at, received_at, verified_at,
    buyer_id, pre_verified,
    commission_type, commission_amount, commission_charged_to,
    gross_amount, commission_total, seller_net_amount
  ) values (
    p_listing, v_parent.seller_id, v_parent.sku_id,
    p_qty, p_qty, v_parent.unit_price,
    v_child_status, v_now, v_now,
    case when v_parent.pre_verified then v_now else null end,
    case when v_parent.pre_verified then v_now else null end,
    p_buyer, v_parent.pre_verified,
    v_sku.commission_type, v_sku.commission_amount, v_sku.commission_charged_to,
    v_gross, v_commission, v_seller_net
  )
  returning id into v_child_id;

  -- 부모 quantity_remaining 차감. 0 이 되어도 부모는 'submitted' 유지 (상태머신/트리거는 자식 단위).
  --   카탈로그는 quantity_remaining > 0 만 노출하므로 자동으로 사라짐.
  v_remaining_after := v_parent.quantity_remaining - p_qty;
  update public.listing
     set quantity_remaining = v_remaining_after
   where id = p_listing;

  -- 부모가 에이전트 매물이면 자식에도 inventory_id 메타 복사 → 트리거가 inventory 추적
  select (e.metadata->>'inventory_id')::uuid into v_parent_inv_id
    from public.audit_events e
   where e.entity_type = 'listing'
     and e.entity_id = p_listing
     and e.event = 'agent_listing_created'
   order by e.created_at asc
   limit 1;

  if v_parent_inv_id is not null then
    insert into public.audit_events(actor_id, entity_type, entity_id, event, to_state, metadata)
    values (
      p_buyer, 'listing', v_child_id, 'agent_listing_created', v_child_status,
      jsonb_build_object(
        'inventory_id', v_parent_inv_id,
        'parent_listing_id', p_listing,
        'qty', p_qty,
        'unit_price', v_parent.unit_price
      )
    );
  end if;

  -- 자식 listing 상태전이 감사
  insert into public.audit_events(
    actor_id, entity_type, entity_id, event, from_state, to_state, metadata
  ) values (
    p_buyer, 'listing', v_child_id,
    format('status_change:%s', v_child_status),
    'submitted', v_child_status,
    jsonb_build_object(
      'parent_listing_id', p_listing,
      'gross', v_gross,
      'commission', v_commission,
      'seller_net', v_seller_net,
      'pre_verified', v_parent.pre_verified,
      'qty', p_qty
    )
  );

  -- 부모 매진 시 별도 감사 (status 변화는 없음 — 카탈로그 필터로 자동 hidden)
  if v_remaining_after = 0 then
    insert into public.audit_events(
      actor_id, entity_type, entity_id, event, from_state, to_state, metadata
    ) values (
      p_buyer, 'listing', p_listing, 'parent_sold_out', 'submitted', 'submitted',
      jsonb_build_object('total_qty', v_parent.quantity_offered)
    );
  end if;

  -- 알림
  if v_parent.pre_verified then
    insert into public.notifications(user_id, kind, title, body, link_to)
    select u.id, 'listing_ready_to_ship',
           '발송 대기: 사전검수 매물',
           format('매입 완료 — %s매. 송장 입력 후 발송 처리해주세요.', p_qty),
           '/admin/intake'
      from public.users u
      join public.user_roles ur on ur.user_id = u.id
     where ur.role = 'admin' and ur.revoked_at is null;
  else
    insert into public.notifications(user_id, kind, title, body, link_to)
    values (
      v_parent.seller_id, 'listing_purchased',
      '매물이 매입됐어요',
      format('%s매가 매입됐어요. 실물 인계 후 인계 확인 처리해주세요.', p_qty),
      format('/sell/listings/%s', v_child_id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'listing_id', v_child_id,
    'parent_listing_id', p_listing,
    'status', v_child_status,
    'qty', p_qty,
    'gross', v_gross,
    'commission', v_commission,
    'seller_net', v_seller_net,
    'pre_verified', v_parent.pre_verified,
    'parent_remaining', v_remaining_after
  );
end;
$$;

grant execute on function public.purchase_listing(uuid, uuid, int) to authenticated;

-- 3) 기존 2-arg signature 호환 wrapper — 전량 매입으로 위임
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
  v_remaining int;
begin
  select quantity_remaining into v_remaining
    from public.listing where id = p_listing;
  if v_remaining is null then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  return public.purchase_listing(p_buyer, p_listing, v_remaining);
end;
$$;

grant execute on function public.purchase_listing(uuid, uuid) to authenticated;

-- 4) 동기 트리거 — 자식 listing 도 inventory 추적 가능하게 (audit_events 의 'agent_listing_created' 가
--    부모뿐 아니라 자식에도 기록되므로 기존 트리거가 그대로 동작). 다만 quantity_offered 가 자식 단위라
--    decrement 도 자식 quantity_offered 만큼만 일어남. 정상.
--
-- 변경 없음 — 기존 _sync_agent_inventory_on_listing_change 가 audit_events 의 inventory_id 메타를
-- 자식에서도 찾을 수 있어 자동으로 동작.

comment on column public.listing.parent_listing_id is
  '분할 매입(split-at-purchase) 시 자식 listing 이 부모를 참조. 부모는 카탈로그 노출 단위, 자식은 구매자별 상태머신 단위.';

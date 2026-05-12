-- 0027_gifts.sql
--
-- 시나리오 [2] 선물 인프라.
--   shipping_addresses              — 사용자 배송지 (현물 수령용)
--   gifts                           — 선물 거래 본체
--   RPC send_gift                   — 발송자 cash 차감 + agent_inventory.qty_available 감소
--   RPC claim_gift_mileage          — 수령자 cash credit, agent_inventory 복구 (조용히 환원)
--   RPC claim_gift_delivery         — 현물 배송 선택, admin 발송 큐에 진입
--   RPC ship_gift                   — admin 송장 입력 → shipped
--   RPC complete_gift               — admin/자동 완료 → 에이전트 unit_cost 정산
--   RPC refund_gift                 — sender 환불 + agent_inventory 복구 (sent/claimed_delivery 단계만)
--   RPC expire_gift                 — admin 수동 만료 (7일 미수령 등) — refund_gift 와 동일 효과
--
-- 정산 정책 요약:
--   - 발송자 cash 차감: 액면가 unit_price * qty
--   - 마일리지 수령: 수령자 cash + unit_price * qty, agent_inventory 복구 (플랫폼 수익 0)
--   - 현물 수령 완료: 에이전트 cash + unit_cost * qty (플랫폼 수익 = unit_price - unit_cost)
--   - 환불/만료: 발송자 cash + unit_price * qty, agent_inventory 복구

-- ---------------------------------------------------------------------------
-- 1. shipping_addresses
-- ---------------------------------------------------------------------------
create table if not exists public.shipping_addresses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    label text,
    recipient_name text not null,
    recipient_phone text not null,
    postal_code text not null,
    address1 text not null,
    address2 text,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_shipping_addresses_user
  on public.shipping_addresses (user_id);

-- 한 사용자당 default 1개만
create unique index if not exists ux_shipping_addresses_default
  on public.shipping_addresses (user_id)
  where is_default = true;

alter table public.shipping_addresses enable row level security;

drop policy if exists shipping_addresses_self_all on public.shipping_addresses;
create policy shipping_addresses_self_all on public.shipping_addresses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists shipping_addresses_admin_select on public.shipping_addresses;
create policy shipping_addresses_admin_select on public.shipping_addresses
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
        and user_roles.revoked_at is null
    )
  );

comment on table public.shipping_addresses is
  '사용자 배송지. 선물 현물 수령 시 선택. 1인 N개, default 1개.';

-- ---------------------------------------------------------------------------
-- 2. gifts
-- ---------------------------------------------------------------------------
create table if not exists public.gifts (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references public.users(id) on delete restrict,
    recipient_id uuid not null references public.users(id) on delete restrict,
    recipient_nickname_snapshot text not null,   -- 보낼 당시 닉네임 (사후 변경 대비)
    inventory_id uuid not null references public.agent_inventory(id) on delete restrict,
    agent_id uuid not null references public.users(id) on delete restrict, -- 조회 편의
    sku_id uuid not null references public.sku(id),
    qty integer not null check (qty >= 1),
    unit_price integer not null check (unit_price >= 0),     -- 액면가 (사용자에게 노출되는 금액)
    unit_cost integer not null check (unit_cost >= 0),       -- 위탁 단가 (정산용, 사용자 비노출)
    total_price integer not null check (total_price >= 0),   -- qty * unit_price
    total_cost integer not null check (total_cost >= 0),     -- qty * unit_cost (참고용)
    message text,
    status text not null default 'sent'
      check (status in ('sent', 'claimed_mileage', 'claimed_delivery', 'shipped', 'completed', 'refunded', 'expired')),
    shipping_address_id uuid references public.shipping_addresses(id) on delete set null,
    shipping_carrier text,
    tracking_no text,
    admin_memo text,
    sent_at timestamptz not null default now(),
    claimed_at timestamptz,
    shipped_at timestamptz,
    completed_at timestamptz,
    refunded_at timestamptz,
    expires_at timestamptz not null default (now() + interval '7 days'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_gifts_recipient_status
  on public.gifts (recipient_id, status);

create index if not exists ix_gifts_sender_status
  on public.gifts (sender_id, status);

create index if not exists ix_gifts_admin_queue
  on public.gifts (status, claimed_at)
  where status = 'claimed_delivery';

alter table public.gifts enable row level security;

-- 본인 (sender or recipient) 조회 가능
drop policy if exists gifts_self_select on public.gifts;
create policy gifts_self_select on public.gifts
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- admin 전체 조회·갱신
drop policy if exists gifts_admin_all on public.gifts;
create policy gifts_admin_all on public.gifts
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
        and user_roles.revoked_at is null
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
        and user_roles.revoked_at is null
    )
  );

comment on table public.gifts is
  '선물 거래. 에이전트 매물에서 출발 — agent_inventory 의 qty_available 을 차감해 선물을 만든다.';

-- ---------------------------------------------------------------------------
-- 3. RPC send_gift
-- ---------------------------------------------------------------------------
create or replace function public.send_gift(
  p_recipient_nickname text,
  p_inventory_id uuid,
  p_qty int,
  p_message text,
  p_unit_price int
) returns uuid
language plpgsql security definer as $$
declare
  v_sender uuid := auth.uid();
  v_recipient_id uuid;
  v_recipient_nickname text;
  v_inv record;
  v_total_price int;
  v_total_cost int;
  v_gift_id uuid;
begin
  if v_sender is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'INVALID_QTY'; end if;
  if p_unit_price is null or p_unit_price <= 0 then raise exception 'INVALID_PRICE'; end if;
  if p_recipient_nickname is null or length(trim(p_recipient_nickname)) = 0 then
    raise exception 'INVALID_RECIPIENT';
  end if;

  -- 수령자 닉네임 → user 매칭
  select id, nickname into v_recipient_id, v_recipient_nickname
    from public.users
   where nickname = trim(p_recipient_nickname)
   limit 1;
  if v_recipient_id is null then
    raise exception 'RECIPIENT_NOT_FOUND';
  end if;
  if v_recipient_id = v_sender then
    raise exception 'SELF_GIFT_FORBIDDEN';
  end if;

  -- 재고 잠금 (qty_available 차감)
  select id, agent_id, sku_id, qty_available, unit_cost
    into v_inv
    from public.agent_inventory
   where id = p_inventory_id
   for update;
  if v_inv.id is null then raise exception 'INVENTORY_NOT_FOUND'; end if;
  if v_inv.qty_available < p_qty then raise exception 'INVENTORY_INSUFFICIENT'; end if;

  v_total_price := p_qty * p_unit_price;
  v_total_cost := p_qty * v_inv.unit_cost;

  -- 발송자 cash 차감
  perform public.debit_mileage(v_sender, v_total_price, 'gift_sent', null, format('선물 발송 → %s', v_recipient_nickname));

  -- 재고 차감
  update public.agent_inventory
     set qty_available = qty_available - p_qty,
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
    p_qty, p_unit_price, v_inv.unit_cost, v_total_price, v_total_cost,
    nullif(trim(coalesce(p_message, '')), ''), 'sent'
  ) returning id into v_gift_id;

  -- 감사 로그
  insert into public.audit_events(actor_id, entity_type, entity_id, event, to_state, metadata)
  values (v_sender, 'gift', v_gift_id, 'gift_sent', 'sent',
          jsonb_build_object('recipient_id', v_recipient_id, 'qty', p_qty, 'total_price', v_total_price));

  -- 수령자 알림
  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_recipient_id, 'gift_received',
          '선물이 도착했어요',
          format('%s매 선물이 도착했어요. 마일리지로 받거나 현물로 받아보세요.', p_qty),
          format('/account/gift?tab=inbox&gift=%s', v_gift_id));

  return v_gift_id;
end;
$$;

grant execute on function public.send_gift(text, uuid, int, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC claim_gift_mileage
-- ---------------------------------------------------------------------------
create or replace function public.claim_gift_mileage(p_gift_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_gift record;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_gift from public.gifts where id = p_gift_id for update;
  if v_gift.id is null then raise exception 'GIFT_NOT_FOUND'; end if;
  if v_gift.recipient_id <> v_uid then raise exception 'NOT_RECIPIENT'; end if;
  if v_gift.status <> 'sent' then raise exception 'NOT_CLAIMABLE: status=%', v_gift.status; end if;

  -- 수령자 cash credit (액면가)
  perform public.credit_mileage(v_uid, v_gift.total_price, 'gift_claim_mileage', 'cash', null, null, null,
                                format('선물 마일리지 수령 (%s매)', v_gift.qty));

  -- agent_inventory 복구 (재고 환원)
  update public.agent_inventory
     set qty_available = qty_available + v_gift.qty,
         updated_at = now()
   where id = v_gift.inventory_id;

  update public.gifts
     set status = 'claimed_mileage',
         claimed_at = now(),
         updated_at = now()
   where id = v_gift.id;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (v_uid, 'gift', v_gift.id, 'gift_claim_mileage', v_gift.status, 'claimed_mileage',
          jsonb_build_object('credited', v_gift.total_price));
end;
$$;

grant execute on function public.claim_gift_mileage(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC claim_gift_delivery
-- ---------------------------------------------------------------------------
create or replace function public.claim_gift_delivery(p_gift_id uuid, p_address_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_gift record;
  v_addr record;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_gift from public.gifts where id = p_gift_id for update;
  if v_gift.id is null then raise exception 'GIFT_NOT_FOUND'; end if;
  if v_gift.recipient_id <> v_uid then raise exception 'NOT_RECIPIENT'; end if;
  if v_gift.status <> 'sent' then raise exception 'NOT_CLAIMABLE: status=%', v_gift.status; end if;

  select id, user_id into v_addr from public.shipping_addresses where id = p_address_id;
  if v_addr.id is null then raise exception 'ADDRESS_NOT_FOUND'; end if;
  if v_addr.user_id <> v_uid then raise exception 'ADDRESS_NOT_OWNED'; end if;

  update public.gifts
     set status = 'claimed_delivery',
         shipping_address_id = p_address_id,
         claimed_at = now(),
         updated_at = now()
   where id = v_gift.id;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (v_uid, 'gift', v_gift.id, 'gift_claim_delivery', v_gift.status, 'claimed_delivery',
          jsonb_build_object('address_id', p_address_id));

  -- admin 큐 알림은 별도 채널/대시보드에서 처리
end;
$$;

grant execute on function public.claim_gift_delivery(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC ship_gift (admin)
-- ---------------------------------------------------------------------------
create or replace function public.ship_gift(
  p_gift_id uuid,
  p_carrier text,
  p_tracking_no text,
  p_admin_memo text
) returns void
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_gift record;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select exists(
    select 1 from public.user_roles
    where user_id = v_uid and role = 'admin' and revoked_at is null
  ) into v_is_admin;
  if not v_is_admin then raise exception 'ADMIN_REQUIRED'; end if;

  select * into v_gift from public.gifts where id = p_gift_id for update;
  if v_gift.id is null then raise exception 'GIFT_NOT_FOUND'; end if;
  if v_gift.status <> 'claimed_delivery' then raise exception 'NOT_SHIPPABLE: status=%', v_gift.status; end if;
  if p_carrier is null or length(trim(p_carrier)) = 0 then raise exception 'CARRIER_REQUIRED'; end if;
  if p_tracking_no is null or length(trim(p_tracking_no)) = 0 then raise exception 'TRACKING_REQUIRED'; end if;

  update public.gifts
     set status = 'shipped',
         shipping_carrier = p_carrier,
         tracking_no = p_tracking_no,
         admin_memo = nullif(trim(coalesce(p_admin_memo, '')), ''),
         shipped_at = now(),
         updated_at = now()
   where id = v_gift.id;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (v_uid, 'gift', v_gift.id, 'gift_shipped', v_gift.status, 'shipped',
          jsonb_build_object('carrier', p_carrier, 'tracking_no', p_tracking_no));

  -- 수령자 알림
  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_gift.recipient_id, 'gift_shipped',
          '선물이 발송됐어요',
          format('%s · 운송장 %s · 도착까지 1~3일 소요', p_carrier, p_tracking_no),
          format('/account/gift?tab=inbox&gift=%s', v_gift.id));
end;
$$;

grant execute on function public.ship_gift(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RPC complete_gift (admin / 자동)
-- ---------------------------------------------------------------------------
create or replace function public.complete_gift(p_gift_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_gift record;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select exists(
    select 1 from public.user_roles
    where user_id = v_uid and role = 'admin' and revoked_at is null
  ) into v_is_admin;
  if not v_is_admin then raise exception 'ADMIN_REQUIRED'; end if;

  select * into v_gift from public.gifts where id = p_gift_id for update;
  if v_gift.id is null then raise exception 'GIFT_NOT_FOUND'; end if;
  if v_gift.status <> 'shipped' then raise exception 'NOT_COMPLETABLE: status=%', v_gift.status; end if;

  -- 에이전트 cash 정산
  perform public.credit_mileage(v_gift.agent_id, v_gift.total_cost, 'gift_settlement', 'cash',
                                null, null, null,
                                format('선물 현물 발송 정산 (%s매, 단가 %s원)', v_gift.qty, v_gift.unit_cost));

  update public.gifts
     set status = 'completed',
         completed_at = now(),
         updated_at = now()
   where id = v_gift.id;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (v_uid, 'gift', v_gift.id, 'gift_completed', v_gift.status, 'completed',
          jsonb_build_object('agent_credited', v_gift.total_cost));

  -- 에이전트 알림
  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_gift.agent_id, 'gift_settled',
          '선물 정산 완료',
          format('현물 발송 선물 %s매 정산이 완료됐어요 (+%s 마일리지)',
                 v_gift.qty, to_char(v_gift.total_cost, 'FM999,999,999,999')),
          '/agent/settlements');
end;
$$;

grant execute on function public.complete_gift(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. RPC refund_gift / expire_gift  — 동일 효과, 호출 권한만 분리
-- ---------------------------------------------------------------------------
create or replace function public._do_refund_gift(p_gift_id uuid, p_reason text, p_actor uuid)
returns void
language plpgsql security definer as $$
declare
  v_gift record;
begin
  select * into v_gift from public.gifts where id = p_gift_id for update;
  if v_gift.id is null then raise exception 'GIFT_NOT_FOUND'; end if;
  if v_gift.status not in ('sent', 'claimed_delivery') then
    raise exception 'NOT_REFUNDABLE: status=%', v_gift.status;
  end if;

  -- 발송자 cash 환불
  perform public.credit_mileage(v_gift.sender_id, v_gift.total_price, 'gift_refund', 'cash',
                                null, null, null,
                                format('선물 %s — %s', p_reason, v_gift.recipient_nickname_snapshot));

  -- agent_inventory 복구
  update public.agent_inventory
     set qty_available = qty_available + v_gift.qty,
         updated_at = now()
   where id = v_gift.inventory_id;

  update public.gifts
     set status = case when p_reason = 'expired' then 'expired' else 'refunded' end,
         refunded_at = now(),
         updated_at = now()
   where id = v_gift.id;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (p_actor, 'gift', v_gift.id,
          case when p_reason = 'expired' then 'gift_expired' else 'gift_refunded' end,
          v_gift.status,
          case when p_reason = 'expired' then 'expired' else 'refunded' end,
          jsonb_build_object('refunded', v_gift.total_price, 'reason', p_reason));

  -- 발송자 알림
  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_gift.sender_id,
          case when p_reason = 'expired' then 'gift_expired' else 'gift_refunded' end,
          case when p_reason = 'expired' then '선물 만료 환불' else '선물 환불 처리됨' end,
          format('%s매 · %s원이 마일리지로 환불됐어요', v_gift.qty,
                 to_char(v_gift.total_price, 'FM999,999,999,999')),
          '/account/gift?tab=outbox');
end;
$$;

create or replace function public.refund_gift(p_gift_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_gift record;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select exists(
    select 1 from public.user_roles
    where user_id = v_uid and role = 'admin' and revoked_at is null
  ) into v_is_admin;

  select * into v_gift from public.gifts where id = p_gift_id;
  if v_gift.id is null then raise exception 'GIFT_NOT_FOUND'; end if;

  -- 발송자 본인 또는 admin 만 환불 가능, sent 상태만
  if not v_is_admin then
    if v_gift.sender_id <> v_uid then raise exception 'FORBIDDEN'; end if;
    if v_gift.status <> 'sent' then raise exception 'SENDER_REFUND_ONLY_FROM_SENT'; end if;
  end if;

  perform public._do_refund_gift(p_gift_id, 'refunded', v_uid);
end;
$$;

grant execute on function public.refund_gift(uuid) to authenticated;

create or replace function public.expire_gift(p_gift_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select exists(
    select 1 from public.user_roles
    where user_id = v_uid and role = 'admin' and revoked_at is null
  ) into v_is_admin;
  if not v_is_admin then raise exception 'ADMIN_REQUIRED'; end if;

  perform public._do_refund_gift(p_gift_id, 'expired', v_uid);
end;
$$;

grant execute on function public.expire_gift(uuid) to authenticated;

comment on function public.send_gift is '선물 발송 — 발송자 cash 차감 + agent_inventory.qty_available 차감 + gift 생성 + 수령자 알림';
comment on function public.claim_gift_mileage is '선물 마일리지 수령 — 수령자 cash credit + agent_inventory 환원 (재고 사용 안 함)';
comment on function public.claim_gift_delivery is '선물 현물 배송 선택 — admin 큐로 진입';
comment on function public.ship_gift is '관리자 발송 처리 — 송장번호 입력';
comment on function public.complete_gift is '관리자 발송 완료 — 에이전트 단가 정산';
comment on function public.refund_gift is '환불 — sent 단계는 발송자 self, 그 외는 admin (claimed_delivery 까지)';
comment on function public.expire_gift is '관리자 수동 만료 — 7일 미수령 등 정책 처리';

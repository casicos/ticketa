-- 0001_init.sql
-- Ticketa MVP — 초기 스키마
-- 참조: .omc/plans/b2c-giftcard-broker-mvp.md Section 6
--
-- 원칙
--   * 모든 금액은 정수 KRW (float 금지)
--   * 계좌번호는 pgcrypto 로 암호화 저장
--   * 모든 상태 전이는 public.audit_events 에 기록
--   * 역할 부여/회수는 public.user_roles 에 append-only

create extension if not exists citext;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- 식별 / 회원
-- ------------------------------------------------------------------

create table if not exists public.users (
    id uuid primary key,
    email citext unique,
    phone text,
    phone_verified boolean not null default false,
    full_name text not null default '',
    nickname text,
    marketing_opt_in boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint users_id_fk_auth foreign key (id) references auth.users(id) on delete cascade
);

create table if not exists public.user_roles (
    user_id uuid not null references public.users(id) on delete cascade,
    role text not null check (role in ('seller','agent','admin')),
    granted_by uuid references public.users(id),
    granted_at timestamptz not null default now(),
    revoked_at timestamptz,
    primary key (user_id, role, granted_at)
);

-- 활성 역할은 (user_id, role) 당 최대 1개 (revoked_at IS NULL)
create unique index if not exists ux_user_roles_active
    on public.user_roles (user_id, role)
    where revoked_at is null;

-- ------------------------------------------------------------------
-- 판매자 정산 계좌 (pgp_sym_encrypt 로 저장)
-- ------------------------------------------------------------------

create table if not exists public.seller_payout_accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    bank_code text not null,
    account_number_encrypted bytea not null,
    account_number_last4 text not null,
    account_holder text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 활성 계좌는 사용자당 최대 1개
create unique index if not exists ux_payout_active
    on public.seller_payout_accounts (user_id)
    where is_active;

-- ------------------------------------------------------------------
-- 상품 카탈로그 (SKU)
-- ------------------------------------------------------------------

create table if not exists public.sku (
    id uuid primary key default gen_random_uuid(),
    brand text not null,
    denomination integer not null check (denomination > 0),
    display_name text generated always as (brand || ' ' || denomination::text || '원권') stored,
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (brand, denomination)
);

-- ------------------------------------------------------------------
-- 수탁 재고 (Listing)
-- ------------------------------------------------------------------

create table if not exists public.listing (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references public.users(id),
    sku_id uuid not null references public.sku(id),
    quantity_offered integer not null check (quantity_offered >= 1),
    quantity_remaining integer not null,
    unit_price integer not null check (unit_price >= 1000),
    status text not null check (status in ('submitted','received','verified','listed','sold_out','cancelled')),
    submitted_at timestamptz not null default now(),
    received_at timestamptz,
    verified_at timestamptz,
    listed_at timestamptz,
    closed_at timestamptz,
    cancelled_at timestamptz,
    cancelled_by uuid references public.users(id),
    cancel_reason text,
    admin_memo text,
    constraint listing_qty_remaining_bounds
        check (quantity_remaining >= 0 and quantity_remaining <= quantity_offered)
);

create index if not exists ix_listing_sku_status
    on public.listing (sku_id, status)
    where status = 'listed';

create index if not exists ix_listing_seller
    on public.listing (seller_id);

-- ------------------------------------------------------------------
-- 주문 (에이전트 매입)
-- ------------------------------------------------------------------

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    buyer_id uuid not null references public.users(id),
    total_amount integer not null check (total_amount >= 0),
    status text not null check (status in ('pending_payment','payment_confirmed','shipped','delivered','cancelled','disputed')),
    payment_due_at timestamptz,
    payment_confirmed_at timestamptz,
    shipped_at timestamptz,
    delivered_at timestamptz,
    cancelled_at timestamptz,
    cancel_reason text,
    shipping_address jsonb not null,
    admin_memo text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_orders_buyer_created
    on public.orders (buyer_id, created_at desc);

create index if not exists ix_orders_status
    on public.orders (status);

-- ------------------------------------------------------------------
-- 주문 아이템 (order ↔ listing 다대일)
-- ------------------------------------------------------------------

create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    listing_id uuid not null references public.listing(id),
    sku_id uuid not null references public.sku(id),                -- snapshot
    seller_id uuid not null references public.users(id),           -- snapshot
    quantity integer not null check (quantity >= 1),
    unit_price integer not null check (unit_price >= 0),           -- snapshot
    commission_per_unit integer not null default 400 check (commission_per_unit >= 0), -- snapshot
    subtotal integer generated always as (quantity * unit_price) stored,
    status text not null default 'pending'
        check (status in ('pending','fulfilled','cancelled_item','refunded')),
    fulfilled_at timestamptz,
    cancelled_at timestamptz,
    cancel_reason text
);

create index if not exists ix_order_items_order on public.order_items (order_id);
create index if not exists ix_order_items_listing on public.order_items (listing_id);
create index if not exists ix_order_items_seller on public.order_items (seller_id);

-- ------------------------------------------------------------------
-- 정산
-- ------------------------------------------------------------------

create table if not exists public.payouts (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references public.users(id),
    order_item_id uuid not null unique references public.order_items(id),
    gross_amount integer not null check (gross_amount >= 0),
    commission_amount integer not null check (commission_amount >= 0),
    net_amount integer generated always as (gross_amount - commission_amount) stored,
    status text not null default 'pending' check (status in ('pending','released','held')),
    released_at timestamptz,
    released_by uuid references public.users(id),
    bank_code text,                     -- 생성 시점 스냅샷
    account_number_last4 text,          -- 생성 시점 스냅샷 (전체 저장 금지)
    admin_memo text,
    created_at timestamptz not null default now()
);

create index if not exists ix_payouts_seller on public.payouts (seller_id);
create index if not exists ix_payouts_status on public.payouts (status);

-- ------------------------------------------------------------------
-- 감사 로그
-- ------------------------------------------------------------------

create table if not exists public.audit_events (
    id bigserial primary key,
    actor_id uuid,                     -- null = 시스템
    entity_type text not null,
    entity_id uuid,
    event text not null,               -- 'status_change:received', 'stock_restored' ...
    from_state text,
    to_state text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists ix_audit_entity
    on public.audit_events (entity_type, entity_id, created_at desc);

-- 민감 정보 접근 로그 (계좌번호 전체 복호화 조회 등)
create table if not exists public.sensitive_access_log (
    id bigserial primary key,
    actor_id uuid not null,
    resource_type text not null,
    resource_id uuid,
    access_kind text not null,         -- 'decrypt_account_number', ...
    reason text not null,              -- 필수 입력
    created_at timestamptz not null default now()
);

create index if not exists ix_sal_actor_created
    on public.sensitive_access_log (actor_id, created_at desc);

-- 에러 로그 (Sentry 중단 시 폴백, Supabase 로그 1일 한도 보완)
create table if not exists public.error_log (
    id bigserial primary key,
    actor_id uuid,
    route text,
    server_action text,
    error_code text,
    message text,
    stack text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists ix_error_log_created
    on public.error_log (created_at desc);

-- ------------------------------------------------------------------
-- 알림
-- ------------------------------------------------------------------

create table if not exists public.notifications (
    id bigserial primary key,
    user_id uuid not null references public.users(id) on delete cascade,
    kind text not null,
    title text not null,
    body text,
    link_to text,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists ix_notifications_user_unread
    on public.notifications (user_id, created_at desc)
    where read_at is null;

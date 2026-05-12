-- 0002_rls_policies.sql
-- Row Level Security 스켈레톤.
-- 참조: .omc/plans/b2c-giftcard-broker-mvp.md Section 4.4 / Principle 5
--
-- admin 여부는 JWT claim (app_metadata.roles) 에 캐싱된 역할 배열로 판단한다.
--   auth.jwt() -> 'app_metadata' -> 'roles' 이 JSON array 인 경우
--     coalesce(( ... )::jsonb ? 'admin', false)
--
-- 주의
--   * 'for all' 정책은 select/insert/update/delete 4 가지 전부에 적용된다.
--   * 중복되는 USING/WITH CHECK 를 사용하기 위해 별도의 select/update 정책을
--     쪼개는 대신 명시적으로 role 분기를 JWT 로만 검증한다.

-- ------------------------------------------------------------------
-- enable rls
-- ------------------------------------------------------------------

alter table public.users                    enable row level security;
alter table public.user_roles               enable row level security;
alter table public.seller_payout_accounts   enable row level security;
alter table public.sku                      enable row level security;
alter table public.listing                  enable row level security;
alter table public.orders                   enable row level security;
alter table public.order_items              enable row level security;
alter table public.payouts                  enable row level security;
alter table public.audit_events             enable row level security;
alter table public.sensitive_access_log     enable row level security;
alter table public.error_log                enable row level security;
alter table public.notifications            enable row level security;

-- ------------------------------------------------------------------
-- users: 본인 것만
-- ------------------------------------------------------------------

create policy users_self_select on public.users
    for select using (id = auth.uid());

create policy users_self_update on public.users
    for update using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------------
-- user_roles: 본인 조회 가능, 수정은 admin 만
-- ------------------------------------------------------------------

create policy user_roles_self_read on public.user_roles
    for select using (user_id = auth.uid());

create policy user_roles_admin_all on public.user_roles
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- seller_payout_accounts: 본인만
-- ------------------------------------------------------------------

create policy sp_accounts_self on public.seller_payout_accounts
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- ------------------------------------------------------------------
-- sku: public read, admin write
-- ------------------------------------------------------------------

create policy sku_public_read on public.sku
    for select using (true);

create policy sku_admin_write on public.sku
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- listing: seller 본인만 전면 허용, listed 상태만 public read
-- ------------------------------------------------------------------

create policy listing_seller_own on public.listing
    for all
    using (seller_id = auth.uid())
    with check (seller_id = auth.uid());

create policy listing_public_listed on public.listing
    for select using (status = 'listed');

create policy listing_admin_all on public.listing
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- orders: buyer 본인 (agent 여부는 애플리케이션에서 추가 검증)
-- ------------------------------------------------------------------

create policy orders_buyer_own on public.orders
    for all
    using (buyer_id = auth.uid())
    with check (buyer_id = auth.uid());

create policy orders_admin_all on public.orders
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- order_items: buyer(해당 order) 또는 seller 본인 읽기, admin 전체
-- ------------------------------------------------------------------

create policy order_items_participant on public.order_items
    for select using (
        seller_id = auth.uid()
        or exists (
            select 1 from public.orders o
            where o.id = order_id and o.buyer_id = auth.uid()
        )
    );

create policy order_items_admin_all on public.order_items
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- payouts: seller 본인 read, admin 전체
-- ------------------------------------------------------------------

create policy payouts_seller_own on public.payouts
    for select using (seller_id = auth.uid());

create policy payouts_admin_all on public.payouts
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- audit / sensitive / error log: admin 만
-- ------------------------------------------------------------------

create policy audit_admin_only on public.audit_events
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

create policy sal_admin_only on public.sensitive_access_log
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

create policy el_admin_only on public.error_log
    for all
    using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
    with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- notifications: 본인만
-- ------------------------------------------------------------------

create policy notifications_self on public.notifications
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

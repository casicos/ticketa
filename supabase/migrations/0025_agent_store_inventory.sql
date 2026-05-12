-- 0025_agent_store_inventory.sql
--
-- 시나리오 [4] (에이전트 상점 + 재고) 인프라.
--   users.store_name / store_intro  — 1인 1상점.
--   agent_inventory                  — 에이전트가 위탁/매입한 재고. listing 등록 시 reserved 증가.
--   users.nickname unique            — 시나리오 [2] 선물 식별용 (선물 RPC 작업 전 미리 인덱스 확보).

-- 1) 상점 정보
alter table public.users
  add column if not exists store_name text;

alter table public.users
  add column if not exists store_intro text;

-- store_name 은 입력 시 unique. NULL 은 충돌 회피.
create unique index if not exists ux_users_store_name
  on public.users (store_name)
  where store_name is not null;

-- 2) 닉네임 unique (선물 식별용 사전 작업)
-- 충돌 데이터가 있으면 인덱스 생성 실패. 그 경우 admin 정리 후 재실행.
create unique index if not exists ux_users_nickname
  on public.users (nickname)
  where nickname is not null;

-- 3) 에이전트 재고
create table if not exists public.agent_inventory (
    id uuid primary key default gen_random_uuid(),
    agent_id uuid not null references public.users(id) on delete cascade,
    sku_id uuid not null references public.sku(id),
    qty_available integer not null default 0 check (qty_available >= 0),
    qty_reserved integer not null default 0 check (qty_reserved >= 0),
    unit_cost integer not null check (unit_cost >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 같은 (agent, sku) 조합에서 단가별로 분리: unit_cost 까지 unique 로 묶음.
create unique index if not exists ux_agent_inventory_agent_sku_cost
  on public.agent_inventory (agent_id, sku_id, unit_cost);

create index if not exists ix_agent_inventory_agent
  on public.agent_inventory (agent_id);

-- RLS — 본인 inventory 만 조회·수정. admin 은 전체.
alter table public.agent_inventory enable row level security;

drop policy if exists agent_inventory_self_select on public.agent_inventory;
create policy agent_inventory_self_select on public.agent_inventory
  for select
  using (auth.uid() = agent_id);

drop policy if exists agent_inventory_self_update on public.agent_inventory;
create policy agent_inventory_self_update on public.agent_inventory
  for update
  using (auth.uid() = agent_id);

drop policy if exists agent_inventory_admin_select on public.agent_inventory;
create policy agent_inventory_admin_select on public.agent_inventory
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
        and user_roles.revoked_at is null
    )
  );

drop policy if exists agent_inventory_admin_all on public.agent_inventory;
create policy agent_inventory_admin_all on public.agent_inventory
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

comment on table public.agent_inventory is
  '에이전트 위탁/매입 재고. listing 생성 시 qty_reserved 증가, 판매 완료 시 qty_available + qty_reserved 동시 감소.';
comment on column public.agent_inventory.unit_cost is
  '위탁 단가 (admin → agent 내부 결제). 사용자 카탈로그에는 listing.unit_price 만 노출.';

-- 0003_triggers.sql
-- auth.users → public.users 동기화 + user_roles → JWT claim (app_metadata.roles) 동기화
-- 참조: .omc/plans/b2c-giftcard-broker-mvp.md Section 6 / Section 8 Phase 1
--
-- auth.users 테이블은 supabase_auth_admin 소유이므로 두 함수 모두 SECURITY DEFINER 필수.
-- 대안(PoC D2 결정): Supabase Auth Hook 또는 service-role 경유 Server Action.

-- ------------------------------------------------------------------
-- 1) auth.users insert → public.users 자동 생성
-- ------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.users (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'full_name', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- 2) public.user_roles 변경 → auth.users.raw_app_meta_data.roles 동기화
-- ------------------------------------------------------------------
--
-- RLS 정책이 매번 user_roles 을 JOIN 하지 않도록, 활성 역할 배열을
-- JWT custom claim (app_metadata.roles) 에 캐싱한다.

create or replace function public.sync_user_roles_to_jwt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    target_user uuid;
    roles_arr  text[];
begin
    target_user := coalesce(new.user_id, old.user_id);

    select coalesce(array_agg(distinct role order by role), '{}'::text[])
      into roles_arr
      from public.user_roles
     where user_id = target_user
       and revoked_at is null;

    update auth.users
       set raw_app_meta_data =
               coalesce(raw_app_meta_data, '{}'::jsonb)
               || jsonb_build_object('roles', to_jsonb(roles_arr))
     where id = target_user;

    return coalesce(new, old);
end;
$$;

drop trigger if exists trg_user_roles_sync on public.user_roles;
create trigger trg_user_roles_sync
    after insert or update or delete on public.user_roles
    for each row execute function public.sync_user_roles_to_jwt();

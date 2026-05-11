-- 0047_jwt_profile_claims.sql
-- 목적: public.users 의 phone_verified / full_name / nickname / username 을 JWT
-- claim (auth.users.raw_app_meta_data) 에 캐싱.
--
-- 효과:
--   - proxy.ts: phone_verified 체크 DB 호출 제거 (~200ms RTT 절감)
--   - getCurrentUser(): profile SELECT 제거 (~200ms RTT 절감)
--
-- 호환성:
--   - 기존 sync_user_roles_to_jwt 트리거(0003)와 독립적으로 동작.
--   - `||` 머지로 기존 roles 키 보존.
--   - 클라이언트의 JWT 쿠키는 mutation 직후 stale → verify-phone-form.tsx 등에서
--     supabase.auth.refreshSession() 호출 필요. (애플리케이션 측 변경 동반)
--
-- 재실행 안전: trigger drop-if-exists + idempotent backfill.

-- ------------------------------------------------------------------
-- 1) profile 변경 → JWT raw_app_meta_data 동기화 트리거 함수
-- ------------------------------------------------------------------

create or replace function public.sync_user_profile_to_jwt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- pg_trigger_depth() 가드:
    -- 현재 auth.users 에 public.users 쓰기로 cascade 되는 트리거는 없으나,
    -- 미래에 누군가 INSERT 트리거를 UPDATE 로 확장할 경우의 방어. 깊이 2 이상이면 skip.
    if pg_trigger_depth() > 1 then
        return new;
    end if;

    update auth.users
       set raw_app_meta_data =
               coalesce(raw_app_meta_data, '{}'::jsonb)
               || jsonb_build_object(
                    'phone_verified', coalesce(new.phone_verified, false),
                    'full_name',      coalesce(new.full_name, ''),
                    'nickname',       new.nickname,
                    'username',       new.username
                  )
     where id = new.id;
    return new;
end;
$$;

-- ------------------------------------------------------------------
-- 2) 트리거 attach (UPDATE 만, 변경된 컬럼만 fire)
-- ------------------------------------------------------------------

drop trigger if exists trg_user_profile_sync on public.users;
create trigger trg_user_profile_sync
    after update of phone_verified, full_name, nickname, username
    on public.users
    for each row execute function public.sync_user_profile_to_jwt();

-- INSERT 시에도 fire 해야 신규 가입자 첫 토큰이 claim 을 포함.
-- handle_new_user 가 public.users insert 한 직후 fire. (signup -> 즉시 JWT 발급 흐름 보호)
drop trigger if exists trg_user_profile_sync_insert on public.users;
create trigger trg_user_profile_sync_insert
    after insert on public.users
    for each row execute function public.sync_user_profile_to_jwt();

-- ------------------------------------------------------------------
-- 3) 기존 사용자 backfill (idempotent)
-- ------------------------------------------------------------------
--
-- `||` 는 jsonb shallow merge. 기존 keys (예: roles) 는 보존되고
-- jsonb_build_object 가 명시한 키만 add/replace.
-- 빈 raw_app_meta_data 도 coalesce 로 안전 처리.

update auth.users a
   set raw_app_meta_data =
         coalesce(a.raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object(
              'phone_verified', coalesce(u.phone_verified, false),
              'full_name',      coalesce(u.full_name, ''),
              'nickname',       u.nickname,
              'username',       u.username
            )
  from public.users u
 where a.id = u.id;

-- 결과 검증용 코멘트 (수동 확인):
-- select id, raw_app_meta_data from auth.users limit 5;
-- → roles 키 보존되고 phone_verified/full_name/nickname/username 키 존재해야 함.

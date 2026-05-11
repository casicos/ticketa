-- 0020_username_auth.sql
-- ID(username) + 비번 기반 가입 도입.
-- email 컬럼은 유지(Supabase Auth 가 요구) — 가입 시 ${username}@ticketa.local 합성 이메일로 저장.
-- 기존 실제 이메일 계정(carey@drtail.us, admin@ticketa.me)은 그대로 유지되어 로그인 가능.

alter table public.users
  add column if not exists username text;

create unique index if not exists ux_users_username
  on public.users (username)
  where username is not null;

-- handle_new_user 트리거 — raw_user_meta_data 의 username 도 픽업하도록 갱신.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username, phone, full_name, marketing_opt_in)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do update
    set username         = coalesce(excluded.username, public.users.username),
        phone            = coalesce(excluded.phone, public.users.phone),
        full_name        = case when public.users.full_name = '' then excluded.full_name else public.users.full_name end,
        marketing_opt_in = excluded.marketing_opt_in;
  return new;
end;
$$;

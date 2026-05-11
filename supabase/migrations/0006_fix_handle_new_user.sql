-- 0006_fix_handle_new_user.sql
-- handle_new_user 트리거가 raw_user_meta_data 에서 phone / marketing_opt_in 도 픽업하도록 수정.
-- 이유: Supabase email confirmation 이 켜진 상태에선 signUp 직후 세션이 없어서,
--       Server Action 의 post-signUp UPDATE 가 RLS 로 silent fail. → 트리거에서 한 번에 처리.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.users (id, email, phone, full_name, marketing_opt_in)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do update
    set phone            = coalesce(excluded.phone, public.users.phone),
        full_name        = case when public.users.full_name = '' then excluded.full_name else public.users.full_name end,
        marketing_opt_in = excluded.marketing_opt_in;
  return new;
end;
$$;

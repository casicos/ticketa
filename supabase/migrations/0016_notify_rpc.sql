-- 0016_notify_rpc.sql
-- notifications RLS 가 본인(user_id=auth.uid())만 허용이라 판매자/어드민이 다른 사용자
-- 에게 알림을 insert 할 때 silent-fail 함. insert_audit_event 와 동일한 패턴으로
-- SECURITY DEFINER 함수를 제공해 cross-user 알림 발송을 허용한다.
--
-- 배포된 다른 RPC 들(purchase_listing, complete_listing, cancel_listing) 은
-- 이미 SECURITY DEFINER 로 notifications insert 하므로 영향 없음. 문제는 Server
-- Action 에서 ssr(authenticated) 경로로 직접 insert 하는 케이스뿐.

create or replace function public.notify_user(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_link_to text
) returns bigint
language plpgsql security definer
as $$
declare v_id bigint;
begin
  if p_user_id is null then raise exception 'TARGET_REQUIRED'; end if;
  insert into public.notifications (user_id, kind, title, body, link_to)
  values (p_user_id, coalesce(p_kind, 'info'),
          coalesce(p_title, ''), coalesce(p_body, ''), p_link_to)
  returning id into v_id;
  return v_id;
end;
$$;

-- 여러 명에게 한 번에
create or replace function public.notify_users(
  p_user_ids uuid[],
  p_kind text,
  p_title text,
  p_body text,
  p_link_to text
) returns void
language plpgsql security definer
as $$
declare v_id uuid;
begin
  if p_user_ids is null or cardinality(p_user_ids) = 0 then return; end if;
  foreach v_id in array p_user_ids loop
    if v_id is not null then
      insert into public.notifications (user_id, kind, title, body, link_to)
      values (v_id, coalesce(p_kind, 'info'),
              coalesce(p_title, ''), coalesce(p_body, ''), p_link_to);
    end if;
  end loop;
end;
$$;

grant execute on function public.notify_user(uuid, text, text, text, text) to authenticated;
grant execute on function public.notify_users(uuid[], text, text, text, text) to authenticated;

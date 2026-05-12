-- audit_events 는 RLS 로 admin 만 SELECT/ALL. 그러나 판매자/구매자 컨텍스트에서
-- 상태 전이 시에도 감사 기록이 필수. SECURITY DEFINER 함수로 우회.

create or replace function public.insert_audit_event(
  p_actor_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event text,
  p_from_state text,
  p_to_state text,
  p_metadata jsonb
) returns void
language plpgsql security definer
as $$
begin
  insert into public.audit_events (
    actor_id, entity_type, entity_id, event, from_state, to_state, metadata
  ) values (
    coalesce(p_actor_id, auth.uid()),
    p_entity_type,
    p_entity_id,
    p_event,
    p_from_state,
    p_to_state,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

-- 일반 authenticated 사용자도 호출 가능 (anon 제외)
grant execute on function public.insert_audit_event(uuid, text, uuid, text, text, text, jsonb) to authenticated;

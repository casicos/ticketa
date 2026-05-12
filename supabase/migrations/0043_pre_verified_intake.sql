-- 사전 송부 (pre_verified=true) 흐름 보완:
--   1) 판매자가 카드를 어디로 보낼지 안내하기 위해 사업장 주소를 platform_settings 에 저장
--   2) 어드민이 사전 송부된 매물의 실물 수령 후 인증 완료 처리(RPC mark_listing_pre_verified_received)
--      - listing.verified_at = now()
--      - admin_memo 에 수령 시각 기록
--      - audit_events: listing_pre_verified_received
--      - 판매자에게 알림

-- ------------------------------------------------------------------
-- 1. business_address platform_settings 시드
-- ------------------------------------------------------------------

insert into public.platform_settings (key, value)
values (
  'business_address',
  jsonb_build_object(
    'company', 'Ticketa (주)',
    'recipient', '검수팀',
    'phone', '02-1234-5678',
    'zip', '06236',
    'address1', '서울 강남구 테헤란로 123',
    'address2', '5층 검수실',
    'note', '발송 시 박스 외부에 매물 ID 4자리를 큰 글씨로 적어주세요.'
  )
)
on conflict (key) do nothing;

-- ------------------------------------------------------------------
-- 2. mark_listing_pre_verified_received RPC (admin only)
-- ------------------------------------------------------------------

create or replace function public.mark_listing_pre_verified_received(
  p_listing_id uuid,
  p_admin_memo text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid;
  v_now  timestamptz := now();
  v_listing record;
  v_memo_line text;
  v_next_memo text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into v_listing
    from public.listing
   where id = p_listing_id
   for update;
  if v_listing.id is null then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if v_listing.pre_verified = false then
    raise exception 'NOT_PRE_VERIFIED';
  end if;
  if v_listing.verified_at is not null then
    raise exception 'ALREADY_VERIFIED';
  end if;
  if v_listing.status <> 'submitted' then
    raise exception 'INVALID_STATE: %', v_listing.status;
  end if;

  v_memo_line := format('[사전송부수령] %s%s',
    to_char(v_now at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
    case when p_admin_memo is not null and length(trim(p_admin_memo)) > 0
         then ' — ' || trim(p_admin_memo) else '' end);
  v_next_memo := case when v_listing.admin_memo is null or length(v_listing.admin_memo) = 0
                      then v_memo_line
                      else v_listing.admin_memo || E'\n' || v_memo_line end;

  update public.listing
     set received_at = coalesce(received_at, v_now),
         verified_at = v_now,
         admin_memo  = v_next_memo
   where id = p_listing_id;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (v_uid, 'listing', p_listing_id, 'listing_pre_verified_received',
          v_listing.status::text, v_listing.status::text,
          jsonb_build_object('admin_memo', p_admin_memo));

  -- 판매자 알림
  perform public.notify_user(
    v_listing.seller_id,
    'listing_pre_verified',
    '사전 송부 검수 완료',
    '보내주신 상품권 수령·검수가 끝났어요. 인증 매물로 카탈로그에 노출돼요.',
    format('/sell/listings/%s', p_listing_id)
  );
end;
$$;

grant execute on function public.mark_listing_pre_verified_received(uuid, text) to authenticated;

comment on function public.mark_listing_pre_verified_received is
  '사전 송부 매물의 실물 수령·검수 완료 처리 (admin only). verified_at + received_at 갱신, 판매자 알림.';

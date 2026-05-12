-- /account/gift 에서 sender:sender_id(...) 임베드가 public.users RLS (users_self_select)
-- 에 막혀 항상 null 로 떨어졌다. 결과적으로 수령자에게 "익명 사용자" 로 표시됨.
-- SECURITY DEFINER RPC 로 본인의 inbox/outbox 만 반환하면서 sender/recipient 의
-- 공개 프로필 필드(full_name/username/nickname) 만 같이 조인한다.

create or replace function public.get_user_gifts(p_tab text)
returns table (
  id uuid,
  sender_id uuid,
  recipient_id uuid,
  recipient_nickname_snapshot text,
  qty int,
  unit_price int,
  total_price int,
  message text,
  status text,
  shipping_carrier text,
  tracking_no text,
  sent_at timestamptz,
  claimed_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  refunded_at timestamptz,
  expires_at timestamptz,
  sku_id uuid,
  sku_brand text,
  sku_denomination int,
  sku_display_name text,
  sender_full_name text,
  sender_username text,
  sender_nickname text,
  recipient_full_name text,
  recipient_username text,
  recipient_nickname text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    g.id,
    g.sender_id,
    g.recipient_id,
    g.recipient_nickname_snapshot,
    g.qty,
    g.unit_price,
    g.total_price,
    g.message,
    g.status::text,
    g.shipping_carrier,
    g.tracking_no,
    g.sent_at,
    g.claimed_at,
    g.shipped_at,
    g.completed_at,
    g.refunded_at,
    g.expires_at,
    s.id,
    s.brand,
    s.denomination,
    s.display_name,
    sender.full_name,
    sender.username,
    sender.nickname,
    recipient.full_name,
    recipient.username,
    recipient.nickname
  from public.gifts g
  left join public.sku s on s.id = g.sku_id
  left join public.users sender on sender.id = g.sender_id
  left join public.users recipient on recipient.id = g.recipient_id
  where
    (p_tab = 'inbox' and g.recipient_id = auth.uid())
    or (p_tab = 'outbox' and g.sender_id = auth.uid())
  order by g.sent_at desc
  limit 40;
$$;

grant execute on function public.get_user_gifts(text) to authenticated;

comment on function public.get_user_gifts is
  '본인의 inbox/outbox 선물 목록 + sender/recipient 공개 프로필 (full_name/username/nickname) 반환. RLS 우회.';

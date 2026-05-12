-- 0036_child_cancel_restore.sql
--
-- 자식 listing 취소 시 부모의 quantity_remaining 으로 환원.
--   - 부모/단독 listing 취소: inventory.qty_reserved → qty_available (기존 동작)
--   - 자식 listing 취소: parent.quantity_remaining += qty (inventory 변화 없음)
--
-- 결과적으로:
--   - 부모는 매진 상태였더라도 카탈로그에 다시 노출 가능 (quantity_remaining > 0)
--   - 구매자 마일리지는 cancel_listing 이 환불 처리 (변경 없음)

create or replace function public._sync_agent_inventory_on_listing_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv_id uuid;
  v_qty int;
begin
  if new.status not in ('completed', 'cancelled') then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;

  v_qty := new.quantity_offered;

  -- 자식 listing 취소 → 부모 quantity_remaining 으로 환원 (inventory 는 그대로)
  if new.status = 'cancelled' and new.parent_listing_id is not null then
    update public.listing
       set quantity_remaining = quantity_remaining + v_qty
     where id = new.parent_listing_id;
    return new;
  end if;

  -- 부모/단독 listing 인 경우 inventory 추적
  select (e.metadata->>'inventory_id')::uuid into v_inv_id
    from public.audit_events e
   where e.entity_type = 'listing'
     and e.entity_id = new.id
     and e.event = 'agent_listing_created'
   order by e.created_at asc
   limit 1;

  if v_inv_id is null then
    return new;
  end if;

  if new.status = 'completed' then
    update public.agent_inventory
       set qty_reserved = greatest(qty_reserved - v_qty, 0),
           updated_at = now()
     where id = v_inv_id;
  elsif new.status = 'cancelled' then
    -- 부모/단독 listing 취소: reserved → available
    update public.agent_inventory
       set qty_reserved = greatest(qty_reserved - v_qty, 0),
           qty_available = qty_available + v_qty,
           updated_at = now()
     where id = v_inv_id;
  end if;

  return new;
end;
$$;

-- 트리거는 이미 등록되어 있어 재등록 불필요 (함수 body 만 교체).

-- pgTAP RLS 매트릭스 — 마일스톤에서 본격 활성화
-- 현재는 플레이스홀더. supabase/pgTAP CLI 도입 후 실행.
begin;
select plan(1);
select pass('pgTAP 스켈레톤 — 실 테스트는 Phase 7 확장에서');
select * from finish();
rollback;

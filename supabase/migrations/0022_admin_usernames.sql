-- 0022_admin_usernames.sql
-- 기존 어드민 계정에 username 백필. 0021 도입 후 운영 중인 admin 계정도
-- ID/비번 로그인 흐름에 자연스럽게 합류시키기 위함.
-- 실제 이메일 → username 매핑은 운영 정책으로 사전 합의:
--   carey@drtail.us  → carey
--   admin@ticketa.me → tcadmin   (USERNAME_RESERVED 의 'admin' 회피)

update public.users
   set username = 'carey'
 where email = 'carey@drtail.us'
   and username is null;

update public.users
   set username = 'tcadmin'
 where email = 'admin@ticketa.me'
   and username is null;

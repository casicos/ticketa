// Supabase Management API 로 Auth > SMS > Test Numbers 를 동기화하는 스크립트 (스텁).
//
// 목표
//   - 환경별 (dev / staging) 고정 OTP 번호 매핑을 IaC 수준으로 관리
//   - production 에는 test_otp 를 절대 반영하지 않음 (Risk R4)
//
// MVP 상태
//   - 현재는 "+821012345678 = 123456" 하나만 사용
//   - Supabase 대시보드에서 Auth > SMS Settings > Test Numbers 수동 등록
//   - Management API 토큰이 확보되는 시점에 자동화로 전환 (Phase 1 이후)
//
// TODO
//   - SUPABASE_MANAGEMENT_API_TOKEN 환경변수 도입
//   - `PATCH /v1/projects/{ref}/config/auth` 로 test_otp 반영
//   - dry-run / apply 옵션
//   - CI에서 preview branch 에 자동 적용

export {};

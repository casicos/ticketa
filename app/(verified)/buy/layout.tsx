/**
 * 구매(buy) 라우트 — phone_verified 회원이면 누구나 접근 가능.
 * 미들웨어가 phone_verified 체크 수행. role 게이트는 제거됨 (P2P 모델 전환).
 * 사이드바는 마이룸 사이드바(MyRoomShell)를 각 페이지에서 직접 wrap.
 */
export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

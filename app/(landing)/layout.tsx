/**
 * 랜딩 전용 레이아웃 — DesktopTopNav 가 hero 안에 흡수돼 있어
 * 공용 (public) 레이아웃의 HeaderServer 를 그리지 않는다.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col">{children}</div>;
}

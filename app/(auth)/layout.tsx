/**
 * 인증 라우트 그룹 — login / signup / 그 외 인증 흐름.
 * 공용 헤더·풋터를 노출하지 않고 풀-블리드 split-panel 디자인을 위해 별도 레이아웃을 둔다.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col">{children}</div>;
}

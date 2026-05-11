import Link from 'next/link';

/**
 * 개인정보처리방침
 * - 본 문서는 (주)명길(Ticketa) 의 서비스에 맞춘 초안.
 * - 변경/배포 전 반드시 개인정보보호 책임자 또는 외부 자문(법무법인) 검토 필요.
 * - 책임자 성명/연락처, 시행일, 통신판매업 신고 정보 등 placeholder 부분은
 *   실제 정보로 교체할 것.
 */

const NAV = [
  '1. 수집 항목',
  '2. 수집 목적',
  '3. 보유 기간',
  '4. 제3자 제공',
  '5. 위탁 처리',
  '6. 정보주체 권리',
  '7. 안전성 확보 조치',
  '8. 쿠키 / 로그',
  '9. 개인정보 책임자',
  '10. 권익 침해 구제',
];

const COMPANY = {
  legalName: '(주)명길',
  serviceName: 'Ticketa(티켓타)',
  bizNumber: '577-88-03280',
  ecommerceFiling: '제2026-서울성동-0024호',
  address: '서울특별시 성동구 아차산로7길 15-1, 3층 3119호 (성수동2가, 제이제이빌딩)',
  privacyOfficerName: '김광식',
  privacyOfficerEmail: 'privacy@ticketa.kr',
  customerEmail: 'help@ticketa.kr',
  customerPhone: '1588-0000',
};

export default function PrivacyPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1100px] px-8 py-8 pb-16">
        {/* Header */}
        <div className="text-ticketa-blue-700 text-[13px] font-bold tracking-[0.12em]">
          PRIVACY POLICY
        </div>
        <h1 className="mt-1.5 text-[30px] font-extrabold tracking-[-0.022em]">개인정보처리방침</h1>
        <div className="text-muted-foreground mt-1 text-[15px]">시행일 2026.05.09 · 버전 v1.0</div>

        <div className="mt-6 grid gap-7 md:grid-cols-[240px_1fr]">
          {/* TOC sidebar */}
          <aside className="self-start md:sticky md:top-20">
            <div className="border-border rounded-xl border bg-white p-2">
              <div className="text-muted-foreground px-2.5 pt-0.5 pb-2 text-[13px] font-bold tracking-[0.05em] uppercase">
                목차
              </div>
              {NAV.map((n, i) => (
                <a
                  key={n}
                  href={`#section-${i}`}
                  className="text-foreground hover:bg-ticketa-blue-50 hover:text-ticketa-blue-700 block rounded-[7px] px-2.5 py-1.5 text-[15px] font-semibold transition-colors"
                >
                  {n}
                </a>
              ))}
            </div>
            <div className="bg-warm-50 text-muted-foreground mt-3 rounded-[11px] px-4 py-3.5 text-[14px] leading-[1.65]">
              본 방침이 변경되는 경우 시행일 기준 7일 이전(중요한 변경의 경우 30일 이전) 공지합니다.
            </div>
          </aside>

          {/* Article body */}
          <article className="border-border text-warm-800 rounded-2xl border bg-white px-10 py-8 text-base leading-[1.85]">
            <p className="text-warm-700 mb-6 text-[15px]">
              {COMPANY.legalName}(이하 &ldquo;회사&rdquo;)는 정보주체의 개인정보를 중요시하며,
              「개인정보 보호법」 및 관계 법령을 준수하고 있습니다. 본 처리방침은{' '}
              <strong>{COMPANY.serviceName}</strong>(이하 &ldquo;서비스&rdquo;) 이용 과정에서 회사가
              어떤 개인정보를 어떤 목적으로 처리하며, 어떻게 보호하는지 안내드리기 위해
              마련되었습니다.
            </p>

            {/* 1. 수집 항목 */}
            <section id="section-0">
              <h2 className="mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[0]}</h2>
              <p className="text-warm-700 mb-2.5">
                회사는 서비스 회원가입·본인확인·거래 진행을 위해 아래의 개인정보를 수집합니다.
              </p>

              <h3 className="mt-4 mb-1.5 text-[15px] font-bold">가. 회원가입 시 (필수)</h3>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>이메일 주소</li>
                <li>비밀번호 (단방향 해시 저장 — 회사가 평문을 보유하지 않음)</li>
                <li>이름(실명)</li>
                <li>휴대폰 번호 (본인인증 OTP 발송 및 알림 목적)</li>
              </ul>

              <h3 className="mt-4 mb-1.5 text-[15px] font-bold">나. 회원가입 시 (선택)</h3>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>닉네임 (선물 보내기 등 회원 간 식별)</li>
                <li>마케팅·이벤트 정보 수신 동의 여부</li>
                <li>알림 채널별 수신 동의 여부 (푸시·알림톡·이메일·SMS)</li>
              </ul>

              <h3 className="mt-4 mb-1.5 text-[15px] font-bold">다. 거래 진행 시 추가 수집</h3>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>
                  <strong>판매·정산</strong>: 정산 계좌번호, 예금주명, 은행코드 (정산 계좌번호는
                  암호화 저장)
                </li>
                <li>
                  <strong>충전(무통장입금)</strong>: 입금자명, 입금 시각·금액
                </li>
                <li>
                  <strong>출금</strong>: 수취 계좌 정보, 출금 사유(선택)
                </li>
                <li>
                  <strong>매물 등록·구매</strong>: 상품권 정보, 거래 시각, 수량, 단가, 메모(선택)
                </li>
              </ul>

              <h3 className="mt-4 mb-1.5 text-[15px] font-bold">라. 자동 수집 항목</h3>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>IP 주소, 접속 시각, 브라우저·OS 정보, 기기 식별자</li>
                <li>쿠키 · 세션 토큰 (인증 유지 목적)</li>
                <li>서비스 이용 로그 (페이지 이동, 거래 진행 단계 등)</li>
                <li>
                  오류 발생 시 진단 정보 (스택 트레이스, 사용자 식별자 — 가능한 경우 가명처리)
                </li>
              </ul>
            </section>

            {/* 2. 수집 목적 */}
            <section id="section-1">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[1]}</h2>
              <p className="text-warm-700 mb-2.5">수집한 개인정보는 다음 목적으로만 이용됩니다.</p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>회원가입·본인확인·계정 관리 및 부정이용 방지</li>
                <li>상품권 매물 등록·검수·구매·정산 등 거래 진행</li>
                <li>마일리지 충전·출금·환불 처리</li>
                <li>분쟁 발생 시 사실관계 파악 및 중재</li>
                <li>서비스 운영 관련 알림 (거래 진행 알림, 시스템 공지) 발송</li>
                <li>(동의 시) 마케팅·이벤트 정보 발송</li>
                <li>「전자상거래 등에서의 소비자보호에 관한 법률」 등 법령 준수</li>
                <li>서비스 개선을 위한 통계 분석 (가명처리 또는 익명처리)</li>
              </ul>
            </section>

            {/* 3. 보유 기간 */}
            <section id="section-2">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[2]}</h2>
              <p className="text-warm-700 mb-3">
                회사는 이용 목적이 달성되거나 회원이 탈퇴를 요청한 경우 지체 없이 개인정보를
                파기합니다. 다만, 다음의 정보는 관계 법령에 따라 정해진 기간 동안 보관합니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>
                  <strong>계약·청약철회·대금결제·재화공급 기록</strong> — 5년
                  <span className="text-muted-foreground"> (전자상거래법)</span>
                </li>
                <li>
                  <strong>소비자 불만·분쟁 처리 기록</strong> — 3년
                  <span className="text-muted-foreground"> (전자상거래법)</span>
                </li>
                <li>
                  <strong>표시·광고 기록</strong> — 6개월
                  <span className="text-muted-foreground"> (전자상거래법)</span>
                </li>
                <li>
                  <strong>전자금융 거래 기록</strong> — 5년
                  <span className="text-muted-foreground"> (전자금융거래법)</span>
                </li>
                <li>
                  <strong>접속 기록(로그인 IP·시각)</strong> — 3개월
                  <span className="text-muted-foreground"> (통신비밀보호법)</span>
                </li>
                <li>
                  <strong>본인인증 기록</strong> — 4년
                  <span className="text-muted-foreground"> (정보통신망법)</span>
                </li>
                <li>
                  <strong>세금계산서·증빙</strong> — 5년{' '}
                  <span className="text-muted-foreground">(국세기본법)</span>
                </li>
              </ul>
              <p className="text-muted-foreground mb-3 text-[14px]">
                ※ 부정이용·분쟁이 진행 중인 경우 해당 처리 종료 시까지 별도 보관할 수 있습니다.
              </p>
            </section>

            {/* 4. 제3자 제공 */}
            <section id="section-3">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[3]}</h2>
              <p className="text-warm-700 mb-3">
                회사는 정보주체의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 아래의
                경우는 예외로 합니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>정보주체로부터 별도 동의를 받은 경우</li>
                <li>
                  법령에 특별한 규정이 있거나, 수사 목적으로 법령에 정한 절차와 방법에 따라
                  수사기관의 요구가 있는 경우
                </li>
                <li>통계 작성·학술 연구·공익적 기록보존을 위해 가명처리하여 제공하는 경우</li>
                <li>
                  회원 간 거래에서 거래 상대방에게 제공해야 하는 최소한의 정보 (예: 닉네임, 거래
                  진행 상태)
                </li>
              </ul>
            </section>

            {/* 5. 위탁 처리 */}
            <section id="section-4">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[4]}</h2>
              <p className="text-warm-700 mb-3">
                회사는 안정적인 서비스 운영을 위해 일부 업무를 외부에 위탁하고 있으며, 위탁 계약 시
                「개인정보 보호법」에 따른 안전성 확보 조치를 명시합니다.
              </p>
              <div className="border-border mb-3 overflow-hidden rounded-md border">
                <table className="text-warm-700 w-full text-[14px]">
                  <thead className="bg-warm-50 text-warm-500 text-[13px] font-bold tracking-[0.04em] uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">수탁자</th>
                      <th className="px-3 py-2 text-left">위탁 업무</th>
                      <th className="px-3 py-2 text-left">개인정보 보유 위치</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row
                      x="Supabase Inc. (미국)"
                      y="데이터베이스·인증·스토리지 호스팅"
                      z="대한민국 (서울 리전)"
                    />
                    <Row
                      x="Vercel Inc. (미국)"
                      y="프론트엔드 어플리케이션 호스팅 및 로그"
                      z="미국·아시아 멀티리전"
                    />
                    <Row x="Sentry (미국)" y="오류 모니터링 (가명·익명 처리)" z="미국" />
                    <Row
                      x="(주)알리고 또는 누리고 — M1 도입 예정"
                      y="휴대폰 본인인증 OTP 발송"
                      z="대한민국"
                    />
                    <Row x="토스페이먼츠 — M1 도입 예정" y="PG 결제 처리" z="대한민국" />
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-[14px]">
                ※ 수탁자 변경 시 본 처리방침을 통해 사전 고지합니다.
              </p>
            </section>

            {/* 6. 정보주체 권리 */}
            <section id="section-5">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[5]}</h2>
              <p className="text-warm-700 mb-3">
                정보주체는 회사에 대해 언제든지 다음의 권리를 행사할 수 있습니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>개인정보 열람·정정·삭제 요청</li>
                <li>처리 정지 요청</li>
                <li>회원 탈퇴 (서비스 내 마이페이지 → 회원탈퇴 또는 고객센터 문의)</li>
                <li>마케팅·이벤트 수신 동의 철회 (마이페이지 → 알림 설정)</li>
              </ul>
              <p className="text-warm-700 mb-3">
                권리 행사는 서비스 내 메뉴 또는{' '}
                <a
                  href={`mailto:${COMPANY.privacyOfficerEmail}`}
                  className="text-ticketa-blue-700 font-bold hover:underline"
                >
                  {COMPANY.privacyOfficerEmail}
                </a>{' '}
                으로 가능하며, 회사는 지체 없이 조치합니다. 다만 「개인정보 보호법」 제35조 제5항에
                해당하는 경우 열람을 제한할 수 있습니다.
              </p>
            </section>

            {/* 7. 안전성 확보 조치 */}
            <section id="section-6">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[6]}</h2>
              <p className="text-warm-700 mb-3">
                회사는 개인정보 안전성 확보를 위해 다음과 같은 기술적·관리적 조치를 시행하고
                있습니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>
                  <strong>전송 구간 암호화</strong>: 모든 통신은 TLS 1.2 이상으로 암호화
                </li>
                <li>
                  <strong>저장 구간 암호화</strong>: 비밀번호 단방향 해시(bcrypt), 정산 계좌번호
                  pgcrypto 대칭키 암호화
                </li>
                <li>
                  <strong>접근 통제</strong>: Postgres Row Level Security 로 회원 본인 데이터만 열람
                  가능. 어드민 권한은 별도 분리 운영
                </li>
                <li>
                  <strong>감사 로그</strong>: 어드민의 민감정보 열람·상태 변경 이력은 모두 기록(
                  <code className="font-mono text-[13px]">audit_events</code> 테이블) — 회원 요청 시
                  관련 조회 이력 제공 가능
                </li>
                <li>
                  <strong>최소 권한 원칙</strong>: 운영 인력에게 업무 수행에 필요한 최소 권한만 부여
                </li>
                <li>
                  <strong>주기적 보안 점검</strong>: 분기 1회 의존성·취약점 스캔, 침입 탐지 알림
                  운영
                </li>
              </ul>
            </section>

            {/* 8. 쿠키 / 로그 */}
            <section id="section-7">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[7]}</h2>
              <p className="text-warm-700 mb-3">
                회사는 서비스 제공에 필요한 최소한의 쿠키·세션을 사용합니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>
                  <strong>인증 쿠키</strong>: 로그인 상태 유지. 브라우저 종료 또는 일정 시간 경과 시
                  만료
                </li>
                <li>
                  <strong>세션 토큰</strong>: 거래 진행 중 일시 보관, 거래 완료 시 즉시 폐기
                </li>
                <li>
                  <strong>분석용 쿠키 — 미사용</strong>: 회사는 광고 추적·외부 분석 쿠키를 사용하지
                  않습니다 (M1 마일스톤까지)
                </li>
              </ul>
              <p className="text-warm-700">
                쿠키 거부 방법: 브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 거부 시 로그인 및
                거래 기능이 동작하지 않을 수 있습니다.
              </p>
            </section>

            {/* 9. 개인정보 책임자 */}
            <section id="section-8">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[8]}</h2>
              <p className="text-warm-700 mb-3">
                회사는 개인정보 처리에 관한 업무를 총괄하고, 개인정보 처리와 관련한 정보주체의 불만
                처리 및 피해 구제를 위해 아래와 같이 책임자를 지정하고 있습니다.
              </p>
              <div className="border-border bg-warm-50 mb-3 rounded-[10px] border px-4 py-3.5">
                <div
                  className="text-warm-700 grid gap-y-1 text-[15px]"
                  style={{ gridTemplateColumns: '120px 1fr' }}
                >
                  <span className="text-warm-500">성명</span>
                  <span className="font-bold">{COMPANY.privacyOfficerName}</span>
                  <span className="text-warm-500">소속·직책</span>
                  <span>{COMPANY.legalName} 대표</span>
                  <span className="text-warm-500">이메일</span>
                  <span>
                    <a
                      href={`mailto:${COMPANY.privacyOfficerEmail}`}
                      className="text-ticketa-blue-700 font-mono font-bold hover:underline"
                    >
                      {COMPANY.privacyOfficerEmail}
                    </a>
                  </span>
                  <span className="text-warm-500">고객센터</span>
                  <span>
                    <span className="font-mono font-bold">{COMPANY.customerPhone}</span>
                    {' · '}
                    <a
                      href={`mailto:${COMPANY.customerEmail}`}
                      className="text-ticketa-blue-700 font-mono hover:underline"
                    >
                      {COMPANY.customerEmail}
                    </a>
                  </span>
                </div>
              </div>
            </section>

            {/* 10. 권익 침해 구제 */}
            <section id="section-9">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[9]}</h2>
              <p className="text-warm-700 mb-3">
                개인정보 침해에 대한 신고·상담이 필요하시면 아래 기관에 문의하실 수 있습니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>
                  개인정보 침해신고센터 (privacy.kisa.or.kr) · 전화{' '}
                  <span className="font-mono">국번 없이 118</span>
                </li>
                <li>
                  개인정보 분쟁조정위원회 (kopico.go.kr) · 전화{' '}
                  <span className="font-mono">1833-6972</span>
                </li>
                <li>
                  대검찰청 사이버수사과 (spo.go.kr) · 전화{' '}
                  <span className="font-mono">국번 없이 1301</span>
                </li>
                <li>
                  경찰청 사이버수사국 (ecrm.cyber.go.kr) · 전화{' '}
                  <span className="font-mono">국번 없이 182</span>
                </li>
              </ul>
            </section>

            {/* 부칙 */}
            <section id="section-policy" className="bg-warm-50 mt-8 rounded-[10px] px-4 py-4">
              <h3 className="mb-2 text-[15px] font-bold tracking-[-0.012em]">부칙</h3>
              <p className="text-warm-700 text-[14px] leading-[1.7]">
                본 처리방침은 2026년 5월 9일부터 시행합니다. 처리방침이 변경되는 경우 시행일 기준
                7일 이전(중요한 변경의 경우 30일 이전)에 서비스 공지사항을 통해 고지합니다.
              </p>
            </section>

            {/* Company info */}
            <div className="border-border text-warm-600 mt-7 rounded-[10px] border bg-white px-4 py-3.5 text-[14px] leading-[1.7]">
              <strong className="text-warm-800">{COMPANY.legalName}</strong>
              {' · '}
              사업자등록번호 <span className="font-mono">{COMPANY.bizNumber}</span>
              {' · '}
              통신판매업신고 <span className="font-mono">{COMPANY.ecommerceFiling}</span>
              <br />
              {COMPANY.address}
            </div>
          </article>
        </div>

        {/* Back link */}
        <div className="text-muted-foreground mt-6 text-center text-[15px]">
          <Link href="/" className="text-ticketa-blue-700 font-semibold hover:underline">
            ← 홈으로 돌아가기
          </Link>
          {' · '}
          <Link href="/legal/terms" className="text-ticketa-blue-700 font-semibold hover:underline">
            이용약관
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ x, y, z }: { x: string; y: string; z: string }) {
  return (
    <tr className="border-border border-t">
      <td className="px-3 py-2 align-top font-semibold">{x}</td>
      <td className="px-3 py-2 align-top">{y}</td>
      <td className="text-muted-foreground px-3 py-2 align-top text-[13px]">{z}</td>
    </tr>
  );
}

import Link from 'next/link';

/**
 * 이용약관
 * - (주)명길(Ticketa) 서비스 약관 초안.
 * - 시행 전 법무 검토 필수.
 * - 회사명/대표자/책임자 정보는 본 페이지의 COMPANY 객체와 풋터에 동일하게 노출.
 */

const NAV = [
  '제1조 목적',
  '제2조 용어의 정의',
  '제3조 약관의 효력과 변경',
  '제4조 회원가입',
  '제5조 회원 계정 관리',
  '제6조 서비스의 제공·중단',
  '제7조 거래의 성격과 책임',
  '제8조 거래 절차',
  '제9조 마일리지',
  '제10조 충전·출금',
  '제11조 검수와 카드 보관',
  '제12조 수수료',
  '제13조 청약철회·환불',
  '제14조 회원의 의무 및 금지행위',
  '제15조 회사의 책임 제한',
  '제16조 분쟁 해결·관할',
  '부 칙',
];

const COMPANY = {
  legalName: '(주)명길',
  serviceName: 'Ticketa(티켓타)',
  bizNumber: '577-88-03280',
  ecommerceFiling: '제2026-서울성동-0024호',
  address: '서울특별시 성동구 아차산로7길 15-1, 3층 3119호 (성수동2가, 제이제이빌딩)',
  customerEmail: 'help@ticketa.kr',
  customerPhone: '1588-0000',
};

export default function TermsPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1100px] px-8 py-8 pb-16">
        {/* Header */}
        <div className="text-ticketa-blue-700 text-[14px] font-bold tracking-[0.12em]">
          TERMS OF SERVICE
        </div>
        <h1 className="mt-1.5 text-[30px] font-extrabold tracking-[-0.022em]">이용약관</h1>
        <div className="text-muted-foreground mt-1 text-[15px]">시행일 2026.05.09 · 버전 v1.0</div>

        <div className="mt-6 grid gap-7 md:grid-cols-[240px_1fr]">
          {/* TOC sidebar */}
          <aside className="self-start md:sticky md:top-20">
            <div className="border-border rounded-xl border bg-white p-2">
              <div className="text-muted-foreground px-2.5 pt-0.5 pb-2 text-[14px] font-bold tracking-[0.05em] uppercase">
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
              본 약관이 변경되는 경우 시행일 기준 7일 이전(중요한 변경의 경우 30일 이전) 공지합니다.
            </div>
          </aside>

          {/* Article body */}
          <article className="border-border text-warm-800 rounded-2xl border bg-white px-10 py-8 text-base leading-[1.85]">
            {/* Intro callout */}
            <div className="border-ticketa-blue-200 bg-ticketa-blue-50 text-ticketa-blue-700 mb-6 rounded-[9px] border px-4 py-3 text-[14.5px] leading-[1.65]">
              본 약관은 회원과 회사 간 권리·의무를 정합니다.{' '}
              <strong>회사는 통신판매중개자로서 거래 당사자가 아닙니다.</strong> 회원 간 거래에서
              발생하는 모든 책임은 거래 당사자에게 귀속됩니다.
            </div>

            {/* 제1조 목적 */}
            <section id="section-0">
              <h2 className="mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[0]}</h2>
              <p className="text-warm-700 mb-4">
                본 약관은 {COMPANY.legalName}(이하 &ldquo;회사&rdquo;)가 운영하는 백화점 상품권 거래
                플랫폼 <strong>{COMPANY.serviceName}</strong>(이하 &ldquo;서비스&rdquo;)의 이용 조건
                및 절차, 회원과 회사의 권리·의무·책임, 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            {/* 제2조 용어의 정의 */}
            <section id="section-1">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[1]}</h2>
              <p className="text-warm-700 mb-2.5">
                본 약관에서 사용하는 용어의 정의는 다음과 같습니다.
              </p>
              <ol className="text-warm-700 mb-3 list-decimal space-y-1 pl-5">
                <li>
                  <strong>&ldquo;회원&rdquo;</strong>: 본 약관에 동의하고 회사와 이용계약을 체결하여
                  서비스 이용 자격을 부여받은 자.
                </li>
                <li>
                  <strong>&ldquo;에이전트&rdquo;</strong>: 회사가 인증한 상품권 검수·보관·출고 위탁
                  사업자.
                </li>
                <li>
                  <strong>&ldquo;관리자&rdquo;</strong>: 회사 또는 회사가 위임한 운영 인력으로, 본
                  서비스의 운영·중재를 수행.
                </li>
                <li>
                  <strong>&ldquo;매물&rdquo;</strong>: 판매자가 등록한 상품권 거래 단위.
                </li>
                <li>
                  <strong>&ldquo;마일리지&rdquo;</strong>: 서비스 내에서 거래 결제 수단으로 사용되는
                  적립금. 1M = 1원에 해당하며, 회사가 발행·관리.
                </li>
                <li>
                  <strong>&ldquo;P2P 거래&rdquo;</strong>: 회원 간 직접 거래를 회사가 중개하는 거래
                  형태.
                </li>
                <li>
                  <strong>&ldquo;에이전트 거래&rdquo;</strong>: 에이전트가 관리자에게 위탁한 재고를
                  회원이 매수하는 거래 형태.
                </li>
                <li>
                  <strong>&ldquo;실물 카드&rdquo;</strong>: 발행처가 발행한 종이 또는 플라스틱
                  형태의 상품권 매체. 본 서비스는 실물 카드 거래만 취급합니다.
                </li>
              </ol>
            </section>

            {/* 제3조 약관의 효력과 변경 */}
            <section id="section-2">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[2]}</h2>
              <p className="text-warm-700 mb-3">
                ① 본 약관은 회사가 서비스 화면에 게시하거나 기타 방법으로 회원에게 공지함으로써
                효력이 발생합니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 회사는 「약관의 규제에 관한 법률」, 「전자상거래 등에서의 소비자보호에 관한 법률」
                등 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 약관은 시행일
                7일 전부터 서비스 화면에 공지합니다. 다만, 회원에게 불리하거나 중대한 변경의 경우
                시행일 30일 전부터 공지하고, 개별 통지(이메일·앱 푸시 등)도 병행합니다.
              </p>
              <p className="text-warm-700 mb-3">
                ③ 회원은 개정 약관에 동의하지 않을 권리가 있으며, 동의하지 않는 경우 이용계약을
                해지할 수 있습니다. 시행일 이후에도 서비스를 계속 이용하는 경우 개정 약관에 동의한
                것으로 간주합니다.
              </p>
            </section>

            {/* 제4조 회원가입 */}
            <section id="section-3">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[3]}</h2>
              <p className="text-warm-700 mb-3">
                ① 이용계약은 회원이 본 약관과 개인정보처리방침에 동의하고 회사가 정한 양식에 따라
                가입을 신청한 후 회사가 이를 승낙함으로써 성립합니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 만 19세 미만은 회원가입할 수 없습니다. 가입 시 본인인증(휴대폰 OTP) 을 완료해야
                합니다.
              </p>
              <p className="text-warm-700 mb-3">
                ③ 다음 각 호에 해당하는 경우 회사는 가입을 승낙하지 않거나 사후에 이용 계약을 해지할
                수 있습니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>본인이 아닌 타인의 명의를 도용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>
                  과거 회사의 이용 정지·계약 해지를 받은 이력이 있고 그 사유가 해소되지 않은 경우
                </li>
                <li>관련 법령 위반의 우려가 있는 경우</li>
              </ul>
            </section>

            {/* 제5조 회원 계정 관리 */}
            <section id="section-4">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[4]}</h2>
              <p className="text-warm-700 mb-3">
                ① 회원의 비밀번호 관리 책임은 회원 본인에게 있으며, 제3자에게 양도·대여할 수
                없습니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 회원은 자신의 계정이 도용·부정 사용되었음을 인지한 즉시 회사에 통지해야 하며, 통지
                지연으로 인한 손해는 회원이 부담합니다.
              </p>
              <p className="text-warm-700 mb-3">
                ③ 회원은 언제든 마이페이지에서 회원 탈퇴를 신청할 수 있습니다. 다만 진행 중인
                거래·환불·분쟁이 있는 경우 해당 처리가 완료된 후 탈퇴 처리됩니다.
              </p>
            </section>

            {/* 제6조 서비스의 제공·중단 */}
            <section id="section-5">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[5]}</h2>
              <p className="text-warm-700 mb-3">
                ① 회사는 연중무휴, 1일 24시간 서비스를 제공함을 원칙으로 합니다. 다만 정기
                점검·업그레이드, 천재지변, 통신두절, 정전, 시스템 장애 등의 사유로 서비스가 일시
                중단될 수 있습니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 회사는 사전 공지 후 서비스 일부 또는 전부를 중단·변경할 수 있습니다. 긴급한 경우
                사후에 공지할 수 있습니다.
              </p>
            </section>

            {/* 제7조 거래의 성격과 책임 */}
            <section id="section-6">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[6]}</h2>
              <p className="text-warm-700 mb-3">
                ① <strong>회사는 통신판매중개자</strong>이며, 회원 간 거래(P2P 거래)의 당사자가
                아닙니다. 매물의 진정성·하자·인도 책임은 판매 회원에게 있고, 대금 지급 책임은 구매
                회원에게 있습니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② <strong>에이전트 거래</strong>의 경우, 매물은 관리자가 보관하며 회사가 지정한
                에이전트가 검수·관리합니다. 이 거래에서도 회사는 통신판매중개의 지위를 유지하나,
                위탁 재고에 대한 보관·검수의 책임은 별도 위탁계약에 따릅니다.
              </p>
              <p className="text-warm-700 mb-3">
                ③ 회사는 거래의 안전을 위해 다음의 부가 서비스를 제공합니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>에스크로 — 구매 대금은 거래 완료 시까지 회사가 보관</li>
                <li>본인인증 — 휴대폰 OTP 기반 회원 식별</li>
                <li>검수 — 에이전트의 매물 진위·잔액 확인</li>
                <li>분쟁 중재 — 회원의 신청 시 회사가 객관적 자료에 따라 중재</li>
              </ul>
            </section>

            {/* 제8조 거래 절차 */}
            <section id="section-7">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[7]}</h2>
              <p className="text-warm-700 mb-2.5">P2P 거래는 다음 7단계로 진행됩니다.</p>
              <ol className="text-warm-700 mb-3 list-decimal space-y-1 pl-5">
                <li>
                  <strong>등록</strong>: 판매자가 매물을 등록 (브랜드·액면가·수량·단가)
                </li>
                <li>
                  <strong>구매 확정</strong>: 구매자(또는 에이전트) 가 매물을 구매 신청 → 마일리지가
                  즉시 차감되고 에스크로에 보관
                </li>
                <li>
                  <strong>인계</strong>: 판매자가 실물 카드를 회사 지정 장소(또는 택배) 로 인계
                </li>
                <li>
                  <strong>수령</strong>: 관리자가 인계받은 실물 카드를 수령·접수
                </li>
                <li>
                  <strong>검수</strong>: 에이전트가 진위·잔액·유효기간을 확인
                </li>
                <li>
                  <strong>출고</strong>: 검수 통과 시 구매자에게 실물 카드 출고
                </li>
                <li>
                  <strong>완료·정산</strong>: 구매자가 인수 확인 시 판매자에게 마일리지 정산. 단,
                  분쟁이 발생하면 정산 보류 후 별도 절차로 처리
                </li>
              </ol>
              <p className="text-warm-700 mb-3">
                각 단계의 진행 현황은 마이페이지의 거래 상세에서 확인할 수 있으며, 회사는 단계 변경
                시 알림을 발송합니다.
              </p>
            </section>

            {/* 제9조 마일리지 */}
            <section id="section-8">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[8]}</h2>
              <p className="text-warm-700 mb-3">
                ① 마일리지는 1M = 1원에 해당하며, 본 서비스 내에서 거래 결제·환불·정산에 사용됩니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 마일리지는 충전 방식에 따라 다음과 같이 구분되며, 출금 가능 여부가 다릅니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>
                  <strong>현금 마일리지(cash)</strong>: 무통장입금 충전, 판매 정산, 환불 등으로
                  적립. 즉시 출금 가능.
                </li>
                <li>
                  <strong>PG 마일리지(pg-locked)</strong>: 신용카드·간편결제 등 PG 결제로 충전된
                  잔액. 카드깡 방지를 위해 거래에 사용된 후에만 현금 마일리지로 전환되어 출금이
                  가능합니다.
                </li>
              </ul>
              <p className="text-warm-700 mb-3">
                ③ 회사는 부정·이상 거래 의심 시 해당 마일리지의 사용·출금을 일시 정지할 수 있으며,
                사실 확인 후 정상 처리합니다.
              </p>
              <p className="text-warm-700 mb-3">
                ④ 마일리지는 회원의 양도·환급(現金 환불은 본 약관 제13조에 따름) 외의 목적으로 회원
                간 이전될 수 없습니다.
              </p>
            </section>

            {/* 제10조 충전·출금 */}
            <section id="section-9">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[9]}</h2>
              <p className="text-warm-700 mb-3">
                ① 충전 수단은 무통장입금을 기본으로 하며, PG 결제(신용카드·간편결제 등) 는 추후
                단계적으로 도입될 수 있습니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 충전은 최소 100원 단위로 진행되며, 무통장입금의 경우 입금 확인 후 마일리지가
                적립됩니다(최소 100원, 평균 5분).
              </p>
              <p className="text-warm-700 mb-3">
                ③ 출금 신청 시 회원은 본인 명의의 계좌 정보를 입력해야 하며, 예금주명이 회원 실명과
                일치해야 합니다. 회사는 본인확인 후 영업일 기준 1~2일 이내 지급합니다.
              </p>
              <p className="text-warm-700 mb-3">
                ④ 회사는 부정 사용·자금세탁방지 등의 목적으로 출금 신청을 보류·반려할 수 있으며,
                회원에게 사유를 통지합니다.
              </p>
            </section>

            {/* 제11조 검수와 카드 보관 */}
            <section id="section-10">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[10]}</h2>
              <p className="text-warm-700 mb-3">
                ① 매물은 회사가 지정한 에이전트의 검수를 통과한 경우에만 거래가 진행됩니다. 검수
                항목은 다음과 같습니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>발행처의 진위 (위·변조 여부)</li>
                <li>잔액 (사용 흔적, 잔여 금액)</li>
                <li>유효기간 (만료 임박·경과 여부)</li>
                <li>외관 (오염·파손 정도)</li>
              </ul>
              <p className="text-warm-700 mb-3">
                ② 검수에 통과하지 못한 매물은 거래가 자동 취소되며, 회사는 사유와 근거(사진·상세
                메모) 를 판매자에게 통지합니다. 차감된 마일리지는 즉시 구매자에게 환불됩니다.
              </p>
              <p className="text-warm-700 mb-3">
                ③ 검수 완료 후 출고 전까지 실물 카드는 회사가 지정한 보관 장소에서 관리되며,
                도난·분실에 대한 합리적인 안전 조치를 취합니다.
              </p>
            </section>

            {/* 제12조 수수료 */}
            <section id="section-11">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[11]}</h2>
              <p className="text-warm-700 mb-3">
                ① 회사는 거래 안전·운영을 위해 수수료를 부과할 수 있으며, 수수료는 매물 권종(SKU)
                별로 회사가 정한 금액 또는 비율에 따릅니다. 수수료 부담 주체(판매자/구매자/공동) 도
                SKU별로 정해집니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 수수료의 구체적 내역은 매물 등록 화면 및 거래 진행 화면에서 사전에 안내됩니다.
                회원은 수수료에 동의하지 않는 경우 거래를 진행하지 않을 권리가 있습니다.
              </p>
              <p className="text-warm-700 mb-3">
                ③ 첫 거래 수수료 면제 등 프로모션은 별도 공지된 조건에 따라 적용됩니다.
              </p>
            </section>

            {/* 제13조 청약철회·환불 */}
            <section id="section-12">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[12]}</h2>
              <p className="text-warm-700 mb-3">
                ① 본 서비스는 회원 간 직접 거래(P2P) 를 중개하므로 「전자상거래 등에서의
                소비자보호에 관한 법률」 제17조 제2항 제2호에 따라 단순 변심에 의한 청약 철회가
                제한될 수 있습니다. 다만, 다음의 경우 환불이 보장됩니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>매물이 회사의 검수에서 부적격 판정을 받은 경우</li>
                <li>판매자가 약속된 기한 내에 인계하지 않은 경우</li>
                <li>구매자가 인수 확인 전에 명시적인 하자(잔액 부족, 위·변조 등) 를 입증한 경우</li>
                <li>회사의 책임 있는 사유로 거래가 진행되지 못한 경우</li>
              </ul>
              <p className="text-warm-700 mb-3">
                ② 환불은 마일리지로 즉시 처리되며, 회원이 신청하면 출금 절차에 따라 현금으로
                지급됩니다(현금 마일리지에 한함).
              </p>
              <p className="text-warm-700 mb-3">
                ③ 환불의 구체 기준·절차는 별도 운영정책에 따르며, 회사는 운영정책 변경 시
                공지합니다.
              </p>
            </section>

            {/* 제14조 회원의 의무 및 금지행위 */}
            <section id="section-13">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[13]}</h2>
              <p className="text-warm-700 mb-3">
                회원은 다음 행위를 해서는 안 되며, 위반 시 회사는 이용 정지·계약 해지·법적 조치를
                취할 수 있습니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>위·변조 상품권의 등록·거래</li>
                <li>본인이 아닌 타인의 명의·계좌·휴대폰을 이용한 거래</li>
                <li>이용 한도 회피 등 부정한 방법으로 마일리지를 충전·이전·출금하는 행위</li>
                <li>
                  「자본시장법」, 「전자금융거래법」, 「특정금융정보법」 등 관련 법령을 위반하는
                  행위
                </li>
                <li>다른 회원에 대한 사칭·기망·협박, 욕설·비방·차별 표현</li>
                <li>서비스 운영을 방해하거나 회사·타 회원·제3자의 권리를 침해하는 행위</li>
                <li>자동화된 수단(봇·스크래핑·매크로 등) 으로 서비스에 접근하는 행위</li>
              </ul>
            </section>

            {/* 제15조 회사의 책임 제한 */}
            <section id="section-14">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[14]}</h2>
              <p className="text-warm-700 mb-3">
                ① 회사는 통신판매중개자로서 회원 간 거래의 당사자가 아니며, 매물의 진정성·잔액·인도
                책임 등은 거래 당사자에게 있습니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 다음의 사유로 발생한 손해에 대해 회사는 책임을 지지 않습니다.
              </p>
              <ul className="text-warm-700 mb-3 list-disc space-y-1 pl-5">
                <li>천재지변, 전쟁, 정전, 통신 두절 등 불가항력 사유</li>
                <li>회원의 귀책 사유(비밀번호 유출, 본인 부주의 등)</li>
                <li>제3자(외부 결제사·통신사 등) 의 시스템 장애로 인한 손해</li>
                <li>회원이 회사의 정책·법령을 위반하여 발생한 손해</li>
              </ul>
              <p className="text-warm-700 mb-3">
                ③ 회사가 제공하는 부가 서비스(검수·에스크로·중재 등) 의 운영상 합리적 노력에도
                불구하고 발생한 직접·간접 손해에 대해, 회사의 책임은 회원이 회사에 지급한 수수료의
                한도로 제한됩니다(고의·중과실의 경우 제외).
              </p>
            </section>

            {/* 제16조 분쟁 해결·관할 */}
            <section id="section-15">
              <h2 className="mt-7 mb-2.5 text-lg font-extrabold tracking-[-0.018em]">{NAV[15]}</h2>
              <p className="text-warm-700 mb-3">
                ① 본 약관은 대한민국 법령에 따라 해석·적용됩니다.
              </p>
              <p className="text-warm-700 mb-3">
                ② 회사와 회원 간 분쟁이 발생한 경우, 양 당사자는 신의성실의 원칙에 따라 상호 협의로
                해결하기 위해 노력합니다. 협의가 성립하지 않을 경우「전자상거래 등에서의
                소비자보호에 관한 법률」 등 관련 법령에 따라 한국소비자원·전자거래 분쟁조정위원회
                등에 조정을 신청할 수 있습니다.
              </p>
              <p className="text-warm-700 mb-3">
                ③ 본 약관과 관련한 소송의 관할은 「민사소송법」 상의 관할법원으로 합니다.
              </p>
            </section>

            {/* 부칙 */}
            <section id="section-16" className="bg-warm-50 mt-8 rounded-[10px] px-4 py-4">
              <h3 className="mb-2 text-[15px] font-bold tracking-[-0.012em]">{NAV[16]}</h3>
              <p className="text-warm-700 text-[14px] leading-[1.7]">
                본 약관은 2026년 5월 9일부터 시행합니다. 약관이 변경되는 경우 시행일 기준 7일
                이전(중요한 변경의 경우 30일 이전)에 서비스 공지사항을 통해 고지합니다.
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
              <br />
              고객센터 <span className="font-mono">{COMPANY.customerPhone}</span>
              {' · '}
              <a
                href={`mailto:${COMPANY.customerEmail}`}
                className="text-ticketa-blue-700 font-mono hover:underline"
              >
                {COMPANY.customerEmail}
              </a>
            </div>
          </article>
        </div>

        {/* Back link */}
        <div className="text-muted-foreground mt-6 text-center text-[15px]">
          <Link href="/" className="text-ticketa-blue-700 font-semibold hover:underline">
            ← 홈으로 돌아가기
          </Link>
          {' · '}
          <Link
            href="/legal/privacy"
            className="text-ticketa-blue-700 font-semibold hover:underline"
          >
            개인정보처리방침
          </Link>
        </div>
      </div>
    </div>
  );
}

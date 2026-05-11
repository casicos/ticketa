# Ticketa — 어드민 콘솔 디자인 의뢰 (Round 2, 2026-05-11)

> 기존 디자인 시스템 (`ticketa-design-system`) 의 톤·컴포넌트·컬러 토큰을 그대로 사용.
> 데스크탑(1216px 컨테이너) 전용으로 충분. 어드민은 모바일 미지원.
> 사이드바는 **이미 완성**: 좌측 다크 사이드바 (배경 `#0E131C`, role accent admin=`#5BA3D0`). 이번 의뢰는 **메인 콘텐츠 영역**만.

---

## 1. 디자인 시스템 토큰 (재확인)

| 영역               | 값                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------- |
| 어드민 액센트      | **`#5BA3D0`** (ticketa-blue-500) — primary CTA / 활성 nav                             |
| 에이전트 액센트    | `#D4A24C` (ticketa-gold-500) — 어드민 화면에서는 라벨/배지로만 등장                   |
| 인증 그린          | `#1F6B43` (verified solid)                                                            |
| 골드 dark          | `#8C6321` (가격 강조, 상점 라벨)                                                      |
| 워밍 그레이 스케일 | `warm-0/25/50/100/200/300/700` — 표/패널 배경                                         |
| 배경               | `#FAF7F1` (warm-50) 또는 white                                                        |
| 보더               | `var(--border)` ≈ `#E9E2D1`                                                           |
| 텍스트             | `var(--foreground)`, `var(--muted-foreground)`                                        |
| 카드 radius        | `12px` / `14px`                                                                       |
| 폰트               | Pretendard 추정 — 한국어 가독성 최우선, `tracking-[-0.018em]` h2, `tabular-nums` 숫자 |

---

## 2. 공통 패턴

이미 화면에서 사용 중인 패턴들 (재사용 요청):

- **AdminPageHead**: `<h1>` (24px extrabold, tracking-[-0.022em]) + sub (15px muted) + `border-b border-border pb-3.5`
- **AdminKpi 카드**: white bg, 1px border, padding 16px, label(15px bold muted) → value(22px extrabold tabular-nums) → delta(15px semibold colored)
- **테이블 헤더**: `bg-warm-50` + `text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground` + `px-4 py-3`
- **테이블 row**: `border-t border-warm-100` + `px-4 py-3.5`
- **Pill/Badge**: `rounded-full px-2 py-0.5 text-[11px] font-extrabold`, 상태별 색 (성공=`rgba(31,107,67,0.12)/#1F6B43`, 진행=`rgba(91,163,208,0.12)/#5BA3D0`, 경고=`rgba(212,162,76,0.14)/#8C6321`, 위험=`bg-destructive/10 text-destructive`)
- **Primary 버튼**: `bg-ticketa-blue-500 text-white h-11 rounded-[10px] px-5 text-[14px] font-extrabold`
- **Secondary 버튼**: `border border-border bg-white h-10 rounded-[10px] px-4 text-[13px] font-bold hover:bg-warm-50`

---

## 3. 의뢰 화면 목록

각 화면별로 **데스크탑 1216px** 시안 + 마이크로 인터랙션 명세. JSX 컴포넌트 export 권장 (e.g., `DesktopAdminDashboard`).

---

### A. `/admin` — 대시보드 (Operational Overview)

**기능**: 어드민이 처음 진입했을 때 오늘 처리해야 할 일과 시스템 헬스를 한눈에 파악.

**구성 요청**

1. **상단 KPI 스트립** (4~5개)
   - 검수 대기 (handed_over 카운트, 클릭 → `/admin/intake`)
   - 발송 대기 (verified 카운트)
   - 충전 승인 대기 (`charge_requests.status='pending'`)
   - 출금 처리 대기 (`withdrawals.status='pending'`)
   - 취소 요청 대기 (`cancellation_requests.status='pending'`)
   - 숫자 0 인 칸은 옅게 (`opacity-60`), 0 이상이면 액센트 컬러 (`#5BA3D0` 또는 `#D4A24C`)

2. **두 컬럼 본문**
   - 좌 (큰, 7/12): **SLA 경고 큐** — 24시간 이상 미처리 매물 / 충전 / 출금 리스트. 칸반-라이트 (3 column: 검수 / 발송 / 정산) 또는 컴팩트 테이블.
   - 우 (작은, 5/12):
     - "오늘의 거래 흐름" 미니 라인 차트 (제출/매입/완료, 24시간) — 실데이터 없어도 placeholder 패턴 OK
     - "최근 알림 로그" — 최근 10개 `audit_events`, kind 아이콘 + 시각 + 객체 링크

3. **빈 상태**: 모든 큐가 0일 때 — 그린 그라데이션 patch + "오늘은 한가합니다 ☕" 같은 위트.

**제외**: 광고, 마케팅 KPI, 사용자 가입 그래프 (이번 라운드 X).

---

### B. `/admin/intake` — 검수 큐 (P0 — nav 배지 카운트 포함)

**기능**: 7단계 상태 머신 중 `handed_over → received → verified → shipped` 트랜지션을 어드민이 일괄 처리.

**핵심 요구**

1. **상단 탭** (status filter):
   - 인계 대기 (`handed_over`) — **이 탭 옆에 좌측 사이드바와 동일한 숫자 배지 노출** (e.g., 검수 큐 `12`).
   - 검수 대기 (`received`)
   - 검수 완료 (`verified`) — 발송 대기
   - 발송 중 (`shipped`)
   - 완료 (`completed`)
   - 취소 (`cancelled`)
   - 탭 카운트는 각각 `(N)` 으로 표시.

2. **테이블 컬럼**
   - 체크박스 (일괄 액션용, MVP는 단건만 처리 가능해도 됨)
   - 매물 (SKU + DeptMark 28px + 권종)
   - 판매자 / 상점명 (P2P 면 익명코드, 에이전트면 공식 상점명)
   - 가격 × 수량 = 총액
   - 단계 진입 시각 + SLA 경고 (24시간 초과 빨강)
   - 액션 — 단계별 다른 1~2개 버튼:
     - `handed_over`: "수령 처리"
     - `received`: "검수 통과" / "검수 실패"
     - `verified`: "발송 처리" (택배사 chip dialog 호출 — 이미 디자인됨)
     - `shipped`: "수신 확인 (수동 완료)"

3. **사이드바 nav 배지** (좌측 콘솔 사이드바 — 이미 존재. 검수 큐 우측에 `12` 같은 빨간 점/숫자) — 이 부분 데이터 노출 위치/스타일만 명시 부탁 (e.g., 그라데이션 dot + 숫자 골드).

4. **로우 hover**: 우측에 "타임라인 →" 미니 버튼 (열어보면 7단계 진행 바 + 양자 알림 로그).

---

### C. `/admin/consignments` — 위탁 입고 (P0)

**기능**: 어드민이 에이전트 위탁 상품권을 검수/수령하여 `agent_inventory` 에 적재. 동일 (에이전트·SKU·단가) 면 기존 행 qty_available 증가.

**구성 요청**

1. **상단 KPI 3개**: 활성 에이전트 수 / 활성 SKU 수 / 최근 30일 적재 총액
2. **2-column 메인**:
   - 좌 (8/12) **"새 위탁 입고" 폼 카드** — 에이전트 select (드롭다운에 상점명·@username 함께) + SKU select (브랜드별 그룹) + 수량 (± 컨트롤 + 빠른 버튼: 10/30/50/100) + 정산 단가 (₩ 입력, step 100) + 우측 미리보기 패널 (적재 후 상태 예고: 기존 행 결합 vs 신규 행). 하단에 "총 적재가" 강조.
   - 우 (4/12) **에이전트 카드 리스트** — 각 에이전트별 현재 보유량 요약 (상위 5명, 보유/판매중/정산 예정액)
3. **하단 "최근 적재 내역" 테이블** — 에이전트 / SKU / 보유·판매중 / 정산 단가 / 정산 예정액 / 갱신 시각. 행 클릭 시 해당 에이전트의 전체 inventory drill-in (사이드 시트).

---

### D. `/admin/listings` — 매물 관리

**기능**: 전체 매물 검색·필터·일괄 관리. intake 와 달리 모든 상태를 가로질러 보는 게 핵심.

**구성 요청**

1. **검색 바**: 매물 ID / 판매자 username / SKU 브랜드 자동완성 + 상태 필터 멀티셀렉트 + 가격 범위 슬라이더 + "기간" 데이트레인지
2. **결과 카운트 + 정렬 선택** (최근 등록 / 가격 ↑↓ / 진행률)
3. **테이블** — intake 와 컬럼은 유사하되 모든 status 노출. 상태는 7단계 칩 + 진행률 thin bar.
4. **행 클릭 → 사이드 시트** (오버레이 패널, width 480px):
   - 매물 메타 / 7단계 진행 바 / 양자(판매자/구매자) 알림 로그 / 어드민 수동 액션 (cancel_listing, 강제 complete, 검수 메모 추가)
5. **빈 상태**: 검색 결과 없음 — "필터를 풀어보세요" + 클리어 버튼.

---

### E. `/admin/monitor` — 거래 모니터링

**기능**: 마일리지 흐름 + 거래 활동 실시간 모니터링.

**구성 요청**

1. **헤더**: 라이브 토글 (10s 폴링 on/off) + 마지막 갱신 시각.
2. **상단 KPI 4개**:
   - 24시간 GMV (purchased 금액 합)
   - 24시간 거래 건수
   - cash 잔액 합 (전체 사용자)
   - pg_locked 잔액 합
3. **메인 영역 (2-column)**:
   - 좌 (7/12) **거래 흐름 차트** — 시간대별 (1h/24h/7d 토글) area chart. submitted/purchased/completed/cancelled 4개 시리즈, 액센트 컬러 조합 (`#5BA3D0`/`#D4A24C`/`#1F6B43`/`#C0625A`).
   - 우 (5/12) **이상 거래 alert 리스트** — 동일 사용자 단시간 다회 매입, 큰 출금, 카드깡 의심 패턴 (pg_locked 잔존 출금 시도 등). 각 alert 은 카드 형태로 심각도(노랑/주황/빨강) 색 보더.
4. **하단 "라이브 거래 스트림"** — 가로 스크롤 가능한 슬림 테이블, 가장 최근 거래 50건 (시각 / 매물 / 금액 / 상태 / 결제 수단). 새 행은 상단에 페이드인 애니메이션.

---

### F. `/admin/users` — 사용자 관리 (구 `/admin/members` 흡수)

**기능**: 회원 검색 + role grant/revoke + 본인인증 상태 + 마일리지 잔액 한눈.

**구성 요청**

1. **상단 KPI 3개**: 총 회원 / 본인인증 완료 / 에이전트 N명
2. **검색 바**: 이메일 / username / 닉네임 / 휴대폰
3. **테이블 컬럼**
   - 아바타 (이니셜) + username + 이메일 (합성 이메일 `@ticketa.local` 은 숨김)
   - 본명 (full_name)
   - 휴대폰 + 본인인증 칩 (인증됨 / 미인증)
   - 닉네임
   - 역할 칩 (seller / agent / admin — 색 구분)
   - 마일리지 잔액 (cash / pg 작은 글씨로 분해)
   - 가입일
   - 권한 관리 — 호버 시 드롭다운 (agent 부여/회수, admin 부여/회수)
4. **행 클릭 → 사이드 시트** — 사용자 상세, 최근 30일 거래·충전·출금 요약, audit 로그 미니.

---

### G. `/admin/catalog` — SKU 카탈로그

**기능**: 어드민이 판매 가능한 SKU(브랜드·권종) 마스터를 관리. 신규 SKU 추가, 활성/비활성 토글, 수수료 정책 설정.

**구성 요청**

1. **상단**: "+ SKU 추가" 버튼 (우측) + 브랜드 필터 chip group (`전체 / 롯데 / 현대 / 신세계 / 갤러리아 / AK`)
2. **그리드 (3 col)**: 각 SKU 카드 — DeptMark 56px + 브랜드 + 권종 (`50,000원권`) + 수수료 설정 (예: `고정 400원/seller`) + 활성 토글 + 썸네일 (있을 시) + 누적 거래량 미니 메트릭
3. **SKU 추가/편집 모달**: 브랜드 + 권종 + display_name + 썸네일 URL + 수수료 (라디오: 고정 / 퍼센트, amount, charged_to: seller/buyer/both)
4. **빈 상태**: 첫 SKU 등록 안내 일러스트.

---

### H. `/admin/mileage` — 마일리지 관리

**기능**: 충전 승인 / 출금 처리 / 사용자별 잔액 조회.

**구성 요청**

1. **상단 탭**:
   - 충전 승인 대기 (`charge_requests.status='pending'`, 카운트 배지)
   - 출금 처리 (`withdrawals.status='pending'`)
   - 사용자 잔액 검색
2. **충전 탭 테이블**: 사용자 / 신청 금액 / 입금자명 / 신청 시각 / "승인" (그린) / "반려" (회색)
3. **출금 탭 테이블**: 사용자 / 출금 금액 / 등록된 계좌 (마스킹: `국민****-1234`) / 신청 시각 / "완료" / "반려"
4. **승인 confirm 모달**: 사용자 정보 + 금액 + bucket(cash/pg) 라디오 (충전 method 에 따라 기본값 다름) + 메모
5. **사용자 잔액 검색 탭**: 사용자 검색 → 결과 카드 (cash_balance / pg_locked / withdrawable / 최근 30일 마일리지 원장 mini-table)
6. **빈 상태**: 처리할 항목 없음 — 그린 체크 일러스트.

---

### I. `/admin/cancellations` — 취소 요청

**기능**: 사용자의 취소 요청을 어드민이 검토·승인·반려. 승인 시 `cancel_listing` RPC → cash 환불 + agent_inventory 복구.

**구성 요청**

1. **상단 탭**:
   - 대기 (pending, 카운트 배지)
   - 처리됨 (approved + rejected)
2. **대기 탭 카드 리스트** (테이블 대신 카드형 권장 — 정보량 많음):
   - 각 카드: 요청자 (판매자 OR 구매자) + 매물 정보 (SKU + 금액 + 현재 상태) + 요청 사유 (텍스트) + 첨부 파일 (있을 시) + "승인" (그린) / "반려 (사유 입력)"
   - 카드 상단 좌측에 요청 시점 SLA 표시 (24시간 초과 시 빨강 stripe)
3. **반려 모달**: 사유 텍스트필드 + confirm
4. **처리됨 탭**: 결과 칩 (승인/반려) + 처리 시각 + 처리 어드민 + 사유. 검색·필터 가능.

---

### J. `/admin/audit` — 감사 로그

**기능**: `audit_events` 타임라인 — 모든 상태 변경·중요 액션 추적.

**구성 요청**

1. **필터 바**: 기간 (오늘/7일/30일/직접) + 엔티티 타입 멀티 (listing / mileage_account / agent_inventory / user_role / gift / system) + 이벤트 검색 (e.g., `purchase`, `cancel`) + 액터 (어드민 self / 시스템 / 사용자)
2. **타임라인 뷰** (사이드 시각 + 우측 카드):
   - 좌 시간축 (날짜별 그룹 헤더)
   - 우 카드: 이벤트 아이콘 + 제목 (`purchase_listing` 등 → 한국어 라벨) + from→to 상태 화살표 + 메타데이터 (JSON 펼치기 가능) + 엔티티 클릭 시 해당 페이지로 이동
3. **이벤트 색 코드**:
   - 매입/판매 → 블루
   - 마일리지 변동 → 골드
   - 취소/환불 → 머스타드
   - 검수/발송 → 그린
   - 보안 (role grant 등) → 보라
4. **빈 상태**: 필터에 맞는 로그 없음.

---

## 4. 사이드바 nav 카운트 배지 (공통)

좌측 사이드바 (이미 존재, `components/admin/admin-shell.tsx`) 의 다음 항목 옆에 **숫자 배지** 노출 디자인:

- 검수 큐 (handed_over + received + verified 카운트)
- 위탁 입고 (오늘 적재된 건수, 또는 0이면 숨김)
- 마일리지 (충전+출금 pending 합)
- 취소 요청 (pending 카운트)

**배지 스타일 제안**:

- 작은 pill, background `#D4A24C` (admin 콘솔에선 골드가 어드민에 강조 안 됨 → 차라리 `#FF6B5A` 같은 alert red 추천), color `#11161E` (다크), `text-[12px] font-extrabold`, `min-w-[20px]` 가운데 정렬, `tabular-nums`.
- 0 이면 노출 안 함.
- 9 초과 시 `9+`.

---

## 5. 디자인 시안 산출물

각 화면별로:

- 데스크탑 풀-사이즈 (1216px) JSX 시안 — placeholder 데이터로 동작
- 핵심 인터랙션 (모달, 사이드 시트, 호버 상태) 별도 컴포넌트
- 다크 모드는 미고려 (어드민 콘솔은 라이트만)

산출물 디렉토리 추천:

```
design-bundle-admin-round2/
  page-mockups/
    index.html            (모든 시안 한 페이지 프리뷰)
  screens-admin-round2/
    dashboard.jsx
    intake.jsx
    consignments.jsx
    listings.jsx
    monitor.jsx
    users.jsx
    catalog.jsx
    mileage.jsx
    cancellations.jsx
    audit.jsx
  partials/
    side-sheet.jsx        (공통 사이드 패널 셸)
    kpi-strip.jsx
    nav-badge.jsx
  README.md
```

---

## 6. 절대 금지 / 주의

- ❌ 우주공간 같은 다크 그라데이션을 카드 배경으로 쓰지 말 것 (현재 P2P/agent 카드와 충돌)
- ❌ 어드민 화면에 골드 그라데이션 CTA 사용 금지 (골드는 에이전트 액센트 → 사용자가 헷갈림). 어드민 CTA는 `#5BA3D0` 솔리드만.
- ⚠️ 검수 큐의 SLA 경고는 빨강 (`var(--destructive)`) — 골드와 혼동 주의
- ⚠️ 모든 숫자는 `tabular-nums` + 천단위 콤마 (`toLocaleString('ko-KR')` 기본)
- ✅ 한국어 카피는 친근하면서도 어드민 톤 (정확/간결). 이모지 자제 (대시보드 한가함 메시지 정도만).

---

이상. 화면별 시안 + 통합 프리뷰 page-mockups/index.html 부탁드립니다.

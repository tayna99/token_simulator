# AgentPayroll 유닛 이코노믹스 리스크 리뷰 (2026-05-26)

## 결론

AgentPayroll의 유닛 이코노믹스(고객 1명을 얻고 유지할 때 매출, 비용, 이익, 회수 기간이 맞는지 보는 사업 체력 지표)에서 가장 위험한 비용은 LLM API(모델 호출 비용), Supabase(데이터베이스/인증 인프라), pgvector(벡터 검색용 DB 확장), 서버비가 아니라 **고객 획득과 신뢰 형성에 드는 사람 시간**이다. 제품 pain(고객이 실제로 아파하는 문제)은 명확하다. AI SaaS 팀은 고객별, 기능별, 플랜별 AI 원가와 매출을 연결하지 못하면 누가 마진(매출에서 원가를 뺀 남는 돈)을 깨는지, 가격을 바꿔야 하는지, 어떤 결정을 남겨야 하는지 판단하기 어렵다.

하지만 현재 가격 사다리(무료 진단에서 유료 진단, 월간 리뷰로 올라가게 만든 상품 단계)와 운영 방식이 그대로라면 `Data Readiness Check`(고객 데이터가 분석 가능한 구조인지 확인하는 저가 진단)는 유료 리드 선별 장치가 아니라 저마진 수작업(돈은 적게 받고 사람이 오래 붙는 일)으로 변질될 수 있고, `AI Cost Snapshot`(한 번 고객 데이터를 넣어 AI 비용/마진 상태를 찍어보는 진단 리포트)은 SaaS 매출(매월 반복해서 쌓이는 소프트웨어 매출)이 아니라 일회성 컨설팅 리포트로 끝날 수 있다. 따라서 초기 목표는 "많이 무료 진단하기"가 아니라 **A급 ICP(가장 잘 맞는 이상적 고객군)만 빠르게 선별하고, Trust Gate(업로드 데이터에서 raw prompt/API key/PII 같은 민감정보를 막고 안심시키는 첫 관문)로 데이터 불안을 낮추고, Snapshot(1회 진단)을 Monthly Decision Review(지난 결정이 실제로 돈을 남겼는지 매월 검산하는 반복 리뷰)로 전환하는 것**이다.

## 근거 범위

로컬 근거:

- `PM.md`: AgentPayroll은 토큰 계산기(모델별 호출 비용만 계산하는 도구)가 아니라 AI SaaS 운영 의사결정 워크스페이스(비용, 마진, 가격정책, 결정 기록을 한 흐름에서 보는 업무 공간)다.
- `docs/AgentCost_AI_Native_Front_Operating_System.md`: Free Fit Check(무료 적합성 확인), Data Readiness Check(데이터 준비도 확인), AI Cost Snapshot(1회 비용/마진 진단), Monthly Review(월간 반복 리뷰) 가격 사다리.
- `docs/research/mvp-wtp-interview-guide.md`: WTP(willingness to pay, 고객이 실제로 돈을 낼 의향) 인터뷰 대상, 강한 신호(구매 가능성이 높다는 말/행동), 구매 거부 문장 코딩(거절 이유를 태그로 분류하는 작업).
- `docs/PRD-current-state-2026-05-25.md`: Trust Gate first(데이터 안심 장치를 첫 화면에 둔다), one truth three lenses(같은 숫자를 개발자/PM/CEO가 다른 관점으로 본다), PDF as value proof(PDF를 단순 export가 아니라 구매 가치 증명물로 본다), Decision Log(결정과 근거를 남기는 기록), billing execution deferred(Stripe/Metronome 같은 결제 시스템 변경 실행은 뒤로 미룬다).

외부 근거:

- [ChartMogul AI churn wave](https://chartmogul.com/reports/saas-retention-the-ai-churn-wave/): 2025년 AI-native 회사(제품 핵심에 AI가 들어간 회사)는 retention(고객이 계속 남아 있는 비율)이 약하고, 특히 저가/실험성 매출일수록 취소가 쉽다.
- [ChartMogul SaaS retention new normal](https://chartmogul.com/reports/saas-retention-the-new-normal/): 100%+ NRR(기존 고객 매출이 이탈을 빼고도 확장으로 100% 이상 유지되는 상태) 달성은 더 어려워졌고 retention(유지율)이 성장의 핵심 레버다.
- [CloudZero SaaS unit economics guide](https://www.cloudzero.com/blog/saas-unit-economics/): SaaS unit economics(고객 단위 수익성)의 핵심은 총 cloud bill(전체 인프라 청구서)이 아니라 customer, feature, API call, inference(고객/기능/API 호출/모델 추론) 단위 비용을 매출과 연결하는 것이다.
- [CloudZero inference cost guide](https://www.cloudzero.com/blog/inference-cost/): AI inference 비용(모델이 답변을 생성할 때 드는 실행 비용)은 high-cost/low-margin feature(비용은 높은데 남는 돈은 적은 기능)와 unprofitable customer(쓸수록 손해인 고객)를 숨기기 쉽다.
- [FinOps Foundation State of FinOps 2026](https://data.finops.org/): AI cost management(AI 비용을 예산, 원가, 책임 단위로 관리하는 일)는 FinOps(클라우드/기술 비용을 재무적으로 운영하는 방식)의 최우선 역량으로 올라왔고, SaaS/AI/labor(소프트웨어, AI, 사람 시간) 비용까지 관리 범위가 넓어지고 있다.
- [6sense B2B Buyer Experience 2025](https://6sense.com/science-of-b2b/buyer-experience-report-2025/): AI 구매자는 모델 학습(업로드 데이터가 모델 훈련에 쓰이는지), 데이터 저장(어디에 얼마나 보관되는지), privacy/security(개인정보/보안), 비용 설명을 더 일찍 요구한다.
- [Benchmarkit 2025 B2B SaaS metrics](https://www.benchmarkit.ai/_files/ugd/2a084b_1b2e8054260b44cba36242807d1c3eea.pdf): CAC payback(고객획득비용 회수 기간), GRR(기존 고객 매출 유지율), NRR(기존 고객 확장까지 포함한 순매출 유지율), CLTV:CAC(고객 생애가치 대비 획득비용) 등 SaaS 지표 정의를 기준으로 삼는다.

## 현재 가격 사다리와 경제성 가정

| 상품 | 가격 가설 | 역할 | 주요 위험 |
|---|---:|---|---|
| Free Fit Check | 무료 | ICP와 데이터 존재 여부 확인(이 고객이 유료 분석을 받을 만큼 맞는지, 분석할 데이터가 있는지 확인) | 무료 분석으로 번지면 CAC(고객획득비용) 폭발 |
| Data Readiness Check | 5만-15만 원 | 유료 선별 장치(데이터 구조를 보고 유료 진단 가능성을 판단하는 입문 상품) | 1-2시간만 들어가도 마진 훼손(받는 돈보다 사람 시간이 비싸짐) |
| AI Cost Snapshot | 30만-100만 원 | 핵심 유료 진단(한 번의 데이터 분석으로 비용/마진/손해 고객을 보여주는 리포트) | 일회성 리포트로 끝나면 LTV(고객 생애 매출)가 낮음 |
| Monthly AI Cost Review | 월 30만-150만 원 | 반복 매출(매월 같은 지표를 다시 보고 결정 결과를 검산하는 상품) | Decision Log(결정 기록)가 약하면 retainer(매달 돈은 받지만 명확한 반복 가치가 약한 자문 계약)처럼 보임 |

핵심 공식:

```text
Report gross margin
= (price - human_ops_cost - variable_infra_cost - support_rework_cost) / price

CAC payback months
= CAC / monthly_gross_profit

Monthly gross profit
= monthly_price - recurring_analysis_ops_cost - support_security_followup_cost - variable_infra_cost
```

위 공식의 의미:

- `Report gross margin`: 리포트 1개를 팔았을 때 실제로 남는 비율(예: 100만 원에 팔고 총원가가 40만 원이면 gross margin은 60%).
- `human_ops_cost`: 사람이 직접 쓰는 시간의 비용(데이터 이해, 매핑, 설명, 검수, 미팅).
- `variable_infra_cost`: 고객이 늘수록 함께 늘어나는 인프라 비용(LLM 호출, DB, 저장소, export 처리 등).
- `support_rework_cost`: 고객 질문, 수정 요청, 오류 재검토에 드는 비용.
- `CAC payback months`: 고객 한 명을 얻는 데 쓴 비용을 몇 개월치 이익으로 회수하는지.

## 1. 매출 위험

가장 큰 매출 위험은 `AI Cost Snapshot`(AI 사용 로그를 넣고 이번 달 비용/마진 상태를 한 번 찍어보는 진단 리포트)이 "한 번 예쁘게 받는 PDF"로 인식되는 것이다. 30만-100만 원 리포트는 컨설팅(사람이 분석해서 한 번 납품하는 서비스)처럼 팔릴 수 있지만, Monthly Review(매월 다시 보고 지난 결정의 효과를 확인하는 반복 상품)로 전환되지 않으면 SaaS식 LTV(고객이 오래 남아 매월 매출을 만드는 구조)가 생기지 않는다.

`AI Cost Snapshot`이라는 이름도 조심해야 한다. "비용 리포트"로 들리면 Helicone, Langfuse, OpenAI dashboard, SQL, spreadsheet와 비교된다(즉 "이미 로그 도구나 콘솔, 엑셀로 볼 수 있는 비용 표를 왜 돈 주고 사야 하지?"라는 프레임에 갇힌다). 더 강한 paid value(고객이 돈을 낼 만한 가치)는 `AI Margin Snapshot`(AI 기능이 매출 대비 얼마를 남기는지 보는 진단), `Loss-Making Customer Review`(쓰면 쓸수록 손해인 고객을 찾는 리뷰), `AI Pricing Decision Pack`(가격/요금제/사용량 제한을 바꾸기 위한 결정 패키지)이다. 고객은 비용을 본 사실보다 "가격, cap, credit, plan boundary를 바꿀 근거가 생겼다"에 돈을 낸다(여기서 `cap`은 고객별/플랜별 사용량 상한, `credit`은 사용량을 포인트처럼 차감하는 과금 단위, `plan boundary`는 무료/Pro/Enterprise 같은 요금제 사이에 어떤 기능과 사용량을 넣을지 정하는 경계다).

위험 신호:

- 고객이 "비용은 궁금하지만 가격/마진 결정은 아직 없다"고 말한다.
- 보고서 공유 대상이 CEO(대표), CFO(재무 책임자), PM(제품 책임자), RevOps(매출 운영 담당) 중 누구인지 불명확하다(공유 대상이 없으면 리포트가 구매 의사결정으로 이어지기 어렵다).
- 월 LLM/API 비용은 있지만 customer/feature/plan/revenue 매핑(비용을 고객, 기능, 요금제, 매출에 연결하는 작업)이 없다.
- 고객이 "한 번 받아보고 필요하면 다시 연락"이라고 말한다.

성공 기준:

- 15명 인터뷰 중 5명 이상이 "우리 데이터로 해보고 싶다"고 말한다.
- 3명 이상이 유료 파일럿(작게 돈을 내고 실제 데이터로 시험), 예약금(구매 의사가 말뿐인지 확인하는 선결제), 또는 명확한 예산 출처를 제시한다.
- Snapshot 고객의 40% 이상이 30일 안에 Monthly Review나 follow-up review(후속 검산 미팅)를 예약한다.

## 2. 비용 위험

COGS(매출원가, 상품을 제공하는 데 직접 들어가는 비용)의 핵심은 서버비가 아니라 사람 시간이다. 데이터 이해(고객 CSV/로그가 무엇을 뜻하는지 파악), 컬럼 매핑(예: `user_id`가 고객인지 계정인지, `plan`이 요금제인지 내부 등급인지 연결), Trust 설명(민감정보를 어떻게 차단/보관/삭제하는지 설명), report QA(리포트 숫자와 문장이 맞는지 검수), review call(고객과 결과를 설명하는 미팅), follow-up(추가 질문/수정 대응)이 붙으면 30만 원 상품은 금방 적자가 된다.

보수적 모델:

```text
Report COGS
= direct human hours * loaded hourly cost
+ LLM/API/inference
+ Supabase/server/storage
+ report/export/tooling
+ review-call/support/rework allowance
```

위 모델의 의미:

- `direct human hours`: 사람이 직접 투입한 시간(분석, 설명, 검수, 미팅).
- `loaded hourly cost`: 시간당 인건비를 실제 비용으로 환산한 값(월급뿐 아니라 세금, 운영비, 기회비용까지 포함한 보수적 비용).
- `LLM/API/inference`: 모델 호출과 추론 실행 비용.
- `report/export/tooling`: PDF/Markdown/JSON 생성, 저장, 다운로드, 내부 도구 운영 비용.
- `rework allowance`: 틀린 매핑, 고객 수정 요청, 설명 보강처럼 다시 일할 가능성을 미리 잡아둔 비용.

가드레일 예시:

| 상품 가격 | 목표 GM(gross margin, 매출총이익률) | 허용 COGS(매출원가) | loaded cost(실제 시간당 인건비) 8만 원/h 기준 허용 인력 시간 |
|---:|---:|---:|---:|
| 30만 원 | 60% | 12만 원 | 약 1.25h(사람이 1시간 15분 정도만 써도 한계) |
| 70만 원 | 60% | 28만 원 | 약 3.1h(반나절 가까운 분석까지는 가능) |
| 100만 원 | 60% | 40만 원 | 약 4.5h(검수/미팅까지 포함해도 버틸 수 있는 구간) |
| 월 50만 원 | 65% | 17.5만 원 | 약 1.8h(반복 리뷰는 매우 짧게 끝나야 함) |

위험 신호:

- Data Readiness Check에 45분 이상 들어간다.
- Snapshot 하나에 5시간 이상 들어간다.
- Trust 질문이 매 고객마다 새로 생긴다.
- 리포트 QA에서 narrative claim(숫자를 해석하는 문장, 예: "이 고객은 손해 고객이다")을 사람이 대부분 다시 쓴다.

성공 기준:

- Free Fit Check는 사람 투입 10-15분 이하.
- Data Readiness Check는 사람 투입 45분 이하, gross margin 60% 이상.
- 첫 AI Cost Snapshot은 70만-100만 원 가격에서 사람 투입 3.5시간 이하.
- 반복 Monthly Review는 사람 투입 1.5시간 이하, gross margin 70% 이상.

## 3. 고객획득비용(CAC) 위험

CAC(고객획득비용)의 가장 큰 항목은 광고비가 아니라 신뢰 형성 시간이다. AgentPayroll은 usage log(사용 로그), revenue CSV(고객/플랜별 매출 파일), plan 정보(요금제 정보)처럼 민감한 데이터를 다루기 때문에 구매자는 "얼마나 아끼나?"와 동시에 "우리 데이터가 어디로 가나?"를 묻는다.

Trust Gate는 보안 기능이 아니라 conversion UX(구매 전환을 돕는 사용자 경험)다. 업로드 직후 raw prompt(사용자가 AI에게 입력한 원문), API key(외부 API를 호출할 수 있는 비밀 키), PII(개인식별정보), retention(데이터 보관/삭제 기간), allowed scope(분석에 쓰는 데이터 범위)를 보여주는 것은 마찰이 아니라 구매 불안을 낮추는 핵심 장치다.

CAC 리스크 모델:

```text
CAC
= acquisition_cost
+ free_fit_check_minutes * operator_hourly_cost
+ trust_review_minutes * operator_hourly_cost
+ data_mapping_minutes * operator_hourly_cost
+ sales_review_minutes * operator_hourly_cost
+ security_artifact_cost
```

위 모델의 의미:

- `acquisition_cost`: 광고, 콘텐츠, 소개, 영업 등 리드를 데려오는 비용.
- `free_fit_check_minutes`: 무료 적합성 확인에 들어간 시간.
- `trust_review_minutes`: 보안/개인정보/데이터 보관 질문에 답한 시간.
- `data_mapping_minutes`: 고객 데이터 컬럼을 AgentPayroll 분석 구조에 맞추는 시간.
- `security_artifact_cost`: 보안 FAQ, 데이터 흐름도, 삭제 정책 문서 같은 신뢰 자료를 만드는 비용.

ICP 필터:

| 등급 | 조건 | 라우팅 |
|---|---|---|
| A | AI 기능 production(실제 고객이 쓰는 상태), 월 LLM/API 비용 존재, raw prompt 없는 metadata export(민감한 원문 없이 사용량/고객/기능 정보만 내보내기) 가능, 고객/기능/플랜/매출 중 3개 이상 매핑 가능, pricing/margin decision owner(가격/마진 결정을 내릴 책임자) 있음 | AI Cost Snapshot 또는 Monthly Review |
| B | AI 기능은 운영 중이나 schema/revenue mapping(데이터 구조와 매출 연결)이 불완전, metadata-only 분석(민감 원문 없이 분석)에는 열려 있음 | 유료 Data Readiness Check |
| C | 아이디어 단계, 비용 작음, 로그/매출 연결 없음, "나중에" 반응(지금 돈 낼 문제는 아니라는 신호) | sample report, waitlist, 재접촉 |

성공 기준:

- Free Fit Check 완료 시간 10분 이하.
- Free Fit Check에서 paid readiness/snapshot 전환율(무료 확인 후 유료 준비도 점검 또는 Snapshot으로 넘어가는 비율) 15-25% 이상.
- A급 리드의 첫 유료 전환까지 operator touch(사람이 직접 연락/미팅/설명을 한 횟수) 2회 이하.
- 초기 paid CAC payback(고객획득비용을 유료 매출의 이익으로 회수하는 기간)은 12개월 이하, 18개월 초과 시 ICP/가격/온보딩 재설계.

## 4. 유지율 위험

유지율(고객이 구독을 끊지 않고 계속 남는 비율)은 "매월 같은 문제가 반복되는가"에 달려 있다. 비용이 한 번 보였다는 사실만으로 월구독은 유지되지 않는다. 유지되는 고객은 매월 모델 mix(어떤 모델을 얼마나 쓰는지의 구성), usage(사용량), heavy user(사용량이 매우 큰 고객), pricing(가격정책), cap(사용량 제한), enterprise deal(대형 고객별 별도 계약), margin policy(어느 정도 마진을 최소 기준으로 볼지)가 변하는 팀이다.

Decision Log(어떤 결정을 왜 내렸는지 남기는 기록)가 retention engine(고객이 계속 쓰게 만드는 핵심 장치)인 이유는 "운영 기억"을 만들기 때문이다. 다음 달 리뷰는 새 PDF가 아니라 지난달 `adopt/reject/hold`(채택/거절/보류)의 결과를 검산하고 다음 결정을 만드는 흐름이어야 한다.

Monthly Review 활성화 조건:

- Snapshot 완료.
- 최소 1개 이상의 `adopt/reject/hold` 결정(추천안을 실행할지, 거절할지, 보류할지 명확히 기록).
- 다음 리뷰 날짜와 owner(책임자) 지정.
- customer/feature/plan 중 최소 2개 축의 attribution(비용과 매출을 고객/기능/요금제 단위로 나누어 귀속시키는 작업) 가능.
- CEO/PM/Finance에게 공유 가능한 persisted report artifact(서버/DB에 저장된 리포트 산출물) 생성.

위험 신호:

- Snapshot 후 14일 내 decision(채택/거절/보류 같은 명확한 결정)이 없다.
- report 공유 대상(대표, PM, 재무 담당 등)이 없다.
- 다음 리뷰 날짜(다시 검산할 시점)가 없다.
- customer-level margin(고객별로 남는 돈)이 없다.
- 고객이 "필요할 때 다시 연락"이라고 말한다.

성공 기준:

- Snapshot 고객의 40% 이상이 Review Call에서 실제 decision을 기록한다.
- decision 기록 고객의 50% 이상이 다음 달 follow-up review를 예약한다.
- 첫 3개월 cohort(같은 시기에 시작한 고객 묶음) 기준 Monthly Review GRR(기존 매출 유지율, 확장 매출은 제외) 90% 이상.
- Monthly Review 고객의 30% 이상이 workspace(추가 팀/제품 공간), connector(Slack/Email/Stripe/Metronome 같은 외부 연결), report recipient(리포트 수신자), pricing scenario(가격정책 시뮬레이션) 중 하나를 확장한다.

## 5. 반복구매 가능성 위험

PDF는 가치 증명물(대표나 투자자에게 보여줄 수 있는 결과물)이지만 반복구매 이유는 아니다. 반복구매는 "지난번과 무엇이 달라졌는가"에서 나온다(예: 어떤 고객이 새로 손해가 됐는지, 지난번 cap 적용이 효과가 있었는지, 모델 변경 후 마진이 좋아졌는지).

반복 트리거:

| 트리거 | 고객 신호 | AgentPayroll 액션 |
|---|---|---|
| 모델 가격/성능 변화 | provider 가격표, 신모델, cache/batch/context 정책 변경(provider는 OpenAI/Anthropic/Google 같은 모델 제공자, cache는 재사용 입력 할인, batch는 비동기 대량 처리 할인, context는 한 번에 넣을 수 있는 입력 길이) | 지난 결정 재검토 + workload별 재시뮬레이션(우리 실제 사용 패턴으로 다시 계산) |
| 고객 사용량 변화 | heavy user 증가, 특정 고객/플랜 margin 하락 | 손해 고객/기능 리포트 + cap/credit/overage 초안(overage는 기본 제공량 초과 사용에 대한 추가 과금) |
| 가격정책 변경 | seat -> usage, credit, hybrid, fair-use cap 검토(seat는 사용자 좌석당 과금, usage는 사용량 과금, hybrid는 기본료+사용량 혼합, fair-use cap은 과도한 사용을 막는 공정 사용 한도) | pricing scenario + rate card draft(가격 시나리오와 결제 시스템에 넣기 전 요금표 초안) |
| 예산/cap 초과 | 월 budget, project cap, alert threshold 접근(budget은 예산, project cap은 프로젝트별 한도, alert threshold는 경고 기준) | spend guardrail + next-month forecast(비용 가드레일과 다음 달 예측) |
| Board/CEO/CFO 보고 | 월간 운영회의, 투자자 업데이트 | persisted PDF + decision history diff(저장된 PDF와 지난 결정 대비 변화 요약) |
| 데이터 구조 변화 | 새 feature/model/session/agent_run 추가(feature는 제품 기능, model은 AI 모델, session은 사용자 작업 단위, agent_run은 AI agent 실행 기록) | schema mapping check + attribution coverage report(데이터 구조 매핑 확인과 비용 귀속 범위 리포트) |
| 결정 후 결과 확인 | 지난 adopt/reject/hold 효과 불명 | decision outcome review(지난 결정이 실제로 비용/마진을 개선했는지 검산) |

성공 기준:

- 유료 Snapshot 고객 중 40% 이상이 30일 내 Monthly Review 또는 다음 분석 일정을 잡는다.
- 리포트의 70% 이상이 `adopt/reject/hold`(채택/거절/보류) 중 하나로 끝난다.
- 리포트 수신자 중 50% 이상이 CEO/PM/Finance/RevOps(대표/제품/재무/매출 운영 담당) 중 1명 이상에게 공유한다.
- 매월 리포트에서 "지난번과 달라진 것"이 최소 3개 이상 자동 산출된다.

## 위험한 부분 TOP 5

1. **ACV가 낮은데 신뢰 형성 비용이 높다.** ACV(Annual Contract Value, 고객 1곳에서 1년에 받을 수 있는 계약 금액)가 낮은데 민감한 usage/revenue/log(사용량/매출/로그)를 맡기는 제품이라 Trust 설명과 onboarding(초기 세팅/교육) 시간이 커질 수 있다.
2. **저가 Data Readiness가 적자 리드 처리로 변질될 수 있다.** 5만-15만 원이면 자동화 없이는 돈을 벌기 어렵다(사람이 1시간만 붙어도 실제 이익이 거의 사라질 수 있다).
3. **Snapshot이 일회성 컨설팅으로 끝날 수 있다.** Monthly Review로 전환되지 않으면 LTV(고객 생애 매출)가 낮다.
4. **고객의 LLM 비용 규모가 작으면 ROI 설명이 약하다.** ROI(Return on Investment, 투자 대비 효과)를 보여주려면 줄이거나 막을 수 있는 비용 누수가 충분히 커야 한다. 월 LLM/API 비용이나 매출 연결이 약한 팀은 30만-100만 원 리포트도 비싸게 느낀다.
5. **Trust Gate가 구매 장벽이자 운영 비용이다.** 잘 보여주면 전환율을 높이지만, 매번 수동 설명하면 CAC와 CS(Customer Support, 고객 지원) 비용이 커진다.

## 추천 방향

- Free Fit Check는 무료 컨설팅이 아니라 10분 이하 ICP 필터(유료 분석 대상인지 빠르게 거르는 질문지/체크)로 제한한다.
- Data Readiness Check는 유료 선별 장치로 유지하되 사람 투입 45분을 넘으면 가격 또는 범위를 조정한다(예: 9만 원으로는 CSV 구조만 보고, 상세 매핑은 별도 유료로 분리).
- AI Cost Snapshot은 `AI Margin Snapshot` 또는 `AI Pricing Decision Pack`으로 메시지를 테스트하고 70만-150만 원 가격대를 검증한다(비용표보다 가격/마진 결정 자료로 포지셔닝할 때 더 높은 가격을 받을 수 있는지 확인).
- Monthly Review는 "월간 리포트 반복"이 아니라 "지난 결정의 효과 검산 + 새 손해 고객/기능 감시 + pricing policy 초안"으로 판다(pricing policy는 cap, credit, overage, plan boundary 같은 가격 운영 규칙).
- 핵심 KPI(Key Performance Indicator, 반드시 추적할 핵심 지표)는 `report당 사람 시간`, `Snapshot -> Monthly 전환율`, `월간 유지 개월 수`, `고객당 발견한 비용 누수액`, `누수액 대비 가격 비율`, `Trust 질문 왕복 횟수`다.

한 문장으로 줄이면: **AgentPayroll은 pain은 좋지만, 돈을 버는 구조는 리포트 자동화보다 ICP 선별, Trust 온보딩, Monthly Review 전환율에 달려 있다.**

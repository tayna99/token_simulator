# AgentPayroll 구매자 반론 PDCA

작성일: 2026-05-26
상태: active loop(현재 돌고 있는 반복 개선 루프)

## Plan(계획)

구매자 반론 리뷰의 결론은 방향은 맞지만 제품 가치가 아직 충분히 빠르게 증명되지 않는다는 것이다. 이 루프는 첫 5분을 sales surface(구매자가 가치를 판단하는 첫 화면/첫 경험)로 본다.

핵심 목표:

- AgentPayroll이 없을 때 구매자가 무엇을 잃는지 보여준다.
- 업로드 불안이 실행을 막기 전에 데이터 안전성을 눈에 보이게 만든다.
- 실제 usage CSV(사용량 로그 파일)와 revenue CSV(매출 파일)로 고객별/플랜별 마진 근거를 만든다.

P0 구현 베팅(가장 먼저 검증할 핵심 가정):

1. **Money leak amount(돈이 새는 금액)**
   - diagnosis snapshot(진단 시점의 분석 데이터 묶음)에 deterministic ROI proof(결정론적으로 계산한 투자 대비 효과 근거)를 추가한다.
   - Target buyer sentence: "이번 달 추정 누수는 $X입니다."
   - 입력: imported usage rows(가져온 사용량 행), customer revenue(고객별 매출), plan revenue(플랜별 매출), pricing scenario results(가격 시나리오 결과).

2. **Revenue CSV mapping(매출 CSV 매핑)**
   - customer 또는 Stripe-style revenue exports(고객/구독 매출 내보내기 파일)를 사용 로그와 별도로 파싱한다.
   - `customer_id`와 `plan_id`로 조인한다.
   - 사용자가 실제 매출 데이터를 제공하면 sample revenue assumptions(샘플 매출 가정)에 의존하지 않는다.

3. **Trust proof(신뢰 근거)**
   - blocked fields(차단된 필드), snapshot/report fields(진단/리포트에 들어간 필드), retention/delete intent(보관/삭제 의도)를 보여준다.
   - Target buyer sentence: "prompt/API key는 snapshot/report로 넘어가지 않았습니다."

P1 후속 베팅:

1. **Import templates(가져오기 템플릿)**
   - Helicone export(Helicone 내보내기 파일).
   - Langfuse export(Langfuse 내보내기 파일).
   - OpenAI usage export(OpenAI 사용량 내보내기 파일).
   - Stripe customer/subscription export(Stripe 고객/구독 내보내기 파일).

2. **ICP timing gate(이상적인 고객군의 구매 시점 판정 관문)**
   - Monthly AI spend(월 AI 지출).
   - Customer revenue mapping availability(고객별 매출 매핑 가능 여부).
   - Heavy-user suspicion(많이 쓰는 고객 때문에 손해가 날 가능성).
   - Pricing change urgency(가격 변경 긴급도).
   - CEO/Finance reporting need(대표/재무 보고 필요).

3. **Buyer interview coding(구매자 인터뷰 태깅)**
   - 거절 문장을 6개 objection bucket(반론 유형 묶음)으로 분류한다.
   - 반복되는 구매자 발언은 product copy(제품 문구)나 requirements(요구사항)로 승격한다.

## Do(실행)

구현 작업은 각 작업자가 서로 겹치지 않는 파일 묶음을 맡도록 나눈다.

| Workstream(작업 흐름) | Owner(담당자) | Output(산출물) |
| --- | --- | --- |
| ROI proof(투자 대비 효과 근거) | subagent | `DiagnosisSnapshot`이 leak/payback proof(누수액/회수 기간 근거)를 노출 |
| Trust proof(신뢰 근거) | subagent | Trust inspection(신뢰 점검)과 패널이 proof details(근거 세부 정보)를 표시 |
| Revenue mapping(매출 매핑) | subagent | 순수 revenue CSV parser(매출 CSV 파서)와 테스트 |
| UI integration(UI 연결) | parent session | 첫 실행 workspace(작업 공간)에 revenue mapping과 ROI proof를 보이는 흐름으로 연결 |
| Research loop(리서치 루프) | parent session | 인터뷰 가이드와 PDCA 문서 업데이트 |

## Check(점검)

최소 검증:

- `npm run test:run -- src/features/report-first`
- `npm run test:run -- src/features/trust`
- `npm run test:run -- src/features/unit-economics src/features/pricing`

커밋 전 전체 게이트:

- `npm run test:run`
- `npm run build`

## Act(조정)

다음 루프의 의사결정 규칙:

- 사용자가 "Can we try our own logs?(우리 로그로 해볼 수 있나?)"라고 묻는다면 import templates와 revenue mapping을 우선한다.
- 사용자가 업로드에서 망설이면 Trust proof, redaction preview(가려질 필드 미리보기), retention policy(보관/삭제 정책), security FAQ(보안 질문 답변)를 우선한다.
- 사용자가 "nice dashboard(괜찮은 대시보드네요)"라고 말하면 첫 화면을 money leak amount와 decision artifact(공유 가능한 의사결정 결과물 파일) 중심으로 더 좁힌다.
- 사용자가 "we can SQL this(SQL로 할 수 있다)"라고 말하면 절약되는 시간, 반복 가능성, PM/CEO-ready report output(제품/대표에게 바로 공유 가능한 리포트 출력)을 보여준다.
- 사용자가 "not a problem yet(아직 문제는 아니다)"라고 말하면 free diagnosis(무료 진단)로 보내고 구매 시점 신호를 수집한다.

수집할 성공 발언:

- "이 고객이 손해인지 몰랐다."
- "이걸로 가격을 바꿔야겠다."
- "우리 실제 사용 기록으로 해볼 수 있나?"
- "prompt를 안 가져가면 붙여볼 수 있다."
- "다음 달에도 같은 리포트를 받고 싶다."

수집할 반대 신호:

- "토큰 계산기로 쓸게요."
- "엑셀로 충분합니다."
- "리포트는 보는데 결정 로그는 안 씁니다."
- "AI 비용은 아직 마진 문제가 아닙니다."
- "사용량 로그를 외부에 못 올립니다."

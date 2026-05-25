# MVP WTP 인터뷰 가이드

**목적:** 사람들이 실제로 돈을 낼 지점이 비용 절감인지, 고객당 원가인지, gross margin(매출총이익률)인지, 가격정책인지, 리포트인지 확인한다. 여기서 MVP는 최소 기능 제품, WTP는 지불 의향을 뜻한다.

## 1. 인터뷰 대상

처음에는 15명을 목표로 한다.

| 그룹 | 목표 인원 | 확인할 것 |
| --- | ---: | --- |
| AI SaaS 창업자/CEO/PM | 5 | 가격정책, 고객별 손익, 리포트 공유 니즈 |
| 개발자/ML/백엔드/인프라 | 5 | 로그, 토큰, 기능별 비용, 모델 교체 판단 |
| Finance/Ops/RevOps/CS Lead | 5 | 예산, 마진, CS 이관 비용, 운영 action(실행할 조치) |

## 2. 시작 질문

아래 질문은 "좋은 아이디어인가요?"를 묻지 않는다. 지금 어떻게 해결하는지 확인한다.

1. 지금 제품에서 LLM/API 비용이 월 얼마 정도 나오나요?
2. 그 비용을 기능별로 나눠서 볼 수 있나요?
3. 고객 1명당 AI 원가를 알고 있나요?
4. heavy user(많이 쓰는 고객) 때문에 손해 본 고객이나 플랜이 있나요?
5. AI 기능별 gross margin을 보나요?
6. 보고서 1개, 고객 문의 1건, job 1회당 원가를 계산하나요?
7. AI 기능 가격은 어떻게 정했나요?
8. usage-based pricing이나 credit pricing을 고민 중인가요?
9. 사용량이 많은 고객이 손해 고객이 될 수 있나요?
10. 이 숫자를 CEO/CFO/투자자에게 보고해야 하나요?
11. 이 숫자를 지금은 어떻게 계산하나요: 스프레드시트, SQL, 로그, 감?
12. 이 계산에 한 달에 시간이 얼마나 드나요?
13. 이 숫자가 없어서 가격정책, 영업, 고객 제한 판단이 늦어진 적 있나요?
14. 이 리포트를 받으면 누구에게 공유하나요: CEO, PM, Finance, 개발팀?

## 3. 돈 낼 가능성 질문

"돈 내실래요?"라고 직접 묻지 않는다. 대신 예산과 대체 비용을 묻는다.

1. 지금 이 문제를 해결하려고 쓰는 도구가 있나요?
2. 그 도구나 내부 작업에 얼마를 쓰고 있나요?
3. 내부에서 이 계산에 몇 시간이 들어가나요?
4. 이 숫자가 틀리면 어떤 손실이 생기나요?
5. 자동화하면 어느 팀 예산에서 살 수 있나요?
6. 구매자는 개발팀인가요, PM인가요, Finance인가요?
7. 결제하려면 어떤 조건이 필요하나요: 보안, CSV, SDK(개발자가 기능을 붙이는 코드 패키지), Slack, 보고서 export(내보내기)?

## 4. 샘플 리포트 반응 확인

인터뷰 중 [sample-pm-ceo-margin-report.md](sample-pm-ceo-margin-report.md)를 보여주고 묻는다.

1. 이 리포트에서 바로 쓸 수 있는 숫자는 무엇인가요?
2. 이 숫자로 실제로 어떤 결정을 할 수 있나요?
3. 빠진 숫자는 무엇인가요?
4. 이걸 CEO/PM/Finance에게 공유할 수 있나요?
5. 우리 데이터로 해보고 싶나요?
6. 매주/매월 자동으로 받으면 얼마까지 낼 수 있나요?

## 5. 강한 신호와 약한 신호

| 신호 | 해석 |
| --- | --- |
| "지금 스프레드시트로 하고 있어요." | 강함 |
| "SQL로 매번 뽑아요." | 강함 |
| "큰 고객이 손해인지 몰라요." | 매우 강함 |
| "heavy user 때문에 특정 플랜이 손해일 수 있어요." | 매우 강함 |
| "usage-based pricing이나 AI credit으로 바꾸는 중이에요." | 매우 강함 |
| "AI 기능별 gross margin을 CFO/CEO에게 보여줘야 해요." | 매우 강함 |
| "CEO에게 보여줘야겠네요." | 매우 강함 |
| "우리 로그로 해볼 수 있나요?" | 매우 강함 |
| "좋네요, 나중에 필요할 것 같아요." | 약함 |
| "아직 비용이 작아요." | 약함 |
| "개발자가 대충 보고 있어요." | 약함 |
| "고객별/기능별 수익성 질문은 아직 없어요." | 약함 |
| "pricing이나 margin 결정과는 연결되지 않아요." | 약함 |

## 6. 구매 거부 문장 코딩

인터뷰 후 거부 문장을 아래 6개 버킷으로 태깅한다. 한 인터뷰에 여러 태그가 붙을 수 있다.

| 버킷 | 태그 | 대표 문장 | 다음 액션 |
| --- | --- | --- | --- |
| 마진 문제 미인식 | `objection_margin_not_felt` | "비용은 보는데 아직 마진 문제는 아니에요." | AI 비용을 COGS와 고객/기능 손익으로 번역하는 첫 화면 문구 보강 |
| 데이터 불안 | `objection_data_trust` | "prompt나 고객 데이터가 들어가는 것 아닌가요?" | Trust Gate, blocked columns, snapshot fields, retention/delete proof 강화 |
| 대체재 충분 | `objection_excel_sql_console` | "엑셀이나 SQL로 보면 됩니다." | 반복 리포트, decision log(의사결정 기록), PM/CEO 공유 artifact(공유 가능한 결과물 파일)를 비교 포인트로 제시 |
| ROI 불명확 | `objection_roi_unclear` | "그래서 얼마를 아끼는 건가요?" | monthly leak(월간 누수 비용), policy delta(정책 변경 전후 차이), payback hint(회수 기간 힌트)를 리포트 첫 줄에 표시 |
| 타이밍 부적합 | `objection_wrong_timing` | "아직 비용이 작아요." | free/low-cost diagnosis로 라우팅하고 재접촉 시점 기록 |
| 메시지 혼선 | `objection_positioning_confusing` | "Payroll이면 HR 도구인가요?" | AgentPayroll보다 AI 비용 진단/손해 고객 찾기/AI 기능 마진 분석 문구 우선 |

## 7. 인터뷰 기록 양식

```text
interview_id:
date:
persona:
company_stage:
ai_feature_type:
monthly_llm_cost_known: yes/no/roughly
feature_cost_known: yes/no
cost_per_customer_known: yes/no
pricing_decision_pain: 1-5
margin_pain: 1-5
current_workaround:
report_share_target:
strongest_quote:
would_share_sample_report: yes/no
asked_for_own_data_analysis: yes/no
wtp_signal: 1-5
objection_tags:
exact_refusal_quote:
trust_blocker:
roi_number_needed:
next_follow_up_date:
notes:
```

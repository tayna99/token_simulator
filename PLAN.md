# 개발자 우선 비용 의사결정 워크스페이스 계획

> 목적: 기존의 넓은 기능 집합을 개발자 우선 플래너 방향과 맞춘다. 개발자가 가격, workload(작업량 가정), migration(모델 교체), optimization(비용 최적화) 결정을 빠르게 내리는 데 도움이 되는 기능만 남기고, 나머지는 접거나 뒤로 미룬다.

## North Star(핵심 기준)

앱은 하나의 작업 화면에서 아래 질문에 답해야 한다.

1. 이 workload(작업량 가정)는 얼마의 비용이 드는가?
2. 어떤 lever(비용을 바꾸는 조정 손잡이)가 비용을 가장 빠르게 바꾸는가?
3. 모델을 바꾸면 어떤 일이 생기는가?
4. 가격 가정을 믿을 수 있는가?

이 앱은 기능 전시장이 아니다. 위 질문 중 하나를 돕지 않는 패널은 숨기거나, 접거나, 나중 범위로 미룬다.

## 현재 넓은 추가 기능과 개발자 우선 계획의 비교

### 반드시 유지

아래 기능은 개발자에게 유용하므로 1급 기능으로 남긴다. 다만 많은 기능은 위치와 계산 규율을 더 조여야 한다.

| Component | 유지? | 개발자 가치 | 필요한 조정 |
|---|---:|---|---|
| `WorkloadBuilder` | 예 | 실제 트래픽 가정을 월간 토큰과 요청 수로 바꾼다. | 기본 입력 모드로 둔다. 직접 토큰 입력은 Advanced(고급)로 내린다. |
| `ModelSelector` | 예 | 개발자가 모델 가격, context(문맥 길이), source(출처)를 빠르게 비교하게 한다. | provider, context, 입력/출력 가격 쌍, source link, verified date, cache/batch 지원을 보여준다. |
| `DecisionSummaryStrip` | 예 | 현재 모델과 후보 모델의 비용 및 요청당 비용을 즉시 보여준다. | 입력 바로 아래에 둔다. 작고 밀도 있게 유지한다. |
| `MigrationPanel` | 예 | 핵심 모델 교체 결정 영역이다. | 입력/출력 breakdown(항목별 분해), cache/batch 절감액, same-model guard(동일 모델 보호 장치)를 추가한다. |
| `ScenarioPlanner` | 예 | best/base/worst 트래픽 변화에 대해 생각하게 한다. | 각 열에서 요청 수, 입력, 출력, cache, batch를 편집할 수 있게 한다. |
| `SummaryCard` | 예 | board-ready export(이사회/공유용 내보내기)다. | 보조 영역으로 두고 workload 가정과 고정 provenance(가격 근거 문구)를 사용한다. |
| `CacheAnalyzer` | 예 | 실제로 적용 가능한 최적화 lever다. | calculator 출력만 사용하고 cache 변화로 생기는 예상 절감액을 보여준다. |
| `BatchAnalyzer` | 예 | 실제로 적용 가능한 최적화 lever다. | 일반 조언이 아니라 batch가 적용 가능한 조건을 보여준다. |
| `RequestPatternAnalyzer` | 예 | 개발자가 요청 유형을 비용 driver(비용을 밀어 올리는 요인)에 매핑하게 한다. | 요청 패턴을 workload 계산과 연결하고, invented percentages(지어낸 비율)를 쓰지 않는다. |
| `CostAttributionByFeature` | 예 | 어떤 제품 기능이 사용량을 만드는지 아는 팀에 유용하다. | 정적 가짜 분석이 아니라 편집 가능한 allocation(배분)으로 둔다. |
| `CostPerBusinessMetric` | 예 | metric(업무 지표)이 사용자가 설정한 값일 때 유용하다. | ticket, PR, users, jobs 같은 명시적 denominator(분모) 입력이 있을 때만 유지한다. |
| `ModelComparisonMatrix` | 예 | 모델 shortlist(후보 목록) 결정에 유용하다. | 작게 유지하고 요청당 비용, context, cache/batch 지원으로 순위를 매긴다. |

### 유지하되 낮은 우선순위로 내림

아래 기능은 유용할 수 있지만, 기본 개발자 의사결정 흐름과 경쟁하면 안 된다.

| Component | 위치 | 이유 |
|---|---|---|
| `BudgetCap` | Guardrails(안전장치) 아래 접힘 영역 | 비용을 안 뒤에 유용하다. |
| `BudgetAlert` / `CostAlertConfig` | 하나의 Guardrails 패널로 합침 | 의도가 중복된다. 예산/알림 설정 하나로 합친다. |
| `CostTrendAnalyzer` | 뒤쪽 섹션 | scenario 가정이 있어야 의미가 있다. 과거 데이터가 있는 척하지 않는다. |
| `SavingsPaybackTimeline` | Migration 또는 Roadmap으로 접음 | 절감액이 실제 calculator delta(계산 차이)에 기반할 때만 유용하다. |
| `CostOptimizationRoadmap` | Optimization Queue(최적화 대기열)로 유지 | cache, batch, 모델 교체, 입력 축소, 출력 축소 같은 실제 lever를 순위화하면 유용하다. |
| `ModelRecommendation` | 뒤쪽 섹션 | 순위 기준을 설명할 때만 유용하다. black-box recommendation(근거 없는 추천)을 피한다. |
| `RequirementsFilter` | 뒤쪽 섹션 | context/provider/features 조건으로 후보 모델을 좁히는 데 유용하다. |
| `TokenEfficiency` | 뒤쪽 섹션 | 요청당 비용과 입력/출력 비율을 쓰면 유용하다. |
| `ExportAnalysis` | 하단 action | export(내보내기)는 분석의 일부가 아니라 결과물이다. |
| `ConfigPanel` | Header utility(상단 유틸리티) | 가정 저장/불러오기에 좋다. |

### 기본 흐름에서 제거하거나 뒤로 미룸

아래 기능은 임원용에 가깝거나, 현재 데이터로 뒷받침되지 않거나, 도구를 시끄럽게 만들 가능성이 높다.

| Component | 결정 | 이유 |
|---|---|---|
| `TCOCalculator` | 보류 | 3년 TCO(총소유비용)는 주로 사업 계획이며, 개발자 비용 디버깅의 핵심이 아니다. |
| `BreakevenAnalysis` | `MigrationPanel`로 접음 | 유용하지만 독립 패널은 중복이다. 후보 모델이 비용을 줄일 때만 payback months(회수 개월 수)를 보여준다. |
| `RegionalCostAnalysis` | 보류 | 실제 지역별 가격/catalog(요금표) 지원이 필요하다. 정적 지역 배수는 오해를 만든다. |
| `SLACostCalculator` | 보류 | 실제 latency/SLA(응답 지연/서비스 수준 약속) 모델 가정이 필요하다. 없으면 추측이다. |
| `ComplianceRequirements` | 보류 | procurement(구매/조달)에는 중요하지만 핵심 개발자 가격 workflow(작업 흐름)는 아니다. |
| `ROICalculator` | 보류 | 임원 가치는 있지만 개발자가 바로 행동하기 어렵다. |
| `TeamCostAnalysis` | 나중에 `CostAllocationByTeam`으로 대체 | 팀 단위 attribution(비용 귀속)은 유용하지만 명시적 팀 입력이 필요하다. |
| `ProviderComparisonDashboard` | 축소 | 너무 넓다. 선택 모델 provenance(출처/검증 정보)와 matrix가 실무 필요를 채운다. |
| `ProviderComparison` | 축소 | 구체적인 선택 모델 차이를 보여주지 않으면 위와 같다. |
| `CustomPricingInput` | Advanced only(고급 전용) | enterprise/private pricing(기업별 비공개 가격)에는 유용하지만 기본 흐름을 붐비게 하면 안 된다. |
| `UseCaseRecommendations` | 보류 | 보통 일반론이 된다. requirements filter와 model matrix로 처리하는 편이 낫다. |
| `PerformanceTiers` | 보류 | 신뢰할 만한 benchmark data(벤치마크 데이터)가 필요하다. |
| `ModelPerformanceBenchmarks` | 보류 | 출처 있는 벤치마크가 필요하다. 성능 비교를 지어내지 않는다. |
| `FeatureCostBreakdown` | `CostAttributionByFeature`로 합침 | 같은 개념이다. |
| `OptimizationOpportunities` | `CostOptimizationRoadmap`으로 합침 | 같은 개념이다. |
| `MigrationPlaybook` | 보류 | 모델 결정을 내린 뒤에 유용하지, 결정 전에는 아니다. |
| `ModelFeatures` | 선택 모델 카드로 합침 | 기본 흐름에서는 지원 badge(지원 표시)면 충분하다. |

### 남은 Wishlist(희망 기능) 정리

| Wishlist Item | 우선순위 | 결정 |
|---|---:|---|
| Cost Allocation by Team/Project | 중간 | feature attribution 뒤에 만든다. 편집 가능한 team/project share가 필요하다. |
| Savings Tracker | 중간 | optimization plan이 생긴 뒤에 유용하다. projected vs actual(예상 대비 실제)을 수동으로 추적한다. |
| Cost Anomaly Detection | 낮음 | 실제 time-series data(시계열 사용량 데이터)나 가져온 사용량 데이터가 생길 때까지 보류한다. |
| Quota Management | 중간 | 사용자가 rate limit/monthly cap(속도 제한/월 한도)을 입력하면 유용하다. 차트가 아니라 Guardrails로 만든다. |
| Custom Report Generator | 낮음 | 보류한다. 현재 summary/export면 충분해야 한다. |

## 목표 페이지 구조

### 1. Setup(설정)

이 영역은 첫 화면 위쪽에 유지한다.

- 현재 모델 selector(선택기)
- 후보 모델 selector
- 선택된 각 모델 바로 아래에 provenance(가격/스펙 출처)를 표시:
  - provider
  - context window
  - input/output price
  - source link
  - last verified date
  - cache/batch support badges
- 입력 모드:
  - `Workload Builder` 기본값
  - `Direct Tokens (Advanced)` fallback(고급 대체 경로)
- 공통 optimization controls(최적화 조정값):
  - cache hit rate
  - batch enabled

### 2. Decision Strip(결정 요약 띠)

설정 바로 아래에 작고 밀도 있는 strip(가로 요약 영역) 하나를 둔다.

- 현재 월 비용
- 후보 월 비용
- 월간 delta(차이)
- 연간 delta
- 현재 요청당 비용
- 후보 요청당 비용

이 영역이 1차 답이다. 개발자가 한 섹션만 본다면 이것만으로도 충분해야 한다.

### 3. Lever Breakdown(조정 손잡이별 분해)

이 섹션은 무엇을 바꾸면 되는지 설명한다.

- 입력 비용
- 출력 비용
- Cached input cost(캐시된 입력 비용)
- Uncached input cost(캐시되지 않은 입력 비용)
- Cache savings(캐시 절감액)
- Batch savings(배치 절감액)
- 가장 큰 비용 driver
- 모델 교체에서 가장 큰 차이

여기에는 `MigrationPanel`, `CacheAnalyzer`, `BatchAnalyzer`를 사용한다. 같은 숫자를 세 개의 큰 카드로 나눌 필요가 없다면 한 패널에 넣는다.

### 4. Scenario Planner(시나리오 플래너)

편집 가능한 세 열:

- Best
- Base
- Worst

각 열에서 편집 가능한 필드:

- request multiplier
- average input multiplier
- average output multiplier
- cache hit rate
- batch mode

Base는 현재 workload를 상속해야 한다.

### 5. Developer Diagnostics(개발자 진단)

페이지 아래쪽에 두고, 필요하면 기본 접힘 상태로 둔다.

유지:

- `RequestPatternAnalyzer`
- `CostAttributionByFeature`
- `CostPerBusinessMetric`
- `ModelComparisonMatrix`
- `RequirementsFilter`
- `TokenEfficiency`

규칙: 각 패널은 사용자가 assumption(가정)을 편집하거나 선택하게 하거나, 구체적인 결정을 설명해야 한다. 정적 dashboard(보여주기만 하는 대시보드)는 여기서 유용하지 않다.

### 6. Guardrails(운영 안전장치)

작고 운영적으로 유지한다.

아래 기능을 하나의 영역으로 합친다.

- `BudgetCap`
- `BudgetAlert`
- `CostAlertConfig`
- 향후 `Quota Management`

이 섹션은 아래 질문에 답해야 한다.

- 이 workload가 예산을 넘는가?
- 어느 트래픽 수준에서 예산을 넘는가?
- 어떤 수동 alert threshold(알림 기준값)를 써야 하는가?
- 어떤 월간 quota(할당량)가 암시되는가?

### 7. Export(내보내기)

하단 섹션.

- `SummaryCard`
- copy/export actions
- static pricing catalog disclaimer(고정 가격표 주의 문구)
- 선택 모델 source links
- 선택 모델 verified dates

현재 월을 가격 최신성 증거로 쓰지 않는다.

## 데이터와 계산 규칙

### 비용 계산

모든 비용 계산은 `src/lib/calculator.ts`에 남긴다.

필수 결과 필드:

- `monthlyCost`
- `annualCost`
- `inputCost`
- `outputCost`
- `cachedInputCost`
- `uncachedInputCost`
- `monthlyRequests`
- `costPerRequest`
- `cacheSavings`
- `batchSavings`

정의:

- `cacheSavings`: 같은 workload/model에서 요청한 cache rate와 `cacheHitRate: 0`을 비교한 값. batch 설정은 그대로 둔다.
- `batchSavings`: 같은 workload/model에서 요청한 batch 설정과 `batchEnabled: false`를 비교한 값. cache 설정은 그대로 둔다.
- `costPerRequest`: `monthlyCost / monthlyRequests`. 월 요청 수가 `0`이면 `0`.

### Workload 계산

Workload 가정은 `src/lib/workload.ts`에 둔다.

기본 모드:

- `volumeBasis: 'requestsPerDay' | 'activeUsers'`
- `activeDaysPerMonth`
- `retryRate`
- `requestsPerDay`
- `activeUsers`
- `requestsPerUserPerDay`
- `avgInputTokensPerRequest`
- `avgOutputTokensPerRequest`

파생 출력:

- `monthlyRequests`
- `monthlyInputTokens`
- `monthlyOutputTokens`

컴포넌트는 파생 월간 총량을 소비한다. 컴포넌트가 비용 계산을 다시 유도하지 않는다.

### Formatting(표시 형식)

사용자에게 보이는 모든 숫자는 `src/lib/format.ts`를 통과한다.

컴포넌트에서 허용되는 포맷:

- 통화 직접 포맷 없음
- 퍼센트 직접 포맷 없음
- 토큰 직접 포맷 없음
- inline `toLocaleString` 금지
- inline `toFixed` 금지
- 수동 `'$' + value` 금지

필요한 표시 형식이 없으면 `format.ts`에 helper(도우미 함수)를 추가하고 테스트를 붙인다.

## 실제 구현 순서

### Phase 1: 핵심 결정 흐름을 실제로 만든다

- [x] `deriveMonthlyWorkload` 추가 또는 완성.
- [x] `calculateCost`와 `calculateMigrationDelta`에 요청 수와 절감 필드를 추가.
- [x] 기존 패널이 계속 작동하도록 `PlannerState`와 `toLegacySimState` 추가.
- [x] `WorkloadBuilder`를 기본 입력으로 설정.
- [x] 직접 토큰 입력은 Advanced로 유지.
- [x] 모델 selector에 선택 모델 provenance 추가.
- [x] `DecisionSummaryStrip` 추가.
- [x] `MigrationPanel`에 breakdown과 payback months 추가.

Exit criteria(완료 기준):

- `npm run test:run` 통과.
- `npm run build` 통과.
- workload 입력 변경 시 decision strip, migration, scenario, summary가 갱신됨.

### Phase 2: Dashboard noise(대시보드 소음)를 줄인다

- [x] `App.tsx`를 목표 페이지 구조로 재정렬.
- [x] 낮춘 패널을 Developer Diagnostics 또는 Guardrails 아래로 이동.
- [x] 기본 경로에서 중복 패널 제거.
- [x] 중복 기본 표면 패널 병합/제거:
  - `BudgetAlert` + `CostAlertConfig`는 기본 Guardrails에서 제거하고 `BudgetCap` + `BudgetForecast`로 대체.
  - `FeatureCostBreakdown`은 기본 표면에서 제거하고 `CostAttributionByFeature`는 유지.
  - `OptimizationOpportunities`는 기본 표면에서 제거하고 `CostOptimizationRoadmap`은 유지.
  - `ProviderComparison`은 기본 표면에서 제거하고 `ModelComparisonMatrix`와 선택 모델 카드는 유지.
- [x] 지원되지 않는 데이터가 필요한 패널 숨김/보류:
  - regional pricing
  - SLA/latency cost modeling
  - benchmark comparisons
  - anomaly detection

Exit criteria:

- 첫 viewport(첫 화면)에 긴 컴포넌트 갤러리가 아니라 설정과 결정 요약이 보인다.
- 보이는 모든 패널은 가정을 바꾸거나 결정을 설명한다.

### Phase 3: Diagnostics를 편집 가능하게 만든다

- [x] `RequestPatternAnalyzer`: 요청 유형 분포를 편집 가능하게 한다.
- [x] `CostAttributionByFeature`: 기능별 share를 편집 가능하게 하고 합계 검증.
- [x] `CostPerBusinessMetric`: 사용자가 denominator를 입력하도록 요구.
- [x] `ModelComparisonMatrix`: 요청당 비용, 월 전체 비용, context, cache, batch로 순위화.
- [x] `CostOptimizationRoadmap`: 실제 lever를 예상 월 절감액으로 순위화.

Exit criteria:

- 정적 가짜 분석 없음.
- 어떤 패널도 과거 데이터나 운영 데이터를 지어내지 않음.
- 모든 파생 비용은 여전히 `calculator.ts`를 통과함.

### Phase 4: Guardrails와 Export

- [x] 작고 밀도 있는 예산/quota guardrails 추가.
- [x] projected savings(예상 절감액)가 있을 때 선택적 manual savings tracker 추가.
- [x] `SummaryCard`가 workload 가정과 선택 모델 provenance를 사용하도록 업데이트.
- [x] same-model 문구가 오해를 만들지 않게 유지.
- [x] summary text에 `lang="en"` 유지.

Exit criteria:

- Exported summary(내보낸 요약)가 assumptions(가정), model sources, verified dates, migration delta를 명시.
- same-model scenario는 delta가 `$0`이라고 말함.

## 이번 패스의 명시적 Non-Goals(하지 않을 일)

- prompt-paste tokenizer(프롬프트 붙여넣기 토크나이저) 없음.
- live pricing fetch(실시간 가격 가져오기) 없음.
- catalog가 지원하지 않는 regional pricing 없음.
- 명시적 사용자 입력으로 뒷받침되지 않는 SLA/latency cost panel 없음.
- 출처 없는 benchmark claims 없음.
- time-series usage data 없이 anomaly detection 없음.
- executive ROI/TCO-first page 없음.

## 필요한 테스트

### Unit(순수 함수 테스트)

- `deriveMonthlyWorkload`
  - requests/day 기준
  - active-users 기준
  - retry rate
  - 잘못된/음수 입력
- `calculateCost`
  - cost/request
  - cache savings
  - batch savings
  - NaN guards
- `calculateMigrationDelta`
  - 더 싼 후보
  - 더 비싼 후보
  - same-model zero delta

### Component(컴포넌트 테스트)

변경된 모든 컴포넌트에는 `rerender` 또는 user-event state-change test(사용자 이벤트로 상태가 바뀌는 테스트)가 있어야 한다.

필수 커버리지:

- mode switch가 보이는 입력 표면을 갱신
- preset 적용이 workload mode를 갱신
- model provenance가 source/date/support를 렌더
- decision strip이 workload 변경 시 갱신
- migration breakdown이 cache/batch 변경 시 갱신
- scenario column edit가 해당 열에만 영향
- summary가 현재 월이 아니라 static pricing provenance를 사용

### Final Verification(최종 확인)

Run:

```bash
npm run test:run
npm run build
```

Expected:

- all tests pass
- TypeScript build passes
- any bundle-size warning is documented but not treated as failure

## 최종 제품 형태

완성된 앱은 개발자 비용 워크벤치처럼 느껴져야 한다.

- 밀도는 높지만 읽기 쉬움
- 한 페이지
- calculator first(계산 먼저)
- explanation second(설명 다음)
- governance third(운영 통제 그다음)
- export last(내보내기 마지막)

generic executive dashboard(일반적인 임원 대시보드)처럼 보이는 것은 기본 흐름에서 접거나, 합치거나, 제거한다.

# 토큰 시뮬레이터

AI 기능을 운영하는 팀이 LLM 사용량을 가져와서 기능별 원가, 마진, 비용 리스크를 이해하도록 돕는 도구입니다.

쉽게 말하면 이 서비스는 "우리 AI 기능이 얼마를 쓰고, 어디서 돈이 새고, 얼마에 팔아야 손해를 안 보는지" 보여줍니다.

## 왜 필요한가

AI 기능은 겉으로는 버튼 하나처럼 보이지만, 실제로는 매 호출마다 LLM 비용이 발생합니다. 구독제 SaaS에서는 이 비용이 운영비처럼 보일 수 있지만, 사용량당 과금이나 크레딧 과금으로 가면 LLM 비용은 곧 제품 원가가 됩니다.

예를 들어 다음 질문에 답할 수 있어야 합니다.

- RAG 챗봇은 한 달에 얼마를 쓰는가?
- 문서 요약 1건의 원가는 얼마인가?
- 고객문의 ticket 1건을 AI로 처리하면 얼마가 드는가?
- report 1개를 $1에 팔 때 마진이 남는가?
- 저가 모델로 바꾸면 진짜 싸지는가, 아니면 재시도/검수/CS 비용이 늘어나는가?
- 어떤 기능부터 캐싱, 배치 처리, 출력 제한, 모델 라우팅을 적용해야 하는가?

이 프로젝트의 핵심 관점은 단순한 토큰 계산이 아닙니다. LLM 비용을 제품 의사결정 언어로 바꾸는 것입니다.

## 누구를 위한 도구인가

주 사용자는 개발자입니다. 개발자는 로그를 연결하고, 기능명을 매핑하고, 비용 폭증의 원인을 찾고, 모델 교체나 캐싱 같은 기술적 개선을 검토합니다.

하지만 구매 이유는 개발자에게만 있지 않습니다.

- PM은 AI 기능의 가격 정책과 원가 구조를 이해해야 합니다.
- CEO와 창업자는 AI 기능이 실제로 돈이 되는지 봐야 합니다.
- Finance 팀은 고객별 원가와 마진 악화를 확인해야 합니다.
- CS/운영팀은 품질 저하가 재문의나 이관 비용으로 이어지는지 확인해야 합니다.
- AI 에이전시와 SI 팀은 고객사에 AI 기능의 월 운영비와 견적 근거를 설명해야 합니다.

개인이 ChatGPT 구독 비용을 비교하는 용도보다는, API 기반 AI 기능을 만들거나 운영하는 팀에 더 적합합니다.

## 제품 흐름

초기 화면은 사용자가 토큰 수를 직접 추측해서 넣는 방식이 아니라, 실제 LLM 사용 로그를 가져오는 방식으로 설계합니다.

```txt
1. 사용량 가져오기
2. 기능별로 묶기
3. 비용 자동 계산
4. 비즈니스 기준값 입력
5. 원가와 마진 계산
6. 절감 방법 추천
7. 품질 부담 비용 확인
8. 리포트와 알림으로 공유
```

### 1. 사용량 가져오기

초기 MVP는 CSV 업로드 또는 CSV 붙여넣기를 우선합니다.

필수 컬럼 예시는 다음과 같습니다.

```csv
timestamp,feature,model,input_tokens,output_tokens,total_cost,latency_ms,customer_id
2026-05-01,rag_chat,claude-sonnet-4.6,1200,450,0.010,1800,acme
2026-05-01,summary,gemini-3.1-flash,3000,800,0.004,900,globex
```

이 방식의 장점은 사용자가 평균 입력 토큰이나 평균 출력 토큰을 추측하지 않아도 된다는 점입니다. 토큰 사용량은 실제 LLM 호출 결과에서 가져오고, 앱은 이를 월 사용량과 기능별 비용으로 집계합니다.

### 2. 기능별로 묶기

LLM 호출 로그의 `feature` 컬럼을 기준으로 비용을 나눕니다.

예시는 다음과 같습니다.

- `rag_chat`
- `document_summary`
- `customer_classification`
- `report_generation`
- `code_generation`

개발자는 처음에 기능 이름만 잘 붙여두면, 이후 비용이 어디서 발생하는지 자동으로 볼 수 있습니다.

### 3. 비용 자동 계산

앱은 사용량 로그와 모델 단가를 바탕으로 다음 값을 계산합니다.

- 월 요청 수
- 입력 토큰 비용
- 출력 토큰 비용
- 전체 월 비용
- 요청당 비용
- 기능별 비용 기여도
- 모델별 비용

### 4. 비즈니스 기준값 입력

LLM 로그만으로는 support ticket 수, report 생성 수, 유료 고객 수 같은 비즈니스 기준값을 알기 어렵습니다. 그래서 이 값은 사용자가 직접 입력해야 합니다.

예시는 다음과 같습니다.

- 월 support ticket 수
- 월 report 생성 수
- 월 유료 고객 수
- 월 job 실행 수
- 월 transaction 수

이 기준값을 넣으면 앱은 비용을 비즈니스 단위로 나눠 보여줍니다.

```txt
월 LLM 비용 / 월 support ticket 수 = ticket 1건당 AI 원가
월 LLM 비용 / 월 report 수 = report 1개당 AI 원가
```

### 5. 원가와 마진 계산

종량제 AI 제품에서는 원가만 보는 것으로 부족합니다. 판매 가격과 비교해 마진을 봐야 합니다.

예를 들어 report 1개 생성 원가가 $0.31이고 고객에게 $1을 받는다면, gross margin은 약 69%입니다.

이 앱은 다음을 보여주는 방향으로 발전합니다.

- 기능별 원가
- 기능별 판매 단가
- 기능별 매출
- 기능별 총마진
- 손해 보는 기능 또는 고객

### 6. 절감 방법 추천

비용을 줄이는 방법은 하나가 아닙니다.

- 모델 교체
- 프롬프트 캐싱
- 배치 처리
- 출력 토큰 제한
- 기능별 모델 라우팅

중요한 점은 "무조건 싼 모델로 바꾸자"가 아닙니다. 어떤 기능은 저가 모델로 충분하고, 어떤 기능은 고급 모델을 유지해야 합니다. 이 서비스는 비용 효과와 품질 리스크를 함께 보여주는 것을 목표로 합니다.

### 7. 품질 부담 비용 포함

저가 모델은 API 비용은 낮을 수 있지만, 품질이 떨어지면 다른 비용이 생깁니다.

- 재시도 비용
- 사람 검수 비용
- CS 이관 비용

그래서 비용은 두 층으로 봅니다.

```txt
Raw cost = 순수 모델 API 비용
Effective cost = Raw cost + 재시도 비용 + 검수 비용 + CS 비용
```

이 구분이 있어야 싼 모델이 진짜 싼지 판단할 수 있습니다.

### 8. 리포트와 알림

계산 결과는 개발자만 보는 것이 아니라 PM, CEO, Finance, 운영팀이 이해할 수 있어야 합니다.

역할별 출력 예시는 다음과 같습니다.

- 개발자용: 입력/출력 토큰, 기능별 비용, 모델 교체 후보, 캐싱/배치 적용 포인트
- PM용: 기능별 원가, 가격 정책, rollout 추천
- CEO용: 월 절감액, 마진 영향, 예산 리스크
- 운영용: 비용 폭증, output token 증가, 예산 초과 예상 알림

## 현재 구현된 기능

- 사용 사례 프리셋: RAG 챗봇, 문서 요약, 코드 생성, 고객문의 분류, 리포트 생성
- 현재 모델과 후보 모델 비용 비교
- 월 비용, 연 비용, 요청당 비용 계산
- 입력 비용과 출력 비용 분리
- CSV 기반 LLM usage import
- 기능별 비용과 마진 분석
- 캐싱, 배치, 출력 제한, 모델 교체, 라우팅 절감 레버 비교
- 품질 점수, 지연시간 점수, 리스크 점수 가정
- 재시도/검수/CS 비용을 포함한 effective cost 계산
- 비즈니스 기준값 기반 지표별 비용 계산
- PM/CEO/개발자용 요약 리포트
- 한국어/영어 UI
- Montage/Wanted 기반 Pretendard 및 디자인 토큰 적용

## 로드맵

### Phase 1. CSV 기반 분석

- LLM usage CSV 업로드
- 기능별 비용 계산
- 요청당 비용 계산
- business metric당 원가 계산
- 보고서 생성

### Phase 2. Pricing / Margin

- report당 가격 입력
- ticket당 가격 입력
- 고객당 매출 입력
- gross margin 계산
- 손해 보는 기능과 고객 표시

### Phase 3. SDK 자동 수집

개발자가 LLM 호출 코드에 작은 wrapper를 붙이면 usage가 자동으로 쌓이는 방식입니다.

```ts
tracker.track("rag_chat", async () => {
  return openai.chat.completions.create(...)
})
```

수집 대상은 다음과 같습니다.

- 토큰
- 비용
- 모델
- 기능
- latency
- 에러
- 재시도

### Phase 4. Alert / Margin Guard

- 예산 초과 예상
- output token 급증
- 특정 고객 비용 폭증
- 마진 악화 알림
- 모델 교체 시 raw cost와 effective margin 비교

### Phase 5. Gateway / Proxy

모든 LLM 호출을 이 서비스가 지나가게 하는 구조입니다.

```txt
고객 서비스 -> AI Cost Gateway -> OpenAI / Anthropic / Gemini
```

장기적으로는 다음 기능을 제공합니다.

- 비싼 요청 제한
- 쉬운 요청은 저가 모델로 라우팅
- provider 장애 시 fallback
- 고객별 예산 제한
- 출력 길이 제한
- 비용/품질/latency 자동 기록

## 개발 실행

이 프로젝트는 클라이언트 사이드 Vite 앱입니다.

```bash
npm install
npm run dev
```

주요 명령어는 다음과 같습니다.

```bash
npm run dev        # 로컬 개발 서버
npm run test:run   # 테스트 전체 실행
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```

preview URL은 기본적으로 다음과 같습니다.

```txt
http://127.0.0.1:4173/token_simulator/
```

## 기술 스택

- Vite 6
- React 18
- TypeScript 5
- Tailwind CSS 3
- Recharts
- html-to-image
- Vitest
- Testing Library

## 폴더 구조

MVP 확장 방향에 맞춰 `src/features`를 제품 기능 단위로 나눕니다.

```txt
src/app
src/features/usage
src/features/current-cost
src/features/alternatives
src/features/savings
src/features/unit-economics
src/features/report
src/features/guardrails
src/domain
src/shared
```

각 feature 폴더의 의미는 다음과 같습니다.

- `usage`: 사용량 가져오기, CSV import, workload 입력
- `current-cost`: 현재 비용 계산
- `alternatives`: 후보 모델 비교
- `savings`: 캐싱/배치/출력제한/라우팅 추천
- `unit-economics`: ticket/report/user당 원가와 마진
- `report`: PM/CEO/개발자용 요약
- `guardrails`: 예산 초과, 비용 폭증 알림

`src/domain`은 화면과 무관한 순수 계산 규칙을 위한 영역입니다. 예를 들어 비용 계산, 품질 부담, 가격/마진 계산처럼 UI가 없어도 테스트 가능한 로직이 여기에 들어갈 수 있습니다.

중요한 안전장치도 있습니다. `src/lib/calculator.ts`와 `src/lib/format.ts`는 프로젝트 헌법상 공식 경로라서 바로 없애지 않습니다. 필요하면 내부 구현만 `src/domain/`으로 옮기고, 기존 경로는 re-export로 유지합니다. 이렇게 해야 테스트와 기존 컴포넌트를 덜 깨고 점진적으로 바꿀 수 있습니다.

자세한 구조 설명은 [docs/architecture/folder-structure.md](docs/architecture/folder-structure.md)를 참고하세요.

## 설계 원칙

- 모든 비용 계산은 공통 계산 경로를 통과합니다.
- 사용자 표시 숫자는 공통 format 함수를 통과합니다.
- 모델명, 브랜드명, 가격, 토큰 숫자는 자동 번역으로 깨지지 않도록 보호합니다.
- 비용 절감률만 보여주지 않고 품질/리스크/effective cost를 함께 봅니다.
- 사용자가 토큰 수를 추측하게 하지 않고, 가능한 한 로그/API usage에서 가져옵니다.
- 비즈니스 기준값은 앱이 추정하지 않고 사용자가 직접 입력합니다.

## 제품 포지션

이 프로젝트를 단순히 "LLM 비용 계산기"라고 보면 약합니다.

더 정확한 포지션은 다음입니다.

> AI 제품의 사용량 기반 원가와 마진을 계산해주는 도구

더 직관적으로 말하면:

> AI 기능을 팔수록 손해 보지 않게 해주는 서비스

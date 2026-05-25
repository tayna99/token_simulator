# AI Cost Snapshot

가격: 30만~100만 원  
기간: 데이터 수령 후 3~5영업일  
산출물: 1장 요약 리포트, 계산 부록, 30분 리뷰콜

## 누구를 위한 리포트인가

이 리포트는 "AI 기능을 많이 쓰는 고객이 늘수록 마진이 깨지는지", "어떤 기능이 원가를 만들고 있는지", "요금제나 사용량 제한을 바꿔야 하는지"를 빠르게 판단해야 하는 초기 AI SaaS 팀을 위한 유료 진단입니다.

## 받는 것

- AI 기능별 원가 breakdown
- 고객 또는 요금제별 비용 압박 지점
- gross margin을 깨는 사용 패턴 후보
- 가격, limit, credit, 모델 라우팅 중 하나 이상의 의사결정 후보
- 데이터 한계와 추가로 필요한 컬럼
- 리뷰콜에서 합의한 다음 결정

## 필요한 데이터

- 익명화된 usage metadata CSV 또는 JSONL
- 가능한 컬럼: timestamp, customer_id, plan_id, feature, model, input_tokens, output_tokens, total_cost, status, retry_count, revenue 또는 plan_price
- raw prompt, 대화 원문, 개인정보, API key는 보내지 않는다.

## 포함하지 않는 것

- 실시간 모니터링 구축
- 자동 과금 변경
- 품질 평가 없는 모델 다운그레이드 보장
- raw prompt 분석
- 보안/개인정보 감사 대행
- 장기 대시보드 구축

## 리포트 이후 결정

리뷰콜에서는 다음 중 하나를 결정 후보로 남긴다.

- Pro 또는 Team 플랜의 사용량 cap 조정
- credit, overage, hybrid pricing 검토
- 손해 고객 또는 heavy user 대응 정책
- 고비용 기능의 모델 라우팅 변경 검토
- 다음 달 동일 지표 반복 리포트 요청 여부

## 1분 확인 질문

- 얼마인가: 30만~100만 원
- 무엇을 받는가: 1장 요약 리포트, 계산 부록, 30분 리뷰콜
- 어떤 데이터를 줘야 하는가: prompt-free usage metadata
- 무엇은 포함되지 않는가: 실시간 모니터링, 자동 과금 변경, raw prompt 분석
- 리포트 이후 무엇을 해야 하는가: 가격, limit, credit, overage, 모델 라우팅 중 하나의 결정을 고른다.

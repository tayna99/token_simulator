# AgentCost Service MVP 런북

## 흐름

1. Lead intake(잠재 고객 접수)
2. A/B/C fit scoring(고객 적합도 점수화)
3. Discovery call(문제 확인 통화)
4. Data request(데이터 요청)
5. Trust check(데이터 안전성 확인)
6. Normalized usage table(표준화된 사용량 표)
7. Deterministic cost snapshot(결정적 계산으로 만든 비용 데이터 묶음)
8. Operating team review(운영팀 관점 검토)
9. Report review gate(리포트 공유 전 검토 관문)
10. Customer review call(고객 리뷰콜)
11. Decision/Operating Ledger entry(결정/운영 장부 기록)

## 약속하지 말 것

- SDK/gateway collection(SDK 또는 게이트웨이 기반 수집)이 없는데 실시간 모니터링을 약속하지 않습니다.
- 품질 검증 없이 절감액을 보장하지 않습니다.
- raw prompt(원문 프롬프트) 분석을 기본 제공처럼 말하지 않습니다.
- 명시적인 human approval(사람 승인) 없이 billing(과금) 변경을 말하지 않습니다.

## 고객 1건의 완료 기준

- Usage export(사용량 내보내기)가 Trust check를 통과했거나, 막힌 분석 범위를 설명했습니다.
- Snapshot(그 시점의 분석 데이터 묶음)에 formula version(계산식 버전)과 provider version(가격 제공자 기준 버전)이 있습니다.
- Report(리포트)에 raw prompt가 없고, 출처 없는 숫자 주장이 없습니다.
- 고객 결정이 refs(근거 참조)와 함께 기록되었습니다.

## P1 큐 연결

다음 빌드 패스의 기준은 `docs/superpowers/plans/2026-05-24-complete-service-mvp-trust-runtime.md`의 P1 큐입니다. 여기에 supervisor agent-as-tool orchestration(감독 에이전트가 다른 에이전트를 도구처럼 호출하는 구조), full vector RAG(벡터 검색 기반 근거 검색), official docs change monitoring(공식 문서 변경 감시), SDK/gateway collection(사용량 수집), vLLM/GPU economics(자체 호스팅 비용), alerts(알림), billing execution(과금 실행), benchmark marketplace(벤치마크 자료 장터), SaaS dashboard, retention automation(보관/삭제 자동화)이 포함됩니다.

## 스모크 런북

`docs/runbooks/agent-runtime-smoke.md`를 사용해 `/api/agent/run`, provider grounding(제공자 응답 근거화), all-hands fallback routing(전체 역할 대체 라우팅), 로컬 브라우저의 SparkClaw 흐름을 확인합니다.

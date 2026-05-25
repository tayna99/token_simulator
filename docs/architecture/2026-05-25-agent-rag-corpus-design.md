# AgentPayroll RAG 코퍼스 설계 (2026-05-25)

## 권한 경계

RAG corpus(Retrieval-Augmented Generation 코퍼스, 검색으로 찾아 붙이는 근거 문서 묶음)의 chunk(검색 단위 조각)는 증거일 뿐 숫자 권한이 아닙니다. 추천이 어디서 왔는지 설명할 수는 있지만, accepted facts(사람이 승인한 사실)나 deterministic calculator output(결정적 계산 엔진의 숫자)을 덮어쓰면 안 됩니다. 화면에 표시되는 비용, 마진, 토큰, rate card(요금표 초안) 숫자는 계속 `src/lib/calculator.ts`와 `src/lib/format.ts`를 통과해야 합니다.

## 코퍼스 계열

- C1 `official_source`: 공식 가격표, 공식 문서, 제공자 발표입니다. Big3 가격 소스는 `openai-api-pricing`, `anthropic-claude-pricing`, `google-gemini-pricing`으로 등록합니다.
- C2 `model_benchmark`: 제3자 또는 공식 model card(모델 설명서)의 품질/지연시간 근거입니다. 비교 기준이 없으면 `baseline_unavailable`로 남기고, 사람이 검토해야 하는 소스는 `needs_review`로 표시합니다.
- C3 `serving_economics`: vLLM TTFT(첫 토큰까지 걸리는 시간), TPOT(토큰당 생성 시간), 처리량, GPU 사용률, KV cache(문맥 재사용 캐시), prefix cache(앞부분 프롬프트 캐시), batching(요청 묶음 처리) 같은 자체 호스팅 비용 근거입니다. 제공자 API 가격 권한은 여기서 제외합니다.
- C4 `usage_schema`: 사용량 로그 스키마 근거입니다. customer, feature, model, plan, session, agent run, input token, output token 같은 분석 차원을 다룹니다.
- C9 `decision_history`: tenant(고객 조직) 범위의 내부 결정, 위험, 운영 장부 행, report snapshot(리포트 생성 시점의 데이터 묶음)입니다.

## 운영 경로

Production demo evidence(운영 데모 근거)는 Supabase `rag_chunks`와 pgvector 검색에서 나와야 합니다. Request body chunks(요청 본문에 임시로 넣은 문서 조각)는 preview-only fixtures(미리보기 전용 테스트 데이터)이므로 운영 화면을 연결된 것처럼 보이게 하면 안 됩니다. `CorpusReadinessReport`는 운영자가 소스 개수, 파서 상태, 검토 경고, 최신성을 확인하는 상태 모델입니다.

## 신뢰와 과금

사용량 입력은 Trust Gate(데이터 안전성 확인 단계)를 통과해야 snapshot(분석 데이터 묶음), decision-history corpus row(결정 이력 코퍼스 행), report artifact(공유 가능한 리포트 파일)를 만들 수 있습니다. Rate-card billing push(요금표/과금 정책 반영)는 connector config(외부 연동 설정), human approval(사람 승인), idempotency(중복 실행 방지), rollback metadata(되돌리기 정보), ledger row(실행 장부 행)가 있어야 ready(실행 가능)로 표시할 수 있습니다.

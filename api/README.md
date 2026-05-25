# Legacy API Surface(이전 API 표면)

production frontend(운영 프런트엔드)는 `app/api/**` 아래의 Next.js App Router route handlers(라우트 핸들러)를 사용합니다.

이 `api/**` 트리의 파일은 `legacy:vite:*`가 regression gate(회귀 방지 확인문)로 남아 있는 동안 legacy Vite/Vercel-function compatibility baseline(이전 Vite/Vercel 함수 호환 기준선)으로만 보관합니다. 같은 계약이 이미 `app/api/**`에 존재하지 않는 한, production demo tenant(운영 형태의 데모 테넌트), Supabase Auth membership(인증 멤버십), RAG(검색으로 근거 문서를 붙여 답하는 방식), Watchtower(공식 문서/가격 변화 감시), decision(결정), report(공유 가능한 결과물), retention(데이터 보존 정책), connector(외부 서비스 연결) 동작을 여기에 추가하지 마세요.

Production routes(운영 라우트)는 demo fixture fallback(데모용 샘플 데이터 대체 경로), memory fallback adapter(저장소 대신 메모리에 임시 의존하는 어댑터), request-body fixture(테스트용 요청 본문 샘플)를 production data(운영 데이터)처럼 import하면 안 됩니다. Supabase가 저장한 row(행/레코드)만 production demo source of truth(운영 데모의 공식 원천)입니다.

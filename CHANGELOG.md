# 변경 이력

이 프로젝트의 중요한 변경 사항을 이 파일에 기록합니다.

## [0.0.1.0] - 2026-04-23

### 추가
- 번역 방어 심화(여러 겹의 보호) 적용: Chrome 자동 번역이 숫자/통화/모델 라벨을 망가뜨리지 않도록 숫자·통화·모델명 노드에 `<meta name="google" content="notranslate">`와 `translate="no"` 속성 추가
- 현재 모델과 후보 모델이 같을 때 amber notice(노란색 주의 안내)를 보여주는 same-model migration guard(동일 모델 마이그레이션 보호 장치) 추가
- 토큰 입력에 천 단위 구분 표시와 오류 메시지 안내를 붙여 input hardening(잘못된 입력 방어) 강화
- preset button tooltip(프리셋 버튼 도움말)에 workload preset(작업량 사전 설정: Basic Chat, Code Generation 등)의 설정값 설명 추가
- 모든 사용자 표시 숫자를 위한 unified formatter module(공통 포맷 모듈, TDD로 검증): `fmtCurrency`, `fmtPercent`, `fmtTokens`, `fmtDelta`, `fmtPricePerMillion`

### 변경
- 모든 컴포넌트에 공통 포맷터를 적용하고, inline(컴포넌트 내부 즉석 처리) `toLocaleString()`, `toFixed()`, 문자열 보간 포맷을 제거
- 랜딩 이전 프로젝트의 `CLAUDE.md`를 프로젝트 헌법 형태로 재정리하고, Round 1 feedback(1차 피드백)에서 나온 아키텍처 규칙, 개발 프로세스, 안티패턴을 문서화

### 수정
- Vitest 4 + @testing-library/jest-dom v6 setup import path(테스트 준비 import 경로) 수정: transitive dependency(간접 의존성) 때문에 테스트 인프라가 깨지는 문제 해결
- state sync(상태 동기화)와 NaN guard(숫자가 아님 방어) 회귀 테스트를 추가해 자동 번역으로 UI가 깨지는 회귀 방지

### 문서
- 배포 상태 진단(2026-04-23): Round 1의 피드백 7개가 코드 버그가 아니라 Chrome 자동 번역과 React reconciliation(React가 화면 차이를 맞추는 과정)의 상호작용에서 비롯됐음을 확인
- 테스트 커버리지와 회귀 방지 장치를 `CLAUDE.md`의 Verification(검증) / 페르소나 간 일관성 섹션에 문서화

---

*자세한 기술 변경은 [Round 1 Resolution](docs/diagnosis/2026-04-23-deploy-state.md)을 참고하세요.*

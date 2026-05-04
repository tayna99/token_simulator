# domain

화면과 무관한 순수 계산 규칙을 둔다.

중요한 안전장치: `src/lib/calculator.ts`와 `src/lib/format.ts`는 공식 경로로 유지한다. 내부 구현을 `domain/`으로 옮기더라도 기존 경로는 re-export로 남겨 테스트와 기존 컴포넌트를 보호한다.

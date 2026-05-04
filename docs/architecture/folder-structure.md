# Folder Structure

이 프로젝트는 단순 LLM 비용 계산기가 아니라 AI 제품의 사용량 기반 원가, 마진, 품질 리스크를 판단하는 도구다.

## Top-Level Intent

- `src/app`: 앱 조립과 전역 상태
- `src/features`: 사용자가 보는 기능 단위
- `src/domain`: 화면과 무관한 계산 규칙
- `src/shared`: 공통 UI, 포맷, i18n, 스타일
- `docs`: 제품/기술 의사결정 문서
- `design_system`: 원본 디자인 시스템 레퍼런스

## Feature Folders

- `usage`: 사용량 가져오기, CSV import, workload 입력
- `current-cost`: 현재 비용 계산
- `alternatives`: 후보 모델 비교
- `savings`: 캐싱/배치/출력제한/라우팅 추천
- `unit-economics`: ticket/report/user당 원가와 마진
- `report`: PM/CEO/개발자용 요약
- `guardrails`: 예산 초과, 비용 폭증 알림

## Compatibility

`src/lib/calculator.ts`와 `src/lib/format.ts`는 프로젝트 헌법상 공식 public path로 유지한다.

필요하면 실제 구현은 `src/domain/`으로 옮기되, 기존 경로에서는 re-export를 제공한다. 이렇게 하면 테스트와 기존 컴포넌트를 덜 깨고 점진적으로 구조를 바꿀 수 있다.

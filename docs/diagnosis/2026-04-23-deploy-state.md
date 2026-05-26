# 배포 상태 진단 — 2026-04-23

**출처:** `feedback.md` 라운드 1
**배포 URL:** <https://tayna99.github.io/token_simulator/>
**로컬 SHA:** `93de5c9c59f772c34fe3c620c843fc3d0756b2c8`
**배포 bundle hash(배포 번들 해시):** `index-J0R1scGz.css`, `index-KTQJIFw4.js`
**로컬 bundle hash(로컬 번들 해시):** `index-J0R1scGz.css`, `index-KTQJIFw4.js`
**번들 일치:** YES(예)

## 진단 환경

- `document.documentElement.lang`는 `"en"`이었다.
- `document.title`은 `"LLM Cost Simulator"`였다.
- meta tag(메타 태그)는 `charset=UTF-8`, `viewport`만 있었다.
- `<meta name="google" content="notranslate">`와 `translate="no"`가 없었다.
- 리뷰어가 Chrome built-in page translation(크롬 내장 페이지 번역)을 켠 상태에서 본 것으로 판단된다. 실제 DOM 텍스트에는 한글이 없는데 피드백에는 "이주 비교", "작품 4.7", "달러", "나N %", "끄다", "교통" 같은 한국어 번역 결과가 있었다.

## 재현 근거

배포본과 로컬 `dist`의 번들이 같았다. 따라서 피드백의 대부분은 stale deploy(오래된 배포)나 source bug(소스 버그)가 아니라 auto-translate artifact(자동번역이 만든 왜곡)로 분류됐다.

| 동작 | 관찰 결과 |
| --- | --- |
| 기본 상태 | Migration Comparison 카드가 `$158/mo`, `$6/mo`, `-96.3%`를 정상 표시 |
| current 모델을 Claude Haiku로 변경 | 카드가 `$53/mo`, `-89.0%`로 갱신되어 reactive(상태 반응형)임을 확인 |
| cache slider를 30으로 이동 | `Cache Hit Rate: 30%`로 갱신. DOM에 `NaN` 없음 |
| Code Generation preset 클릭 | 요약 문장이 갱신되지만 source language는 `"en"` 유지 |
| 통화 문자열 검사 | source DOM은 전부 `$` 표기. `달러`/`원` 없음 |
| 모델 라벨 검사 | 15개 모델 모두 같은 `<Name> — $<in>/$<out> per 1M` 패턴 |

## 버그 분류

| 피드백 주장 | 분류 | 근거 | 후속 조치 |
| --- | --- | --- | --- |
| Migration 카드 값 고정 | AUTO_TRANSLATE(자동번역 왜곡) | 실제 DOM은 모델 변경에 반응했다. | notranslate 방어 |
| cache label 50% 고정 | AUTO_TRANSLATE | slider 변경 시 DOM은 30%로 갱신됐다. | notranslate 방어 |
| Scenario NaN % | AUTO_TRANSLATE | DOM에는 `NaN` 문자열이 없었다. | NaN 방어 + notranslate |
| 통화 혼용 | AUTO_TRANSLATE | source DOM은 전부 `$` 표기였다. | currency span에 `translate="no"` |
| 모델/브랜드 번역 오류 | AUTO_TRANSLATE | Opus, Migration, Traffic, Off 등이 크롬 번역으로 왜곡됐다. | 모델명·브랜드명 보호 |
| preset 선택 시 영어로 flip | AUTO_TRANSLATE | React가 새 노드를 만들고 Chrome Translate가 늦게 다시 번역하는 현상. | root `translate="no"` |
| 모델 단위 라벨 불일치 | AUTO_TRANSLATE | source 라벨 템플릿은 15개 모두 동일했다. | `per 1M` 보호 |

## 범위 확인

- source bug(소스 버그)로 분류된 항목: 없음.
- stale deploy로 분류된 항목: 없음.
- auto-translate로 분류된 항목: 전부.

근본 원인은 번역 opt-out signal(자동번역 제외 신호)이 없고, Chrome Translate가 React reconciliation(React의 DOM 갱신 방식)과 충돌한 것이다.

## 후속 계획 영향

1. Task 6의 우선순위를 올린다. `<meta name="google" content="notranslate">`, 숫자/통화/모델명 `translate="no"`가 필수다.
2. Migration state나 cache label은 실제 버그 수정이 아니라 defensive test(방어 테스트) 범위로 축소한다.
3. currency/label uniformity(통화·라벨 통일)는 이미 대체로 맞지만, 자동번역 방어 wrapper가 필요하다.
4. preset tooltip, custom scenario, duplicate model guard, source link 등 UX 개선은 번역 문제와 별도로 유효하다.
5. 배포 후 리뷰어에게 Chrome Translate를 끈 상태에서도 재검증해 달라고 요청한다.

## 라운드 1 해결 기록

브랜치: `feat/feedback-round-1`

| SHA | 제목 | 목적 |
| --- | --- | --- |
| `24853f7` | docs: diagnose deployed state | 본 진단 문서 |
| `998f96a` | feat: defense-in-depth translation protection | meta + `translate="no"` + `lang="en"` |
| `7fed878` | chore: fix vitest setup | 테스트 인프라 복구 |
| `d92f28c` | feat: unified formatter module | `format.ts`와 테스트 |
| `4eff755` | refactor: apply formatter | 컴포넌트 inline format 제거 |

## 결론

이 라운드의 핵심은 기능 버그 수정이 아니라 자동번역 방어였다. 숫자, 모델명, 브랜드명, 단위는 브라우저 번역이 건드리면 제품 신뢰가 무너진다. 따라서 `notranslate`는 UI 장식이 아니라 제품 정확성 요구사항이다.

# LANDING_UX: 웹앱 첫 화면 온보딩 기준

작성일: 2026-05-24

## 1. 문서 역할

독립 랜딩 구현은 P1에서 보류한다. 별도 랜딩 라우트를 만들지 않는다. 이 문서는 마케팅 랜딩 페이지 구현서가 아니라, 고객이 처음 들어오는 **웹앱 첫 화면**의 onboarding(첫 사용 안내)/설명 섹션 참고 문서다.

제품은 1인 창업자가 바로 쓰는 단일 웹앱이다. 첫 화면에서 제품 설명, 샘플 실행, usage export 업로드, 기존 workspace 열기를 모두 제공하고, 사용자는 곧바로 3-pane 운영 workspace로 이어진다.

## 2. 타깃과 포지셔닝

기본 타깃은 **1인 창업자**다. SparkClaw는 제품 방향이 아니라 데모/샘플 데이터 이름으로만 다룬다.

| 항목 | 기준 |
| --- | --- |
| 사용자 | 혼자 AI 팀을 굴리는 1인 창업자 |
| 핵심 질문 | 이번 달 AI 팀이 한 일, 든 비용, 남는 돈, 줄일 방법, 결정 기록 |
| 첫 성공 | 5분 안에 비용/마진/병목/절감안/운영 일지를 한 번에 본다 |
| SparkClaw 역할 | 제출용 sample data(샘플 데이터)와 demo scenario(데모 시나리오) 이름 |

## 3. 서체와 시각 원칙

서체는 **Pretendard 단일 서체**로 통일한다. 별도 display font를 추가하지 않는다. 웹앱 첫 화면과 운영 workspace가 같은 제품으로 느껴져야 하기 때문이다.

| 요소 | 기준 |
| --- | --- |
| 전체 서체 | Pretendard 단일 서체 |
| 인터랙션 색 | #0066FF |
| 카드 | 12px radius, rest shadow 없음, gutter로 분리 |
| 배경 | #FFFFFF / #F7F7F8 중심 |
| 금지 | glass, neon, 보라 그라데이션 텍스트, 과한 장식, 이모지 |

## 4. 웹앱 첫 화면 구조

첫 화면은 설명형 랜딩이 아니라 곧바로 작업으로 들어가는 dashboard entry(대시보드 진입점)다.

| 영역 | 목적 | UI |
| --- | --- | --- |
| Hero | 무엇을 해주는 제품인지 5초 안에 전달 | “내 AI 팀 비용/마진을 5분 안에 보기” |
| CTA | 시작 경로 선택 | 샘플 실행, usage export(사용량 내보내기 파일) 업로드, 기존 workspace(작업공간) 열기 |
| Trust note | 원본 prompt/API key/PII(개인식별정보)를 저장하지 않는다는 신뢰 표시 | Trust Intake badge(신뢰 확인 배지) |
| Workspace preview | 결과가 어디에 쌓이는지 예고 | monthly review history(월간 검토 이력), decision ledger(결정 기록 장부), report export(보고서 내보내기), alert settings(알림 설정) |

## 5. CTA 규칙

| CTA | 동작 |
| --- | --- |
| 샘플 실행 | 1인 창업자 샘플 데이터로 Work Ledger(작업 기록 장부), Cost/Margin(비용/마진), Bottleneck(병목), Decision Ledger(결정 기록 장부)를 채운다 |
| usage export 업로드 | Trust Intake(신뢰 확인)를 거쳐 실제 usage CSV/adapter export를 normalized usage table(정규화된 사용량 표)로 보낸다 |
| 기존 workspace 열기 | 이전 monthly review, decision ledger, report export로 돌아간다 |

## 6. 앱으로 이어지는 방식

첫 화면 다음은 별도 전환 페이지 없이 같은 웹앱 안의 3-pane workspace다.

```txt
웹앱 첫 화면
  -> Trust Intake
  -> Work Ledger
  -> Cost & Margin
  -> Bottleneck
  -> Optimize + Risk
  -> Operating Decision
  -> Monthly Review
```

완료 기준은 사용자가 “이번 달 AI 팀 비용은 얼마고, 어떤 일/agent/고객이 마진을 깨고, 어떤 절감안을 선택할 수 있고, 그 결정 근거가 남았다”고 말할 수 있는 것이다.

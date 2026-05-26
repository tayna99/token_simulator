# Montage — Wanted Lab 웹 디자인 시스템

Montage는 **Wanted Lab**(wanted.co.kr을 운영하는 팀)이 쓰는 웹 디자인 시스템이다. 이 폴더는 오픈소스 `@wanteddev/wds` 계열을 이 프로젝트에서 참고하기 좋게 옮긴 mirror(원본을 복제해 둔 참고본)다. 디자인 에이전트가 브랜드에 맞는 인터페이스, 슬라이드, 프로토타입을 만들 때 쓰는 자료다.

> 원본 저장소: <https://github.com/wanteddev/montage-web>
> 문서 사이트: <https://montage.wanted.co.kr>
> 라이선스: MIT

## 이 폴더에 있는 것

| 파일/폴더 | 용도 |
| --- | --- |
| `colors_and_type.css` | color token(색상 토큰)과 type token(글꼴·크기·굵기 토큰)을 CSS 변수로 모은 파일 |
| `assets/` | 로고, SVG 아이콘, 일러스트, 브랜드 이미지 |
| `ui_kits/wanted/` | Wanted 채용 제품 화면을 고해상도로 재현한 UI kit(디자인 부품 묶음) |
| `preview/` | Design System 탭에 표시할 작은 HTML 미리보기 카드 |
| `SKILL.md` | 에이전트가 이 디자인 시스템을 사용하는 방법을 적은 skill manifest(작업 지침 파일) |

## 원본 패키지

| 패키지 | 역할 |
| --- | --- |
| `@wanteddev/wds` | React component library(React 컴포넌트 라이브러리) |
| `@wanteddev/wds-engine` | theme/css/variant를 처리하는 styling engine(스타일 엔진) |
| `@wanteddev/wds-theme` | design tokens(색상·간격·투명도·반응형 기준·그림자 같은 디자인 변수) |
| `@wanteddev/wds-icon` | 340개 이상의 SVG icon component(아이콘 컴포넌트) |
| `@wanteddev/wds-lottie` | Lottie animation primitive(애니메이션 기본 부품) |
| `@wanteddev/wds-nextjs` | Next.js App Router와 Pages Router 통합 도구 |

## 설치 메모

운영 코드에서 직접 쓸 때는 GitHub Packages registry(패키지 저장소)를 `.npmrc`에 설정한 뒤 설치한다.

```sh
# .npmrc
@wanteddev:registry=https://npm.pkg.github.com/

# install
pnpm i @wanteddev/wds @wanteddev/wds-icon
```

모든 `@wanteddev/wds-*` 패키지는 같은 버전을 써야 한다. version drift(패키지 버전이 서로 어긋나는 상태)가 생기면 theme context(테마 상태)가 여러 개 생겨 스타일이 깨질 수 있다.

Pretendard 웹폰트가 필요하다. 이 저장소에서는 `colors_and_type.css`가 jsDelivr 경로를 이미 불러온다.

## 콘텐츠 기본 원칙

Wanted 제품 문구는 한국어가 기본이고 영어는 보조다. 분위기는 **차분하고, 구체적이며, 존중하는 전문가 톤**이다. HR 친화적인 동료처럼 말하고, 마케팅 과장처럼 말하지 않는다.

### 톤

- 차분한 선언형 문장을 쓴다.
- 독자를 직접 부를 때는 `당신` 또는 높임말 어미를 쓴다.
- 느낌표로 흥분을 만들지 않는다. 숫자, 회사명, 구체 조건으로 신뢰를 만든다.
- 영어 문구는 짧고 sentence case(문장 첫 글자만 대문자)에 가깝게 쓴다.

### 표기

- 한국어는 일반 문단으로 쓴다. SHOUT CASE(전부 대문자 강조)는 쓰지 않는다.
- 영어 UI label은 sentence case를 쓴다.
- 브랜드명은 Wanted, Montage, WDS처럼 원래 표기를 유지한다.

### 호칭

- 독자는 `당신` 또는 `회원님`으로 읽힌다.
- `우리`는 거의 쓰지 않는다. 우리/그들 대립처럼 보일 수 있기 때문이다.
- CTA(행동 버튼)는 `지원하기`, `저장하기`, `매칭 시작하기`처럼 동사로 쓴다.

### 숫자와 구체성

- 연봉 범위, 퍼센트, 연차, 회사 로고처럼 확인 가능한 정보를 적극 쓴다.
- 신뢰는 형용사가 아니라 구체적인 데이터로 만든다.
- 예: `합격 보너스 50만원`, `평균 응답 2일`, `면접 제안 12건`.

### 이모지

- 제품 UI나 마케팅 카피에는 쓰지 않는다.
- 커뮤니티 글처럼 사용자가 만든 영역에서는 보일 수 있지만, 브랜드가 직접 작성하는 문구에는 쓰지 않는다.

### 분위기

- 믿을 수 있고 절제되어 있으며 약간 부드럽다.
- 넉넉한 모서리, 파랑 중심 색상, 조용한 정보 밀도를 쓴다.
- LinkedIn식 정보 밀도와 한국 SaaS식 정돈감을 함께 가진다.

## 예시

- 좋은 예: `이력서 한 번으로 여러 회사에 지원하세요`
- 좋은 예: `합격하면 보너스가 지급돼요`
- 나쁜 예: `지금 바로 시작하세요!!!` 같은 과장된 문장

## AgentPayroll에 적용할 때

- "큰 랜딩 페이지"보다 실제 작업 화면을 우선한다.
- 파랑은 주요 행동과 선택 상태에만 쓴다.
- 카드는 반복 항목과 실제 도구 표면에만 사용한다.
- 데이터 표, KPI, 결정 버튼은 조용하지만 명확해야 한다.
- 내부 용어는 처음 등장할 때 괄호로 풀어 쓴다.

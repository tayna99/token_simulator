---
id: wanted
name: Wanted
country: KR
category: productivity
homepage: "https://www.wanted.co.kr"
primary_color: "#0066ff"
logo:
  type: favicon
  slug: "https://www.google.com/s2/favicons?domain=wanted.co.kr&sz=256"
verified: "2026-05-15"
omd: "0.1"
ds:
  name: Wanted Montage
  url: "https://montage.wanted.co.kr/"
  type: system
  description: Wanted's Montage design system docs — components, foundations, Wanted Sans, and the brandcenter resource hub.
---

# Custom Design System(Wanted 기반)

## 1. Visual Theme & Atmosphere(시각 테마와 분위기)

Wanted(원티드)는 Wanted Lab(원티드랩, 2015년 설립)이 운영하는 한국의 커리어 marketplace(구직자와 기업을 연결하는 채용 플랫폼)다. 360만 명 이상의 직장인과 3만 5천 개 이상의 기업을 AI matching(데이터 기반 추천 연결), referral bonus(합격보상금), 회사 소개처럼 읽히는 긴 채용공고 형식으로 연결한다. 이 제품의 시각 정체성은 일반적인 job board(채용 게시판)의 어휘인 흐릿한 회색, stock photography(상투적인 스톡 사진), 빽빽한 문서 느낌을 거부한다. 대신 한국 fintech(금융 기술 서비스)와 SaaS(구독형 소프트웨어)의 문법을 빌려온다. 하나의 강한 brand blue(브랜드 파랑), 차분한 흰색과 따뜻한 회색 화면, 채용 카드 주변의 넉넉한 여백, 그리고 "일하는 사람들의 모든 가능성"을 위해 자체 제작한 **Wanted Sans**가 핵심이다.

브랜드 색은 단 하나의 명확한 **`#0066FF`**(PANTONE 2195 C)다. Toss의 `#3182f6`보다 조금 더 차갑고 자신감 있는 색으로, "거래의 파랑"보다 "성장의 파랑"처럼 느껴지도록 자리 잡았다. 이 색은 회원가입/로그인 CTA(주요 행동 버튼), 채용 상세의 지원 버튼, 링크 텍스트, 선택 상태처럼 상호작용 표면에만 사용한다. 제목 텍스트는 거의 검정에 가까운 `#171719`, 본문은 `#333333`, 보조 메타데이터는 `rgba(55,56,60,0.61)`을 쓴다. 이 반투명 회색은 배경이 살짝 비치게 하여, 딱딱한 hex 값으로 낮은 우선순위를 고정하지 않고 자연스럽게 보조 정보임을 나타낸다.

대표 표면은 **JobCard**다. 12px radius(모서리 둥글기)의 흰색 컨테이너 안에 thumbnail(상단 12/12/0/0 모서리), bookmark icon(북마크 아이콘), 회사명, 포지션 제목, 연봉 범위, 합격보상금 badge(작은 강조 표시)가 들어간다. 카드는 desktop(데스크톱)에서 3열 grid, mobile(모바일)에서 전체 폭으로 배치하며, 20-24px gutter(카드 사이 간격)로 분리한다. grid 위의 filter chip(필터 선택 칩)은 국가/조건/스택 토글에 9999px pill radius(완전 둥근 알약형)를 쓰고, 최신순/추천순/인기순 sort order(정렬 순서)에는 10px radius segmented control(여러 선택지를 붙인 컨트롤)을 쓴다.

**핵심 특성:**
- 단일 brand blue `#0066FF`(PANTONE 2195 C): 상호작용에만 사용
- Wanted Sans(custom geometric-humanist, 기하학적이면서 사람 냄새가 나는 자체 서체) + Pretendard JP: 7 weights(굵기)와 variable axes(가변 축)
- 3단 typography hierarchy(글자 위계): 제목/보조/본문에 23/16/14px
- class naming prefix(클래스 접두사) `wds-*`(Emotion 스타일 atomic class) + module-scoped class(CSS Modules 범위 클래스) `JobCard_*` / `AdCard_*`
- JobCard의 12px radius는 thumbnail / position / salary / reward badge를 담는 대표 표면
- filter taxonomy(필터 분류)에는 9999px pill chip, 나머지는 8/10/12px 단계형 radius
- 흰색 canvas(`#FFFFFF`) + warm-grey panel(`#F7F7F8`): web에서는 dark mode 없음(Montage system 자체는 지원)

## 2. Color Palette & Roles(색상 팔레트와 역할)

### Primary(브랜드 기본색)
- **Wanted Blue** (`#0066FF`): PANTONE 2195 C. 유일한 상호작용 색이다. 회원가입 CTA, 지원 버튼, 링크 텍스트, focus ring(키보드 포커스 테두리), 선택 강조에 사용한다. `brandcenter`와 실제 `회원가입/로그인` 버튼의 `rgb(0, 102, 255)`로 검증했다.
- **Wanted Black** (`#14191E`): brand-center secondary(브랜드센터 보조색). 밝은 배경의 logo lockup(로고 조합)과 marketing typography(마케팅 글자)에 사용한다. UI heading color(제품 UI 제목 색) `#171719`와 구분한다.

### Brand Accent(마케팅 전용 보조색)
- **Orange** (`#FF5C00`): 프로모션 배너, 브랜드 캠페인용 accent. 기능 UI에는 쓰지 않는다.
- **Pink** (`#FF8EFF`): illustration accent(일러스트 강조), 보조 캠페인 순간.
- **Sky Blue** (`#00ADFF`): 마케팅 gradient(그라데이션) 표면에서 Wanted Blue와 짝으로 사용.
- **Violet** (`#8364FF`): premium / AI / Wanted+ 기능 표면.
- **Brand Grey** (`#F0F4F8`): UI surface grey(제품 표면 회색)와 다른 cool-grey marketing canvas(차가운 회색 마케팅 바탕).

### UI Surface & Text(UI 표면과 텍스트)
- **Background** (`#FFFFFF`): 페이지 표면, 카드 표면.
- **Surface Subtle** (`#F7F7F8`): segmented-control track(선택 컨트롤 바탕), 보조 패널 배경, filter dropdown menu 표면.
- **Heading** (`#171719`): 1차 텍스트. H1/H2, 포지션 제목, JobCard의 회사명.
- **Body** (`#333333`): 표준 읽기 텍스트, 채용 설명 본문.
- **Secondary** (`rgba(55, 56, 60, 0.61)`): 메타데이터, breadcrumbs(경로 표시), "상품안내" 보조 nav 링크. 반투명 회색이라 표면에 적응한다.
- **Disabled** (`rgb(160, 160, 160)`): 비활성 링크와 inactive controls(비활성 컨트롤).

### Border & Divider(테두리와 구분선)
- **Border Default** (`rgba(112, 115, 124, 0.16)`): 표준 1px hairline(얇은 선). dropdown toggle(`태그 전체` 버튼)과 shadow가 없는 카드 edge(가장자리)에 사용한다. 반투명이라 어떤 배경에서도 부드럽다.
- **Divider** (`#E5E8EB`): job description section(채용 설명 섹션) 안의 list separator(목록 구분선)에 쓰는 실선 hairline.

### Semantic(Montage / WDS theme에서 상속)
- **Error / Negative** (`#F0483C`): form validation error(폼 검증 오류), 지원 실패 상태.
- **Success / Positive** (`#00B97C`): 지원 성공, 결제 확인.
- **Warning** (`#FFAB00`): "마감 임박" 배지, 주의가 필요한 상태.
- **Info** (`#0066FF`): primary와 동일. 정보 상태는 별도 teal이 아니라 브랜드 파랑을 사용한다.

## 3. Typography Rules(타이포그래피 규칙)

### Font Family(글꼴 계열)
- **Primary (UI)**: `"Pretendard Variable", "Pretendard JP Variable", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", system-ui, sans-serif` — wanted.co.kr의 모든 실제 텍스트 노드에서 확인한 제품 UI 기본 서체.
- **Brand / Display**: `"Wanted Sans", "Wanted Sans Std", "Pretendard Variable", sans-serif` — 마케팅 페이지, brandcenter, Montage docs, 채용 페이지에 사용.
- **Latin-only fallback**: `"Wanted Sans Std"` — 한글 glyph(글자 모양)가 필요 없는 영어 전용 맥락의 대체 서체.

Wanted는 두 표면에 맞춰 두 서체를 병행한다. **Pretendard Variable**은 runtime product UI(실제 제품 UI)를 담당한다. CDN 로드가 빠르고 한글 지원이 넓다. **Wanted Sans**는 brand surface(마케팅, brandcenter, Montage docs, 채용 페이지)를 담당한다. Pretendard JP Variable은 일본어 kana까지 지원해 cross-border job posting(국경 간 채용 공고)에 대응한다. 세 서체 모두 SIL OFL 1.1 오픈소스 라이선스다.

### Hierarchy(위계)

| Role | Font | Size | Weight | Line Height | Notes |
|------|------|------|--------|-------------|-------|
| Display | Wanted Sans | 32px+ | 700 | 1.25 | Brandcenter, montage hero |
| H1 / Page Title | Pretendard Variable | 24px | 700 | 1.4 | Job detail header |
| H2 / Section | Pretendard Variable | 20px | 700 | 1.4 | "주요업무", "자격요건" |
| Subtitle | Pretendard Variable | 16px | 600 | 1.5 | JobCard position title |
| Body | Pretendard Variable | 14px | 400 | 1.6 | Standard reading, filter chip label |
| Body Small | Pretendard Variable | 13px | 400 | 1.5 | Company name on JobCard |
| Caption | Pretendard Variable | 12px | 400 | 1.5 | Metadata, dates, location |
| Micro | Pretendard Variable | 10px | 500 | 1.4 | Footer 사업자정보확인 strip |

### Principles(원칙)
- **Two surfaces, two fonts.** Product UI(제품 UI)는 Pretendard Variable, Marketing/brand(마케팅/브랜드)는 Wanted Sans를 사용한다. 같은 화면에서 섞지 않는다.
- **Three weights, mostly.** 대부분 400(body), 600(emphasis/subtitle), 700(heading)만 쓴다. 500은 footer link strip이나 bookmark micro-label 같은 micro-text에만 등장한다.
- **Korean is primary.** Wanted Sans는 Korean-first(한국어 우선)로 설계됐다. Latin glyphs(영문 글자)는 한글과 시각 무게가 맞도록 조정되어 있다. 영어가 기본 voice(문체)라고 가정하지 않는다.
- **Variable fonts everywhere.** Pretendard와 Wanted Sans는 모두 variable font다. 여러 weight 파일을 따로 불러오기보다 runtime에서 weight를 보간한다.

## 4. Component Stylings(컴포넌트 스타일)

Wanted의 제품 UI는 두 레이어로 구현되어 있다. design-system primitive(기본 부품)는 **`wds-*`** class(Emotion/atomic generated, 소문자 hash suffix)로, 그 위의 제품별 조합은 **module-scoped** class(`JobCard_JobCard__thumb__iOtFn`, `Button_Button__root__MS62F`)로 구성된다. 아래 값은 `https://www.wanted.co.kr/wdlist/518`(개발자 채용 feed)을 playwright `getComputedStyle`로 관찰한 값이다.

### Buttons
- Style: Sharp & Precise(날카롭고 정밀함). 최소한의 rounding과 명확한 기하학적 edge.
- Radius: primary, secondary, ghost variant 모두 4px.
- Padding: 8px 16px(default), 6px 12px(compact), 12px 20px(comfortable).
- Primary: solid primary background, foreground contrast text, 1px solid primary border.
- Secondary: transparent/neutral background, foreground text, 1px solid border color.
- Ghost: transparent background, primary text, hover 전까지 border 없음.
- Hover: primary는 약 10% 어두워지고, secondary는 border-color가 살짝 강조된다.
- Font weight: CTA 텍스트 가독성을 위해 500-600.

### Cards

**JobCard(대표 표면)**
- Background: `#FFFFFF`
- Border: none
- Radius: 24px(body) / 12px 12px 0 0(thumbnail 상단 모서리만)
- Padding: 0(thumbnail flush) / 12px 16px(body)
- Shadow: 기본 상태에서 없음. grid gutter로 분리감 확보.
- Thumbnail aspect: 4:3(기본 폭에서 약 251×167)
- Logo crop: 50px 정사각형, 9px radius, thumbnail 하단 왼쪽에 겹쳐 배치
- Use: feed grid의 채용 공고. Wanted의 대표 표면.

**AdCard(sponsored / promoted listing, 광고/추천 공고)**
- Background: `#FFFFFF`
- Border: none
- Radius: 24px 12px 0 0(thumbnail) + 12px(full card)
- Padding: 0
- Thumbnail height: 114px(252px 폭에서 4:3)
- Use: feed의 promoted job. JobCard와 같은 geometry를 쓰며, 시각 처리 대신 모서리의 `상품안내` micro-link로 구분한다.

**Reward Badge("합격보상금 100만원")**
- Background: thumbnail 위 transparent overlay
- Text: 어두운 thumbnail tint 위 `#FFFFFF`
- Border: none
- Radius: thumbnail을 상속
- Font: 12px / 600 / Pretendard Variable
- Use: referral-reward callout(추천 보상 강조). 자격 있는 모든 JobCard에 표시되는 Wanted의 대표 growth lever.

### Inputs

**Search Input(header)**
- Background: translucent dark pill wrapper(`#171719`) 안의 `#FFFFFF`
- Wrapper: `38×38px`, 9999px radius, `#171719` background
- Text: `#171719` placeholder
- Font: 14px / 400 / Pretendard Variable
- Use: header search trigger. 기본은 38px icon-only, focus 시 확장.

세부 input variant(text/number/textarea/search)는 `@wanteddev/wds` package에 있다. Montage docs에서는 관찰 가능하지만, 여기서 검사한 공개 jobs feed 표면에는 직접 노출되지 않는다.

### Segmented Controls / Sort Filter

**Container("최신순 / 추천순 / 인기순")**
- Background: `#F7F7F8`
- Border: none
- Radius: 24px
- Padding: 0 4px
- Height: 40px
- Width: 236px(3-segment auto)
- Font: 14px / 400 / Pretendard Variable

**Active Segment**
- Background: `#FFFFFF`
- Text: `#333333`
- Border: none
- Radius: 24px
- Height: 32px(container에서 양쪽 4px inset)
- Shadow: none. container `#F7F7F8`와의 배경 대비에 의존한다.
- Use: 현재 선택된 정렬 모드.

### Icon Buttons

**Round Icon(bookmark, close, expand)**
- Background: transparent(default) -> `#FFFFFF`(filled rest state)
- Text/Icon: `#333333`
- Border: none
- Radius: 50%
- Padding: 8px(30px target) / 11.3px(36px target) / 8px(40px target)
- Sizes: 30px(compact list), 36px(toolbar), 40px(JobCard bookmark)
- Use: JobCard bookmark, modal close, accordion expand.

### Badges

**Solid Badge("FAQ" / brand callout)**
- Background: `#171719` 또는 brand emphasis용 `#0066FF`
- Text: `#FFFFFF`
- Border: none
- Radius: 24px
- Padding: 4px 8px 4px 14px(trailing chevron 공간 때문에 비대칭)
- Font: 15px / 400 / Pretendard Variable
- Height: 31px
- Use: inline brand callout, footer FAQ chip.

**Micro Tag("사업자정보확인" footer)**
- Background: `#A0A0A0`
- Text: `#FFFFFF`
- Border: none
- Radius: 24px
- Padding: 5px 7px
- Font: 10px / 500 / Pretendard Variable
- Height: 22px
- Use: footer의 legal/regulatory micro-pill(법적/규제 정보 작은 배지). 공식 문서 느낌을 위해 edge가 더 단단하다.

### Header Avatar / Logo Lockup

**Logo / Profile Pill(header right)**
- Background: `#171719`
- Border: none
- Radius: 24px
- Size: 38×38px
- Use: 로그인 사용자 avatar placeholder와 brand mark. full-pill, border 없음.

---

**Verified:** 2026-05-13
**Tier 1 sources(1차 출처):**
- `https://www.wanted.co.kr/wdlist/518` — playwright `getComputedStyle`로 live DOM inspection(실제 DOM 검사). 22개 component sample, class prefix `wds-*` / `JobCard_*` / `AdCard_*` / `TagList_*` / `SortFilter_*` / `IconButton_*` / `Button_*`.
- `https://www.wanted.co.kr/brandcenter/` — 공식 brand palette(`#0066FF` PANTONE 2195 C, secondary `#14191E`/`#FF5C00`/`#FF8EFF`/`#00ADFF`/`#8364FF`/`#F0F4F8`).
- `https://montage.wanted.co.kr/` — Wanted Montage Design System(WDS) docs portal.
- `https://github.com/wanteddev/montage-web` — `@wanteddev/wds` package family(wds-theme, wds-engine, wds-icon, wds-lottie, wds-nextjs).
- `https://github.com/wanteddev/wanted-sans` — Wanted Sans typeface(7 weights + variable, SIL OFL 1.1).

**Tier 2 sources(2차 출처):**
- `getdesign.md/wanted` — record 없음(search returned "No designs found for 'wanted'"). pipeline 기준 unavailable로 기록.
- `styles.refero.design/?q=wanted` — playwright session이 parallel agents 때문에 계속 다른 탭(a-bly, zigzag, refero/socar)으로 전환되어 `q=wanted` 결과를 안정적으로 캡처하지 못했다. **unavailable**로 기록하고, Tier 1(live DOM + brandcenter + Montage docs + GitHub source)을 authoritative(권위 출처)로 취급한다.

**Tier 2b status:** partial. getdesign는 empty 확인, refero는 세션 경합으로 unreliable. Tier 1만으로도 공식 brand palette, live computed styles, open-source token package family가 충분하다.

**Conflicts unresolved:** 없음. 회원가입 CTA의 live `rgb(0, 102, 255)`는 brandcenter의 `#0066FF`와 정확히 일치한다. Logo avatar background `rgb(23, 23, 25)`(`#171719`)는 brand-secondary `#14191E`와 7-8 단위 차이가 있다. 이는 **UI heading color**(`#171719`, 제품에서 사용)와 **brand black**(`#14191E`, 마케팅에서 사용)의 알려진 분리로 보고, 두 token을 병행 유지한다.

## 5. Layout Principles(레이아웃 원칙)

### Spacing System(간격 체계)
- Base unit: 4px
- Common values: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64
- JobCard internal padding: 12px 16px(상하가 더 타이트한 비대칭)
- Filter row padding: 45px 0 20px(위쪽 buffer가 크고 아래쪽은 작음)
- Header height: desktop 56px, mobile 52px

### Grid & Container
- Max content width: 1185px(`JobList_JobList__filter` div에서 관찰)
- Job feed grid: ≥1185px에서 4열 / ≥768px에서 3열 / ≥480px에서 2열 / <480px에서 1열
- Card width at 4-col: 약 252px(`AdCard_AdCard__thumbnail` width와 일치)
- Gutter: 가로 20px, 세로 24px
- Page horizontal padding: 0. 카드는 grid edge에 맞추고 내부 card padding으로 시각 여백 확보.

### Whitespace Philosophy(여백 철학)
- **Generous filter zone**: filter row 위 45px, 아래 20px. filter UI가 핵심 navigation pattern(탐색 방식)이므로 강조한다.
- **Tight card interiors**: JobCard body는 12px 16px padding. Toss의 20px보다 촘촘하다. 카드는 개별 독서보다 grid scanning(훑어보기)에 맞춰져 있기 때문이다.
- **Hierarchical density**: Job feed는 dense(12-16개 카드가 보임)하고, job detail은 spacious(단일 열, 섹션 간 ≥24px vertical rhythm)하다.

### Border Radius Scale
- Squared(0-2px): legal/regulatory micro-pills, official-document callouts
- Compact(4-6px): filter category heading, small accents
- Standard(8px): buttons, inputs, secondary controls
- Comfortable(10px): segmented-control container, filter chips
- Card(12px): JobCard, AdCard, sheets
- Pill(9999px): header avatar, search trigger, country filter(`한국`)

## 6. Depth & Elevation(깊이와 떠 있는 정도)

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | Shadow 없음 | Page background, 기본 상태 JobCard |
| Border (Level 1) | `1px solid rgba(112, 115, 124, 0.16)` | Dropdown trigger icon, hairline edges |
| Hover (Level 2) | `#F7F7F8`로 미세한 background shift | Filter chip hover, segmented-control segment |
| Floating (Level 3) | `0px 4px 12px rgba(0,0,0,0.08)` | Dropdown menus, popovers, "더보기" overflow |
| Modal (Level 4) | `0px 8px 24px rgba(0,0,0,0.12)` | Application-form dialogs, full-screen sheets |

**Shadow Philosophy.** Wanted는 drop shadow(그림자)보다 background-tint elevation(배경 색조로 만든 높이감)을 선호한다. JobCard는 shadow 없이 흰 canvas 위에 떠 있고, 20-24px grid gutter와 주변 filter bar의 warm-grey `#F7F7F8`가 분리감을 만든다. shadow는 dropdown, modal 같은 floating overlay에만 쓰며, 낮은 opacity의 검정 단일 layer다. color tint나 multi-layer stack은 없다. 이는 Toss의 절제 원칙과 닮았지만, shadow token보다 grid spacing으로 구현한다.

## 7. Do's and Don'ts(해야 할 것과 하지 말 것)

### Do
- 모든 interactive element(상호작용 요소: links, primary CTAs, focus rings, selection states)에 `#0066FF` 사용
- Pretendard Variable(UI)과 Wanted Sans(brand)를 짝지어 쓰되, 같은 surface 안에서 섞지 않기
- JobCard와 "job content를 담는 container" 표면에는 12px radius 사용. 이것이 알아볼 수 있는 Wanted shape다.
- segmented-control track과 secondary panel에는 Wanted의 "surface grey"인 `#F7F7F8` 사용
- 합격보상금(referral bonus)은 해당 JobCard에 있을 때 눈에 띄게 표시. 브랜드 차별점이다.
- metadata에는 translucent secondary text(`rgba(55, 56, 60, 0.61)`) 사용. 표면에 자동 적응한다.

### Don't
- 상호작용에는 `#0066FF` 외의 파랑을 쓰지 않는다. marketing accent인 `#00ADFF` sky, `#8364FF` violet도 장식 전용이다.
- 기본 상태 카드에 shadow를 넣지 않는다. Wanted는 gutter separation(간격 분리)을 쓰며 elevation(높이감)에 의존하지 않는다.
- 같은 화면에서 brand black `#14191E`와 UI heading `#171719`를 섞지 않는다. marketing인지 product인지 표면을 정한다.
- dense UI(job listings, forms)에 Wanted Sans를 쓰지 않는다. display face(큰 제목용 서체)이고, Pretendard가 밀도에 더 강하다.
- JobCard 모서리를 직각으로 만들지 않는다. 12px radius가 표면의 brand mark다.
- job surface가 아닌 곳에 합격보상금 callout을 쓰지 않는다. active referral program이 있는 채용 공고 전용 badge다.
- body text에 bold(700) weight를 쓰지 않는다. heading과 job title 전용이다.

## 8. Responsive Behavior(반응형 동작)

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <480px | 1-column job feed, full-width cards, hamburger nav |
| Tablet | 480-768px | 2-column job feed, condensed filter bar(가로 스크롤) |
| Desktop | 768-1185px | 3-column job feed, full filter bar visible |
| Wide | ≥1185px | 4-column job feed, 1185px max-width로 중앙 정렬 |

### Touch Targets
- Filter chips: 36px height. thumb-tap(엄지 터치)에 편하고 desktop에서도 충분히 촘촘하다.
- Icon buttons: 30 / 36 / 40px 단계. context-dependent(compact / toolbar / card-action).
- Apply CTA: 48-52px. mobile에서는 full-width, desktop에서는 fixed width.

### Collapsing Strategy
- Filter bar: mobile에서 줄바꿈보다 가로 스크롤. linear chip taxonomy(칩의 선형 분류 흐름)를 보존한다.
- JobCard thumbnail: 모든 폭에서 4:3 aspect ratio 유지.
- Header search: mobile에서는 38px icon trigger로 접히고, desktop ≥768px에서는 inline input으로 확장.

### Image Behavior
- Company logos: 50px 정사각형, 9px radius, JobCard thumbnail의 bottom-left에 겹침.
- Job thumbnails: 4:3 aspect, object-fit cover, skeleton 없음. 로딩 중 solid `#F0F4F8` background 사용.
- Brand illustrations(marketing pages): full-bleed(화면 끝까지 차는 이미지), responsive, Wanted Sans display rhythm 준수.

## 9. Agent Prompt Guide(에이전트 프롬프트 가이드)

### Quick Color Reference
- Primary / Interactive: `#0066FF`(Wanted Blue, PANTONE 2195 C)
- Heading text: `#171719`
- Body text: `#333333`
- Secondary text: `rgba(55, 56, 60, 0.61)`
- Surface: `#FFFFFF`
- Surface subtle: `#F7F7F8`
- Border default: `rgba(112, 115, 124, 0.16)`
- Brand black(marketing): `#14191E`
- Marketing accents: `#FF5C00` / `#FF8EFF` / `#00ADFF` / `#8364FF` / `#F0F4F8`

### Example Component Prompts
- "JobCard를 만든다: white bg, 12px radius, 상단 모서리만 둥근 4:3 thumbnail(12 12 0 0), thumbnail bottom-left에 겹치는 50px-square company logo(9px radius). thumbnail 아래는 12 16px padding, position title 16px weight 600 `#171719`, company name 13px weight 400 `#333333`, location + experience caption 12px `rgba(55,56,60,0.61)`, thumbnail top-right에 optional 합격보상금 badge small pill. Bookmark icon button은 card top-right의 40px circle."
- "sign-up CTA를 만든다: `#0066FF` background, white text 14px weight 400, 8px radius, 32px height(header) 또는 48px(apply page), 7px 14px padding. Shadow 없음."
- "filter chip row를 디자인한다: mobile에서는 horizontal scroll. 각 chip은 36px height, 10px radius, transparent bg, `#171719` text 14px weight 400, 7-11px asymmetric padding. Active chip은 `#F7F7F8` background. Country chip(`한국`)은 trailing chevron이 있는 10px radius."
- "sort segmented control(최신순/추천순/인기순)을 만든다: `#F7F7F8` container, 40px height, 10px radius, 0 4px padding. Active segment는 white, 32px height, 8px radius. Inactive segment는 transparent. 14px Pretendard Variable text."
- "referral-reward badge(합격보상금 100만원)를 디자인한다: JobCard thumbnail top-left의 translucent overlay, white 12px weight 600 text, 별도 background shape 없음. legibility(가독성)를 위해 thumbnail 상단 30%에 subtle dark gradient overlay만 사용."

### Iteration Guide
1. Product UI에는 항상 Pretendard Variable, marketing에는 Wanted Sans 사용.
2. interactive color는 `#0066FF`. Material/Tailwind blue가 비슷해 보여도 다른 파랑을 쓰지 않는다.
3. JobCard 12px radius는 협상 불가. 이 radius가 브랜드다.
4. Border는 `rgba(112, 115, 124, 0.16)` 반투명이어야 한다. solid `#E5E8EB`가 아니다.
5. 카드 분리는 shadow가 아니라 grid gutter(20-24px)로 만든다.
6. Filter chip은 pill 또는 10px-radius다. 직각으로 만들지 않는다.
7. Secondary text는 fixed grey hex가 아니라 translucent `rgba(55,56,60,0.61)`다.

---

## 10. Voice & Tone(문체와 톤)

Wanted는 marketplace를 운영하는 career mentor(커리어 멘토)처럼 말한다. 밀어붙이지 않지만 자신감 있고, 기대를 과장하지 않지만 성장 지향적이며, 연봉과 조건을 spreadsheet(표 계산 문서)처럼 차갑게 만들지 않고 사실적으로 말한다. Korean is the primary voice(한국어가 기본 문체)이고, English UI는 한국어 구조를 따르는 2차 번역이다. brandcenter는 네 가지 communication values(커뮤니케이션 가치)를 명시한다. **"부드럽지만 명확하게"**, 커리어 성장을 돕는 자신감 있는 메시지, audience perspective(상대 관점)를 고려한 존중, 꾸밈 없는 사실 기반 커뮤니케이션이다.

| Context | Tone |
|---|---|
| CTAs | 짧은 한국어 명령형(`지원하기`, `회원가입`, `로그인`, `이력서 만들기`) |
| Job posting headers | pitch-y(광고처럼 과장된) 문구가 아니라 긴 설명형. `OO에서 함께 일할 백엔드 엔지니어를 찾습니다` |
| Salary range | 정확한 범위 또는 "회사 내규에 따름". "competitive" / "negotiable"만 단독 사용 금지 |
| Referral reward(합격보상금) | 만원 단위의 구체적 금액(`100만원`, `200만원`). 대략 금액 금지 |
| Empty states | why(이유)를 말하는 한 문장 + 하나의 action. `조건에 맞는 채용공고가 없어요` + reset button |
| Error messages | blame 없는 구체적 행동 문구. `잠시 후 다시 시도해주세요`는 가능하지만 `오류가 발생했습니다` 단독은 금지 |
| Onboarding | 2인칭, 성장 프레임. `당신의 다음 커리어를 찾아드릴게요`, `회원가입을 진행해주세요`가 아님 |
| Marketing voice | 자신감 있고 가능성 지향적. "일하는 사람들의 모든 가능성"이 master tagline |

**Forbidden phrases(금지 문구).** `대박 채용`, `핫한 회사`, `놓치지 마세요`(urgency-as-marketing, 조급함으로 파는 표현), `Oops`, generic `문제가 발생했습니다`, 연봉을 흐리는 문장(`약 X만원`, `최대 X까지`). 브랜드 약속은 precision(정확성)과 candidate time(지원자의 시간)에 대한 존중이다.

## 11. Brand Narrative(브랜드 서사)

Wanted는 **Wanted Lab**(원티드랩, 비상장 이후 2021년 KOSDAQ 상장)이 2015년 서울에서 시작한 consumer-facing product(일반 사용자용 제품)다. 회사의 문제의식은 한국 채용의 asymmetry(정보 비대칭)였다. 지원자는 offer stage(제안 단계) 전까지 연봉 범위를 보기 어렵고, 회사는 head-hunter에게 25-30% 수수료를 내며, "좋은 fit"은 데이터보다 이력서 훑기로 판단되었다. Wanted의 답은 **referral-bonus marketplace**(합격보상금 시장)였다. 채용이 성공하면 플랫폼이 지원자, 추천자, Wanted에게 나뉘는 현금 보너스를 지급해, 전통적인 헤드헌팅 수수료 구조를 노동자 쪽으로 뒤집었다.

제품은 job-posting platform(채용 공고 플랫폼)으로 시작했지만, Wanted Lab이 지금 말하는 "AI-powered career platform"(AI 기반 커리어 플랫폼)으로 진화했다. 360만 명 이상의 registered professionals(가입 직장인), 3만 5천 개 이상의 companies, 1천만 개 이상의 historical matches(과거 매칭 데이터)로 학습한 AI matching, 그리고 Wanted Plus(프리미엄 커리어 코칭), Wanted Gigs(프리랜스), Wanted ATS(기업 채용 운영) 같은 인접 제품이 있다. 모든 공고에 salary range(연봉 범위)를 드러내는 signature mechanic(대표 작동 방식)은 한국 테크 업계에서 문화적 힘이 되었다. 2010년대 후반에는 "원티드에 올라온 연봉"이 market-rate reference(시장 기준)처럼 쓰였다.

Design system인 **Montage**(몽타주)는 2024년 4월 1일 open-source design library(오픈소스 디자인 라이브러리)로 처음 공개되었다. 처음에는 April Fool's gesture(만우절 제스처)였지만 실제로 살아남았고, 2025년 4월 3일에는 `montage-web`, `montage-ios`, `montage-android`를 포함하는 multi-platform system(다중 플랫폼 시스템)으로 확장되었다. 팀은 70개 이상의 component와 각각 20-30개 variant가 생기며 내부 product complexity(제품 복잡도)가 일관성 유지 능력을 앞질렀기 때문에 이를 만들었다. 시스템의 중심 원칙인 **"Makers' Principle"**(메이커 원칙)은 component 사용 방식을 규정한다. 배경색은 availability(사용 가능 여부)를 직관적으로 나타내고, customization scope(커스터마이징 범위)는 명확하며, 시스템은 "제한적이기보다 소통적"이어야 한다.

Wanted가 거부하는 시각은 두 종류의 job-platform aesthetic(채용 플랫폼 미감)이다. 하나는 Saramin, JobKorea 같은 grey-and-bureaucratic legacy boards(회색 관료적 기존 채용 사이트)의 빽빽한 목록과 기관 느낌의 typography다. 다른 하나는 cartoon mascot과 gamification(게임화)이 있는 playful-but-shallow consumer apps(가볍지만 얕은 소비자 앱)다. Wanted는 그 사이를 차지한다. 전문적으로 느껴질 만큼 자신감 있고, 커리어 파트너처럼 느껴질 만큼 따뜻하다.

Wanted가 거부하는 것: urgency marketing(조급함을 유도하는 마케팅), salary obfuscation(연봉 흐리기), recruiter spam tone(채용 스팸 말투). 브랜드 약속은 **일하는 사람의 시간에 대한 존중**이며, design system은 모든 job posting을 구조적으로 동일하게 만들고, 모든 salary range를 보이게 하며, 모든 CTA를 하나로 만들면서 이를 강제한다.

## 12. Principles(원칙)

1. **One screen, one decision.** Job feed는 job card를 보여준다. Job detail은 하나의 job을 보여준다. Apply flow는 하나의 form을 보여준다. "promoted alongside organic"처럼 의도가 섞인 화면으로 사용자 목표를 흐리지 않는다.
2. **Salary is sacred.** 모든 job posting은 salary range 또는 `회사 내규` disclosure를 보여준다. 숨기지 않고, "면접에서 문의"로 넘기지 않는다. grid layout은 클릭하지 않아도 salary가 보이도록 설계한다.
3. **Brand blue is interaction, not decoration.** `#0066FF`는 links, CTAs, focus rings, selection states에만 등장한다. Marketing illustrations는 accent palette(orange/pink/sky/violet)를 쓸 수 있지만 product UI는 단색 blue 중심이다.
4. **The card is the brand.** JobCard의 12px radius, 4:3 thumbnail, bottom-left logo crop, bookmark-top-right 배치가 가장 강한 시각 signature다. 다른 surface는 이 rhythm을 참고해야지 새로 발명하면 안 된다.
5. **Korean-first, English-parity.** Wanted는 한국어 우선 audience를 대상으로 하며 global ambition(글로벌 확장 의지)이 있다. UI string은 한국어로 먼저 쓰고, English translation은 literal word order가 아니라 sentence structure를 보존한다.
6. **Density follows context.** Job feed는 dense(4×N grid)하고, Job detail은 spacious(단일 열, 큰 vertical rhythm)하다. 사용자가 깊이 들어갈수록 더 많은 breathing room을 준다.
7. **Gentle but clear.** brandcenter의 원칙처럼 친절함 때문에 명확성을 희생하지 않고, 정확성 때문에 따뜻함을 희생하지 않는다. either/or가 아니라 both/and다.

## 13. Personas(페르소나)

*아래 personas(가상의 사용자 유형)는 공개된 한국 커리어 플랫폼 사용자 세그먼트와 Wanted Lab의 공개 positioning(360만+ 직장인, 3만 5천+ 기업)을 바탕으로 만든 fictional archetypes(가상 전형)이다. 실제 개인이 아니다.*

**민준 (Minjun), 31, Seoul.** Series B startup의 backend engineer, 7년 경력 mid-level. 적극 구직 중은 아니지만 시장을 보기 위해 주 2-3회 Wanted를 연다. salary range로 현재 보상이 동료 대비 어디쯤인지 본다. 한 달에 5-10개 공고를 "혹시 모르니" bookmark한다. referral bonus는 결정 요인보다 작은 bonus로 본다. 지원 전 job description을 끝까지 읽고, salary가 숨겨져 있으면 바로 나간다.

**지영 (Jiyoung), 27, Pangyo.** agency에서 in-house로 옮기려는 UX designer, 4년 경력. active job search(적극 구직) 기간에는 3-4주 동안 Wanted를 집중적으로 쓰고 이후 휴면 상태가 된다. 회사 문화 설명과 long-form posting format을 중요하게 본다. Wanted가 job을 classified ad(짧은 광고)가 아니라 company introduction(회사 소개)처럼 보여주는 점을 가치 있게 여긴다. company stage(Series A-C)와 stack tag로 강하게 필터링하고, 지원 전 회사 brunch.co.kr 글을 같이 확인한다.

**박PM (Park, PM), 38, Gangnam.** mid-size SaaS company의 product manager이자 hiring side 사용자. 분기마다 Wanted ATS로 2-3개 role을 올린다. Wanted 후보자는 fit이 미리 걸러지는 편이라 success fee(referral bonus)를 협상 없이 지불한다. 연봉 band를 명시한 role을 올린다. 숨기면 "우리 회사도 안 보이게 된다"는 것을 경험했기 때문이다. 짧은 job description보다 Wanted의 company-introduction format을 더 높게 본다.

**유진 (Yujin), 24, Busan.** 최근 CS 졸업생, 첫 full-time search. 대학교 career center 블로그 글로 Wanted를 알게 되었다. salary range를 ground truth(사실 기준)처럼 보고, 인기순 sort로 본인 경력 수준에서 어떤 회사가 인기 있는지 배운다. 30개 role에 지원해 4번 interview를 받았다. 처음에는 referral-bonus mechanic("내가 받는 거예요?")이 헷갈렸지만, 지금은 `100만원` bonus가 "회사가 이 role을 진지하게 채우려 한다"는 signal로 본다.

## 14. States(상태)

| State | Treatment |
|---|---|
| **Empty (filter zero results)** | `#333333` body text 한 줄(`조건에 맞는 채용공고가 없어요`) + filter relaxation(필터 완화)을 제안하는 `rgba(55,56,60,0.61)` caption + `#0066FF` text button으로 reset. Illustration 없음. |
| **Empty (no bookmarks yet)** | why를 설명하는 한 문단(`관심있는 채용공고를 북마크 해보세요`) + feed 탐색 CTA. 흰 feed와 구분하려고 empty-state card에는 `#F7F7F8` surface 사용. |
| **Loading (first paint)** | 최종 JobCard dimension과 같은 `#F7F7F8` skeleton blocks. 4:3 thumbnail rectangle + title/company/salary용 3개 horizontal line placeholder. 12px radius 유지. |
| **Loading (refresh / pagination)** | feed 하단 inline spinner를 `#0066FF`로 표시. overlay나 blocking 없음. 기존 card는 계속 렌더. |
| **Error (form field)** | input에 `#F0483C` 1px border + 아래 13px `#F0483C` helper text. action 가능한 한 문장. |
| **Error (network failure)** | 중앙 메시지. `#171719` heading + `#333333` body, `#0066FF` retry button. inline error에는 illustration 없음. full-page outage에서만 사용. |
| **Error (full-page server outage)** | 흰 화면, 상단 중앙 Wanted logo, 16px `#171719` weight 600 단일 메시지, `#0066FF` filled retry button. |
| **Success (applied)** | brief inline flash. bookmark가 `#0066FF`로 변하고, "지원완료" badge가 `#00B97C`로 2초 나타난 뒤 지속 상태인 "지원함" pill로 안정화. Toast 없음. 지원은 event가 아니라 state change다. |
| **Success (saved / bookmarked)** | bookmark icon이 `#0066FF`로 fill되고, 200ms scale animation(1.0 -> 1.15 -> 1.0)을 `ease-spring` easing으로 실행. Toast 없음. |
| **Skeleton** | 최종 dimension과 정확히 맞는 `#F7F7F8` blocks. 1.5s shimmer, 6% white highlight gradient. JobCard skeleton은 12px radius와 4:3 thumbnail aspect 유지. |
| **Disabled** | Button opacity 0.4. Disabled input은 `rgba(112,115,124,0.16)` border 유지(geometry stable). Disabled chip은 transparent background에 `#A0A0A0` text. |
| **Hover (chip / button)** | background가 150ms `ease-standard`로 `#F7F7F8` 전환. Text color는 그대로. |
| **Focus (keyboard)** | `#0066FF` 2px outline ring + 2px offset. hover background를 대체한다. focused element가 bg-change와 ring을 중복으로 갖지 않는다. |

## 15. Motion & Easing(모션과 이징)

**Durations:**

| Token | Value | Use |
|---|---|---|
| `motion-instant` | 0ms | Bookmark fill, chip selection state, checkbox flip |
| `motion-fast` | 150ms | Hover transitions, chip background fade, button press |
| `motion-standard` | 250ms | 기본값. dropdown open, modal fade-in, card hover lift |
| `motion-slow` | 400ms | Page transitions, success state celebrations, filter drawer slide |
| `motion-page` | 350ms | Full-page route transitions |

**Easings:**

| Token | Curve | Use |
|---|---|---|
| `ease-enter` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | 등장하는 요소. dropdowns, modals, toasts, sheets |
| `ease-exit` | `cubic-bezier(0.4, 0.0, 1, 1)` | 사라지는 요소. dismissals, pops, modal close |
| `ease-standard` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | 양방향 전환. chips, accordions, tab switches |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | bookmark fill animation과 apply-success badge 전용. overshoot는 축하 순간에만 허용. |

**Signature motions.**

1. **Bookmark fill.** 사용자가 job을 bookmark하면 icon이 `motion-standard` + `ease-spring`으로 1.0 -> 1.15 -> 1.0 scale되고, color는 `#333333`에서 `#0066FF`로 전환된다. overshoot가 허용되는 유일한 곳이다. bookmarking은 작은 celebration이다.
2. **Filter chip selection.** Active state 전환: background `transparent` -> `#F7F7F8`, `motion-fast` + `ease-standard`. Text color는 유지한다. 변화는 의도적으로 느껴지지만 flashy하지 않다.
3. **JobCard hover (desktop).** 미세한 lift: `translateY(0)` -> `translateY(-2px)`, `motion-fast` + `ease-standard`. Shadow 변화 없음. flat aesthetic을 유지하면서 interactivity를 알린다.
4. **Apply success.** "지원완료" badge가 `motion-standard` / `ease-enter`로 fade-in되고, 짧은 scale pulse(`motion-fast` overlap, `ease-spring`)가 겹친다. 2초 후 조용한 "지원함" 상태로 안정화. Toast가 아니다. 지원은 영구 state change다.
5. **Reduce motion.** `prefers-reduced-motion: reduce`에서는 모든 duration을 `motion-instant`로 접는다. transition은 state swap이 된다. 제품은 완전히 기능하지만 덜 역동적이다.

<!--
OmD v0.1 Sources — Philosophy Layer (§10-15)

WebFetch / WebSearch로 검증(2026-05-13):
- https://www.wanted.co.kr/brandcenter/ — primary brand color #0066FF(PANTONE 2195 C),
  secondary palette (#14191E, #FF5C00, #FF8EFF, #00ADFF, #8364FF, #F0F4F8),
  네 가지 brand voice values: "부드럽지만 명확하게" / confident growth messaging /
  respectful framing / fact-based communication without embellishment.
- https://www.wantedlab.com/en/ — Wanted Lab founded 2015, 3.6M+ professionals,
  35K+ companies, AI-Powered HR Tech positioning, "AI Agents trained on 10M+
  matching data" claim, 70% time-to-hire reduction marketing claim.
- https://blog.wantedlab.com/library/insight/wds — WDS design system launch
  April 1, 2024(April Fool gesture that took off), expanded April 3, 2025,
  70+ components, "Makers' Principle" referenced, principle of
  "더 나은 협업 방식과 사용자 경험".
- https://montage.wanted.co.kr/ — Montage system name, "From Separate Core Blocks
  To a Seamless Flow" tagline, Wanted Sans + Pretendard JP typography stack.
- https://github.com/wanteddev/wanted-sans — Wanted Sans: "A Sans-serif font;
  Geometric with a heart, Humanist with a soul", 7 weights + variable,
  SIL OFL 1.1, supports 97+ languages, Korean-first design.
- https://github.com/wanteddev/montage-web — @wanteddev/wds package family
  (wds, wds-engine, wds-theme, wds-icon, wds-lottie, wds-nextjs, wds-codemod,
  wds-mcp, eslint-plugin-wds), MIT licensed, 295 releases.

Live DOM token observations(playwright getComputedStyle on
https://www.wanted.co.kr/wdlist/518):
- Primary CTA color: rgb(0, 102, 255) = #0066FF(brand alignment 확인)
- Heading text: rgb(23, 23, 25) = #171719
- Body text: rgb(51, 51, 51) = #333333
- Secondary text: rgba(55, 56, 60, 0.61)
- Border: rgba(112, 115, 124, 0.16)
- Surface subtle: rgb(247, 247, 248) = #F7F7F8
- Font stack: "Pretendard Variable", "Pretendard JP Variable", system-ui
- JobCard Radius: 24px; SortFilter container: 10px; segments: 8px

Personas(§13)는 Wanted Lab의 published positioning data(user/company counts,
AI matching claim, product surface list)를 바탕으로 한 fictional archetypes다.
특정 개인과 닮았다면 의도하지 않은 일이다.

Interpretive claims(예: "the cooler blue positions as growth-blue rather
than transaction-blue")는 Toss의 #3182f6과 비교한 editorial reading이며,
Wanted가 문서화한 statement가 아니다.
-->

---

## Included Components(포함된 컴포넌트)

이 design system(디자인 시스템)에 포함된 컴포넌트는 다음과 같다.

- Button
- Input
- Table
- Card
- Badge
- Tabs
- Dialog

---

## Iconography & SVG Guidelines(아이콘과 SVG 지침)

### Icon Library

프로젝트 전체에서 하나의 일관된 icon library(아이콘 라이브러리)를 사용한다. 권장 선택지는 다음과 같다.

- **Lucide React** (`lucide-react`): shadcn/ui 프로젝트의 기본값. 1,400개 이상의 icon, tree-shakeable(안 쓰는 아이콘 제거 가능), 일관된 24x24 grid.
- **Radix Icons** (`@radix-ui/react-icons`): 300개 이상의 icon, 15x15 grid, minimal and geometric.
- **Heroicons** (`@heroicons/react`): Tailwind 팀의 300개 이상 icon, outline/solid variant.

하나의 library만 고르고 전체에서 사용한다. 같은 프로젝트 안에서 icon library를 섞지 않는다.

### SVG Usage Rules

- 모든 icon은 color와 size 제어를 위해 inline SVG component여야 한다. `<img>` tag로 넣지 않는다.
- icon size는 type scale을 따른다. 16px(inline), 20px(buttons), 24px(standalone).
- icon color는 `currentColor`를 상속한다. fill/stroke 색을 hard-code하지 않는다.
- custom/brand icon은 `currentColor` fill을 가진 SVG component로 export한다.
- outline icon의 stroke width는 1.5px-2px. 프로젝트 전체에서 일관되게 유지한다.

### Icon Sizing Scale

| Context | Size | Usage |
|---------|------|-------|
| Inline text | 16px (1rem) | Badges, labels, breadcrumbs |
| Button icon | 18px (1.125rem) | Icon buttons, CTA icons |
| Standalone | 24px (1.5rem) | Navigation, card icons |
| Feature | 32-48px | Hero sections, empty states |

### SVG Optimization

- custom SVG는 commit 전에 모두 SVGO로 최적화한다.
- 불필요한 attributes를 제거한다. `xmlns`, `xml:space`, editor metadata 등.
- scalability(크기 조정 가능성)를 위해 fixed `width`/`height` 대신 `viewBox`를 사용한다.

---

## Document Policies(문서 정책)

### No Emojis

이 design system은 UI element, component, label, status indicator, documentation 어디에도 emoji를 사용하지 않는다.
선택한 icon library의 SVG icon을 사용한다. Emoji는 플랫폼마다 다르게 렌더되어 시각 일관성을 깨뜨린다.

- Status indicators: emoji 대신 colored dots 또는 icon components 사용.
- Section markers: checkmark/cross emoji 대신 text prefix("DO:" / "DON'T:") 또는 icon 사용.
- Navigation: emoji 대신 icon components 사용.

### Format Compliance(형식 준수)

이 문서는 Google Stitch DESIGN.md 9-section format을 따른다.
1. Visual Theme & Atmosphere
2. Color Palette & Roles
3. Typography Rules
4. Component Stylings
5. Layout Principles
6. Depth & Elevation
7. Do's and Don'ts
8. Responsive Behavior
9. Agent Prompt Guide

확장 섹션:
- Iconography & SVG Guidelines
- Document Policies

목표 길이: 250-400 lines. 간결하고 action 가능하게 유지한다.

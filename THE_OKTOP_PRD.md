# THE OKTOP — Product Requirements Document (PRD)
### 부제: 옥탑을 수익으로 바꾸다

---

## 목차
1. 프로젝트 개요
2. 기술 스택 및 환경
3. 디자인 시스템
4. 페이지 구성 및 기능 명세
5. API 연동 명세
6. 모바일 앱 전환 기준
7. 비기능 요구사항
8. Claude Code 3단계 구현 프롬프트

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | THE OKTOP |
| 부제 | 옥탑을 수익으로 바꾸다 |
| 서비스 유형 | 옥탑 건설 시공 전문 소개 + 상담 신청 웹/앱 플랫폼 |
| 타겟 플랫폼 | PC 웹 + 모바일 웹앱 (단일 HTML/CSS/JS 코드베이스) |
| 개발 도구 | Claude Code (단일 파일 또는 멀티파일 프로젝트) |

### 1.1 핵심 목표
- 옥탑(루프탑) 건설 시공 서비스를 소개하고 잠재 고객이 상담을 신청할 수 있는 플랫폼
- PC/모바일 레이아웃 자동 감지 + 수동 전환 버튼 제공
- 다크/라이트 모드 완전 전환 (금색 포인트 컬러 포함)
- 네이버 지도 API 연동, 네이버 소셜 로그인(OAuth) 연동

---

## 2. 기술 스택 및 환경

### 2.1 Frontend
- **언어**: HTML5, CSS3 (CSS Variables 기반 테마), Vanilla JavaScript (ES6+)
- **번들러**: 없음 (단일 파일 또는 소규모 멀티파일)
- **CSS 구조**: CSS Custom Properties (`--var`) 기반 다크/라이트/금색 테마 완전 전환
- **반응형**: Flexbox + CSS Grid, 미디어쿼리 `(max-width: 768px)` 기준
- **모드 전환**: JS로 `data-theme`, `data-layout` 속성 토글

### 2.2 외부 API
| API | 용도 | 방식 |
|-----|------|------|
| 네이버 지도 Maps API | 주소 검색 → 지도 표시 | JavaScript SDK + iframe embed |
| 네이버 Places API | 건물/주소 정보 카드 | REST (CORS Proxy 또는 서버 필요) |
| 네이버 OAuth 2.0 | 소셜 로그인 (상담신청) | Redirect 방식 |
| 네이버 Clova OCR (선택) | 등기부등본 텍스트 추출 | REST API |

### 2.3 파일 저장 (상담 첨부)
- 브라우저 환경: File API + FormData → 서버 업로드 (백엔드 미포함 시 LocalStorage Base64 임시 저장)
- 드래그앤드롭: HTML5 Drag and Drop API

---

## 3. 디자인 시스템

### 3.1 컬러 팔레트 (CSS Variables)

```css
/* 라이트 모드 */
:root[data-theme="light"] {
  --bg-primary: #FAFAF8;
  --bg-secondary: #F0EDE6;
  --text-primary: #1A1A1A;
  --text-secondary: #555550;
  --gold-primary: #C9A84C;
  --gold-secondary: #E8C87A;
  --gold-dark: #A07830;
  --accent-border: #C9A84C;
  --card-bg: #FFFFFF;
  --nav-bg: rgba(250,250,248,0.95);
  --shadow: 0 4px 24px rgba(0,0,0,0.08);
}

/* 다크 모드 */
:root[data-theme="dark"] {
  --bg-primary: #0F0F0D;
  --bg-secondary: #1A1A16;
  --text-primary: #F5F3EE;
  --text-secondary: #A8A49C;
  --gold-primary: #D4AF5C;
  --gold-secondary: #EDD080;
  --gold-dark: #B8962E;
  --accent-border: #D4AF5C;
  --card-bg: #1E1E18;
  --nav-bg: rgba(15,15,13,0.95);
  --shadow: 0 4px 24px rgba(0,0,0,0.4);
}
```

### 3.2 타이포그래피
- **제목 폰트**: `Playfair Display` (serif, 고급스러운 느낌)
- **본문 폰트**: `Noto Sans KR` (한국어 최적화)
- **포인트 폰트**: `Montserrat` (영문 강조)

### 3.3 UI 컴포넌트 기준
- 버튼 기본: `border-radius: 4px`, 금색 테두리 + 호버 시 fill
- 카드: `border-radius: 12px`, shadow + hover lift 효과
- 입력 필드: 하단 라인 스타일 (material 느낌), 포커스 시 금색
- 내비게이션: 상단 고정 (sticky), 스크롤 시 배경 반투명

---

## 4. 페이지 구성 및 기능 명세

### 4.1 내비게이션 바 (전역)

| 요소 | 설명 |
|------|------|
| 로고 | "THE OKTOP" (금색 텍스트 로고) |
| 메뉴 | 서비스 / 시공현장 / 주소검색 / 상담신청 |
| 우측 컨트롤 | [🌙 다크/라이트 토글] [📱 PC/모바일 전환] [상담신청 CTA 버튼] |
| 모바일 | 햄버거 메뉴로 접힘, 슬라이드 드로어 방식 |

**레이아웃 전환 버튼 로직:**
```javascript
// 접속 시 자동 감지
const isMobile = window.innerWidth <= 768;
document.documentElement.setAttribute('data-layout', isMobile ? 'mobile' : 'pc');

// 수동 전환 버튼
function toggleLayout() {
  const current = document.documentElement.getAttribute('data-layout');
  document.documentElement.setAttribute('data-layout', current === 'pc' ? 'mobile' : 'pc');
}
```

---

### 4.2 페이지 1 — 서비스 (+ 강점)

#### 4.2.1 히어로 섹션
- 전체 화면 배경 (다크: 깊은 차콜 + 금색 파티클 효과 / 라이트: 밝은 크림 + 금색 라인)
- 메인 카피: **"옥탑을 수익으로 바꾸다"**
- 서브 카피: 건축물 가치 극대화 솔루션
- CTA 버튼: "무료 상담 신청하기" → 상담신청 페이지 앵커 이동

#### 4.2.2 서비스 소개 섹션
> ⚠️ `remixed-266b3f9b.html` 파일의 내용으로 채울 것 (파일 미첨부로 구조 명세만 기술)

- **서비스 카드 그리드** (PC: 3열, 모바일: 1열)
  - 각 카드: 아이콘 + 제목 + 설명 + 더보기 링크
  - 예시 항목: 옥탑 설계 컨설팅 / 구조 안전 진단 / 인허가 대행 / 시공 일괄 도급 / 인테리어 마감 / 수익화 전략 컨설팅

#### 4.2.3 강점(USP) 섹션
- 가로 스크롤 카드 또는 아코디언 방식
- 강점 항목 (최소 4개):
  1. **신속한 인허가** — 평균 처리 기간 30% 단축
  2. **일괄 시공** — 설계부터 준공까지 원스톱
  3. **수익 극대화 설계** — 임대 수익률 분석 포함
  4. **품질 보증** — 준공 후 3년 하자보수 보증
- 숫자 카운터 애니메이션: 완공 건수, 만족도(%), 평균 수익률(%)

#### 4.2.4 프로세스 섹션
- 시공 진행 단계: 상담 → 현장조사 → 설계 → 인허가 → 시공 → 준공 → AS
- 수평 스텝 인디케이터 (PC) / 수직 타임라인 (모바일)

---

### 4.3 페이지 2 — 시공현장

#### 4.3.1 페이지 헤더
- "시공 현장" 제목 + 필터 버튼: 전체 / 시공중 / 완공

#### 4.3.2 프로젝트 카드 목록 (3개 예시)

**프로젝트 1 — 시공중 (진행률 65%)**
| 항목 | 내용 |
|------|------|
| 명칭 | 강남구 논현동 옥탑 복층 주거 프로젝트 |
| 위치 | 서울시 강남구 논현동 |
| 유형 | 주거용 옥탑 증축 |
| 면적 | 85㎡ |
| 상태 | 시공중 (구조체 완료, 외장 진행 중) |
| 예정 준공 | 2025년 9월 |
| 이미지 | 현장 사진 placeholder (그라디언트 썸네일) |

**프로젝트 2 — 시공중 (진행률 30%)**
| 항목 | 내용 |
|------|------|
| 명칭 | 마포구 합정동 루프탑 카페 조성 |
| 위치 | 서울시 마포구 합정동 |
| 유형 | 상업용 루프탑 개조 |
| 면적 | 120㎡ |
| 상태 | 시공중 (기초 철골 작업 중) |
| 예정 준공 | 2025년 11월 |

**프로젝트 3 — 완공**
| 항목 | 내용 |
|------|------|
| 명칭 | 용산구 이태원 프리미엄 옥탑 스튜디오 |
| 위치 | 서울시 용산구 이태원동 |
| 유형 | 주거+임대 복합 옥탑 |
| 면적 | 70㎡ |
| 상태 | 완공 ✅ |
| 준공일 | 2025년 3월 |
| 월 임대 수익 | 약 180만원 (수익화 성공 사례) |

#### 4.3.3 카드 UI 스펙
- 상태 뱃지: 시공중(금색 점멸) / 완공(초록)
- 진행률 바: CSS 애니메이션 프로그레스바
- 이미지 영역: aspect-ratio 16:9, hover 시 확대 오버레이
- "자세히 보기" 클릭 → 모달 또는 상세 드로어

---

### 4.4 페이지 3 — 주소검색

#### 4.4.1 검색 UI
- 검색창: placeholder "주소 또는 건물명 입력"
- 검색 버튼 + 현재위치 버튼 (Geolocation API)
- 최근 검색 기록 (LocalStorage 저장, 최대 5개)

#### 4.4.2 네이버 지도 연동
```html
<!-- 네이버 Maps API 임베드 방식 -->
<div id="map" style="width:100%; height:450px;"></div>
<script type="text/javascript" 
  src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID">
</script>
<script>
  var map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 15
  });
  
  // 주소 → 좌표 변환 (Geocoding)
  naver.maps.Service.geocode({ query: address }, function(status, response) {
    if (status === naver.maps.Service.Status.OK) {
      var result = response.v2.addresses[0];
      var point = new naver.maps.Point(result.x, result.y);
      map.setCenter(point);
      new naver.maps.Marker({ position: point, map: map });
    }
  });
</script>
```

#### 4.4.3 건물정보 카드
검색 결과 좌측 또는 하단에 표시:
- 주소 (도로명 + 지번)
- 건물 용도 (주거/상업/혼합)
- 토지 면적
- 옥탑 설치 가능 여부 (판단 기준 텍스트)
- "이 건물 상담 신청하기" 버튼 → 상담신청 페이지로 주소 자동 전달

---

### 4.5 페이지 4 — 상담신청

#### 4.5.1 인증/로그인 영역

**직접 회원가입 폼:**
```
이름 *          [                    ]
이메일 *         [                    ]
휴대폰 번호 *    [010-____-____] [인증번호 받기]
인증번호 *       [      ] [확인]
비밀번호 *       [                    ]
비밀번호 확인 *  [                    ]
```

**네이버 소셜 로그인 버튼:**
```
[네이버 아이디로 로그인]  ← 초록 배경, 네이버 N 아이콘
```
- OAuth 2.0 Redirect 방식
- 네이버 개발자센터 앱 등록 → Client ID/Secret 필요
- 콜백 URL 처리 후 사용자 정보(이름, 이메일, 휴대폰) 자동 입력

#### 4.5.2 로그인 후 상담신청 폼

```
상담 유형 *       [○ 신규 시공  ○ 리모델링  ○ 컨설팅만]
건물 주소 *       [                    ] [주소 검색]
건물 층수         [   ] 층
현재 옥탑 유무    [○ 있음  ○ 없음]
희망 용도         [○ 주거  ○ 임대  ○ 상업  ○ 기타]
예산 범위         [○ ~3천만원  ○ 3~5천  ○ 5천~1억  ○ 1억 이상]
희망 공사 시기    [      년  ____월]
문의 내용         [                              ]
                  [                              ]
```

#### 4.5.3 등기부등본 업로드 영역

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   📄 등기부등본을 여기에 드래그하거나               │
│       클릭하여 업로드하세요                          │
│                                                     │
│   지원 형식: PDF, JPG, PNG (최대 20MB)              │
│                                                     │
└─────────────────────────────────────────────────────┘
  [업로드된 파일명.pdf ✕]  ← 파일 추가 후 표시
```

**구현 스펙:**
```javascript
// 드래그앤드롭
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  handleFileUpload(files);
});

// 클릭 업로드
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFileUpload(e.target.files));

// 파일 검증
function handleFileUpload(files) {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 20 * 1024 * 1024; // 20MB
  // ... 유효성 검사 후 미리보기 표시
}
```

#### 4.5.4 제출 버튼
- "상담 신청하기" (금색 배경)
- 제출 후: 성공 모달 (접수번호 표시 + "홈으로 돌아가기")

---

## 5. API 연동 명세

### 5.1 네이버 지도 Maps API

| 항목 | 내용 |
|------|------|
| 발급처 | https://www.ncloud.com (NAVER Cloud Platform) |
| 사용 API | Maps JavaScript API v3 |
| 필요 키 | `ncpClientId` (클라이언트 ID) |
| 등록 도메인 | 서비스 도메인 등록 필수 |
| 기능 | 지도 표시, 마커, 주소→좌표 변환(Geocoding) |

### 5.2 네이버 OAuth 2.0 (소셜 로그인)

| 항목 | 내용 |
|------|------|
| 발급처 | https://developers.naver.com |
| 인증 방식 | Authorization Code Grant |
| 필요 정보 | Client ID, Client Secret, Redirect URI |
| 요청 권한(scope) | name, email, mobile |
| 주의사항 | Client Secret은 서버에서만 사용 (프론트 노출 금지) |

**OAuth 흐름:**
```
1. 사용자 클릭 → 네이버 로그인 페이지 리다이렉트
   https://nid.naver.com/oauth2.0/authorize?response_type=code
   &client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&state=RANDOM_STATE

2. 사용자 로그인 → 콜백 URL로 code 전달
   https://yourdomain.com/callback?code=AUTH_CODE&state=STATE

3. 서버에서 Access Token 교환
   POST https://nid.naver.com/oauth2.0/token

4. 사용자 프로필 조회
   GET https://openapi.naver.com/v1/nid/me
```

---

## 6. 모바일 앱 전환 기준

### 6.1 자동 감지 로직
```javascript
function detectAndSetLayout() {
  const ua = navigator.userAgent;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isNarrow = window.innerWidth <= 768;
  const layout = (isMobileUA || isNarrow) ? 'mobile' : 'pc';
  document.documentElement.setAttribute('data-layout', layout);
}
window.addEventListener('resize', detectAndSetLayout);
detectAndSetLayout();
```

### 6.2 레이아웃별 CSS 차이

| 요소 | PC (`data-layout="pc"`) | 모바일 (`data-layout="mobile"`) |
|------|------------------------|-------------------------------|
| 내비게이션 | 수평 메뉴바 | 햄버거 → 슬라이드 드로어 |
| 서비스 카드 | 3열 그리드 | 1열 스택 |
| 지도 | 좌우 분할 (지도 60% + 카드 40%) | 상하 분할 (지도 위, 카드 아래) |
| 상담 폼 | 2열 입력 | 1열 입력 |
| 전환 버튼 | 우상단 아이콘 버튼 | 우상단 아이콘 버튼 (동일) |

### 6.3 전환 버튼 UI
```html
<!-- 다크/라이트 + PC/모바일 전환 버튼 (내비바 우측) -->
<div class="control-buttons">
  <button id="themeToggle" title="다크/라이트 전환">🌙</button>
  <button id="layoutToggle" title="PC/모바일 전환">📱</button>
</div>
```

---

## 7. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 성능 | First Contentful Paint < 2.5초 (이미지 lazy-load 적용) |
| 접근성 | 키보드 네비게이션 지원, ARIA 레이블 적용 |
| 브라우저 지원 | Chrome 90+, Safari 14+, Firefox 88+, Edge 90+ |
| SEO | meta description, og:image, 구조화 데이터(JSON-LD) |
| 보안 | API Key는 환경변수 또는 서버 프록시 사용, XSS 방어 |
| 파일 업로드 | 최대 20MB, PDF/JPG/PNG만 허용, 클라이언트 검증 |

---

## 8. Claude Code 3단계 구현 프롬프트

---

### 🔵 STEP 1 — 기반 구조 + 디자인 시스템 + 내비게이션

```
프로젝트 이름: THE OKTOP (옥탑을 수익으로 바꾸다)
출력 경로: C:\Users\wkboo\Desktop\theoktop\

아래 요구사항으로 index.html, style.css, main.js 세 파일을 생성해줘.

[1] 파일 구조
theoktop/
├── index.html
├── style.css
├── main.js
└── assets/
    └── (이미지 placeholder)

[2] CSS 디자인 시스템 (style.css)
- CSS Custom Properties 기반으로 라이트/다크 테마 완전 전환
- 두 세트의 변수 정의:
  :root[data-theme="light"] { --bg-primary: #FAFAF8; --bg-secondary: #F0EDE6;
    --text-primary: #1A1A1A; --text-secondary: #555550;
    --gold-primary: #C9A84C; --gold-secondary: #E8C87A;
    --card-bg: #FFFFFF; --nav-bg: rgba(250,250,248,0.95); }
  :root[data-theme="dark"] { --bg-primary: #0F0F0D; --bg-secondary: #1A1A16;
    --text-primary: #F5F3EE; --text-secondary: #A8A49C;
    --gold-primary: #D4AF5C; --gold-secondary: #EDD080;
    --card-bg: #1E1E18; --nav-bg: rgba(15,15,13,0.95); }
- 폰트: Google Fonts에서 Playfair Display + Noto Sans KR + Montserrat 로드
- 기본 reset CSS, 박스모델, 스크롤 부드럽게(scroll-behavior: smooth)

[3] PC/모바일 레이아웃 전환
- data-layout="pc" / data-layout="mobile" 속성 기반 CSS 분기
- 접속 시 UserAgent + window.innerWidth로 자동 감지
- 수동 전환 버튼: 내비바 우측에 다크/라이트 버튼 옆에 배치

[4] 내비게이션 바 (sticky)
- 좌측: THE OKTOP 로고 (금색 텍스트, Playfair Display)
- 중앙: 서비스 | 시공현장 | 주소검색 | 상담신청 (앵커 링크)
- 우측: [🌙 테마 토글] [📱 레이아웃 토글] [상담신청 CTA 버튼]
- 모바일: 햄버거 아이콘 → 오버레이 드로어 메뉴
- 스크롤 시 배경 반투명 + 그림자 효과

[5] 히어로 섹션 (서비스 페이지 최상단)
- 전체 화면 높이(100vh)
- 다크모드: 짙은 차콜 배경 + 금색 기하학 패턴 SVG
- 라이트모드: 크림색 배경 + 금색 라인 패턴
- 메인 타이틀: "THE OKTOP" (Playfair Display, 대형)
- 서브타이틀: "옥탑을 수익으로 바꾸다"
- CTA 버튼: "무료 상담 신청" → #consultation 앵커
- 스크롤 다운 인디케이터 애니메이션

각 섹션에 id="service", id="projects", id="map-search", id="consultation" 앵커 포함.
```

---

### 🟡 STEP 2 — 서비스 페이지 + 시공현장 + 주소검색 (네이버 지도)

```
STEP 1에서 생성한 파일에 이어서 아래 섹션들을 추가해줘.

[1] 서비스 섹션 (id="service")

① 서비스 카드 그리드 (PC: 3열, 모바일: 1열)
  카드 6개:
  - 아이콘(SVG 인라인) + 제목 + 설명 2~3줄
  1. 옥탑 설계 컨설팅 — 수익성 분석 기반 최적 설계 제안
  2. 구조 안전 진단 — 기존 건물 하중 분석 및 보강 솔루션
  3. 인허가 대행 — 복잡한 행정 절차를 원스톱으로 처리
  4. 시공 일괄 도급 — 철골/방수/단열/마감 전 공정 책임 시공
  5. 인테리어 마감 — 임대/상업 목적별 맞춤 인테리어
  6. 수익화 전략 컨설팅 — 임대 운영 및 수익률 극대화 전략
  - 카드 hover 시 위로 lift + 금색 상단 border 강조

② 강점(USP) 섹션
  - 4개 강점 카드 (아이콘 + 숫자 + 설명)
  - 숫자 카운터 애니메이션 (Intersection Observer 사용):
    완공 건수: 0 → 147건 / 고객 만족도: 0 → 98% / 평균 수익률: 0 → 12.4%
  - 강점 4: "3년 하자보수 보증"

③ 프로세스 타임라인
  PC: 수평 스텝 (1→2→3→...→7)
  모바일: 수직 타임라인
  단계: 무료상담 → 현장조사 → 설계확정 → 인허가 → 착공 → 준공 → 사후관리

[2] 시공현장 섹션 (id="projects")

필터 버튼: [전체] [시공중] [완공] — 클릭 시 해당 카드만 표시 (CSS display toggle)

프로젝트 카드 3개 (PC: 3열, 모바일: 1열):

프로젝트1 (시공중, 65%):
  제목: 강남구 논현동 옥탑 복층 주거
  위치: 서울시 강남구 논현동 | 면적: 85㎡ | 유형: 주거용
  진행률 바: 65% (CSS animation)
  예정 준공: 2025년 9월

프로젝트2 (시공중, 30%):
  제목: 마포구 합정동 루프탑 카페
  위치: 서울시 마포구 합정동 | 면적: 120㎡ | 유형: 상업용
  진행률 바: 30%
  예정 준공: 2025년 11월

프로젝트3 (완공 ✅):
  제목: 용산구 이태원 프리미엄 스튜디오
  위치: 서울시 용산구 이태원동 | 면적: 70㎡ | 유형: 주거+임대
  준공: 2025년 3월 | 월 임대수익: 약 180만원

각 카드 클릭 시 상세 모달 오픈 (상세 텍스트 + 가상 이미지 갤러리)
상태 뱃지: 시공중(금색 점멸 dot) / 완공(초록 체크)

[3] 주소검색 섹션 (id="map-search")

레이아웃:
  PC: 좌우 분할 (검색+지도 60% / 건물정보카드 40%)
  모바일: 상하 (검색+지도 → 카드)

① 검색 영역
  - 텍스트 인풋 + [검색] 버튼 + [📍 현재위치] 버튼
  - 최근 검색 태그 (LocalStorage, 최대 5개)

② 네이버 지도 임베드
  ```html
  <script src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_NAVER_CLIENT_ID&submodules=geocoder"></script>
  <div id="naver-map" style="width:100%;height:420px;border-radius:12px;"></div>
  ```
  - 검색 → 주소 Geocoding → 지도 이동 + 마커 표시
  - ncpClientId는 'YOUR_NAVER_CLIENT_ID' 플레이스홀더로 두고 주석으로 안내

③ 건물정보 카드 (검색 후 표시)
  - 건물명/주소
  - 추정 용도 / 토지 면적 / 건물 층수
  - 옥탑 설치 적합도 표시 (✅ 적합 / ⚠️ 검토필요)
  - [이 건물 상담 신청하기] 버튼 → 주소 쿼리파라미터로 #consultation 이동
```

---

### 🔴 STEP 3 — 상담신청 (로그인 + 폼 + 파일업로드) + 전체 마무리

```
STEP 1~2 완성 파일에 이어서 상담신청 섹션과 전체 마무리를 해줘.

[1] 상담신청 섹션 (id="consultation")

① 로그인/회원가입 탭 영역 (로그인 안 된 경우 표시)
  
  탭: [직접 가입] | [네이버 로그인]
  
  직접 가입 폼:
    이름 * | 이메일 * | 휴대폰번호 * + [인증번호 받기] 버튼
    인증번호 입력 + [확인] 버튼 (60초 타이머 카운트다운)
    비밀번호 * | 비밀번호 확인 *
    [가입 완료] 버튼
  
  네이버 로그인:
    [N 네이버 아이디로 로그인] 버튼 (초록 #03C75A)
    클릭 시 네이버 OAuth URL로 이동:
    https://nid.naver.com/oauth2.0/authorize?response_type=code
      &client_id=YOUR_NAVER_CLIENT_ID
      &redirect_uri=YOUR_REDIRECT_URI
      &state=RANDOM_STATE
    CLIENT_ID, REDIRECT_URI는 플레이스홀더로 두고 주석 안내

② 로그인 후 상담 신청 폼 (로그인 완료 시 표시, 미로그인 시 숨김)

  PC: 2열 그리드 / 모바일: 1열
  
  필드 목록:
    상담 유형 (라디오): 신규 시공 / 리모델링 / 컨설팅 상담
    건물 주소 * [주소 입력] + [검색] → 주소검색 섹션 연동
    건물 층수 (숫자 인풋)
    현재 옥탑 유무 (라디오): 있음 / 없음
    희망 용도 (체크박스 복수 선택): 주거 / 임대 / 상업 / 기타
    예산 범위 (셀렉트박스): ~3천만 / 3~5천 / 5천~1억 / 1억 이상
    희망 공사 시기 (연/월 셀렉트)
    문의내용 (textarea, 4행)

③ 등기부등본 업로드 드롭존

  드롭존 UI:
  ┌─────────────────────────────────────────────────┐
  │  📄                                             │
  │  등기부등본을 드래그하거나 클릭하여 업로드하세요 │
  │  PDF, JPG, PNG 지원 · 최대 20MB               │
  └─────────────────────────────────────────────────┘
  
  기능:
  - dragover 시 테두리 금색 강조 + 배경 변경
  - drop 또는 클릭(hidden file input) 으로 파일 선택
  - 파일 선택 후: 파일명 + 용량 + [삭제 ✕] 뱃지 표시
  - 검증: PDF/JPG/PNG만 허용, 20MB 초과 시 에러 토스트
  - 복수 파일 지원 (최대 3개)

④ 제출 버튼
  [상담 신청하기] — 금색 배경, 전체 너비
  클릭 시:
    - 필수항목 미입력 시 해당 필드 빨간 테두리 + 에러 메시지
    - 통과 시 성공 모달:
      "상담 신청이 완료되었습니다!"
      접수번호: #OKT-20250601-0042
      "담당자가 1~2 영업일 내 연락드리겠습니다."
      [홈으로] 버튼

[2] 푸터
  로고 + 회사정보 (사업자번호, 주소, 전화, 이메일)
  메뉴 링크 4개
  SNS 아이콘 (인스타그램, 유튜브, 카카오톡)
  카피라이트: © 2025 THE OKTOP. All rights reserved.

[3] 전체 마무리 체크리스트
  - 모든 섹션에 CSS transition 부드럽게 (0.3s ease)
  - Intersection Observer로 섹션 진입 시 fade-in 애니메이션
  - 스크롤 상단으로 돌아가기 버튼 (우하단, 스크롤 300px 이후 표시)
  - meta charset, viewport, og:title, og:description 포함
  - Google Fonts 로드: Playfair+Display:400,700 | Noto+Sans+KR:400,500,700 | Montserrat:600
  - 모든 CSS는 data-theme과 data-layout 조합으로 완전히 동작 확인
  - 네이버 API 키 위치에 명확한 주석: "// TODO: 네이버 클라우드 플랫폼에서 발급한 Client ID 입력"
  - 코드 상단에 개발자 가이드 주석 블록 (API 설정 방법 요약)
```

---

## 부록: 네이버 API 키 발급 가이드

### 네이버 지도 API
1. https://www.ncloud.com 가입
2. 콘솔 → AI·NAVER API → Maps → Application 등록
3. Web Dynamic Map 서비스 활성화
4. 허용 도메인에 서비스 URL 추가
5. `ncpClientId` 복사 → index.html에 삽입

### 네이버 소셜 로그인
1. https://developers.naver.com 가입
2. Application 등록 → 네아로(네이버 아이디로 로그인) 선택
3. 서비스 환경: PC웹/모바일웹 선택
4. 콜백 URL 등록 (예: https://yourdomain.com/callback)
5. Client ID, Client Secret 발급 → 서버 환경변수에 저장

> ⚠️ **보안 주의**: Client Secret은 절대 프론트엔드 코드에 포함하지 말 것.
> 서버리스 환경(GitHub Pages 등) 사용 시 Client Secret 없이 동작하는 Implicit Flow 방식 고려.

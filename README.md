# 콩스튜디오 채용 대시보드

지원자의 이름·공고명·전형 단계만 Google Sheet에서 실시간으로 읽고, 공고별 TO와 채용 배경을 관리하는 별도 채용 대시보드입니다.

## 데이터 연결 구조

- GitHub 저장소와 배포 파일에는 지원자 이름을 저장하지 않습니다.
- 브라우저는 Google Sheet에 직접 접근하지 않고 Cloudflare Function을 거칩니다.
- 시트 연동 토큰도 브라우저 코드에 포함되지 않습니다.
- 공개 게임잡 채용 데이터 사이트와 저장소를 완전히 분리합니다.
- 별도의 로그인·비밀번호 화면 없이 대시보드 주소로 바로 접속합니다.

> 현재 버전은 접속 제한이 없습니다. 실제 지원자 이름을 연결하면 URL을 아는 사람이 볼 수 있으므로, 시험 운영 후 필요할 때 접근 제한을 추가하세요.

## 표시되는 전형 단계

`온라인 과제`, `코딩테스트`, `역량검사`, `면접`, `1차 면접`, `2차 면접`, `면접합격`, `처우단계`, `Offer`

`Hired`, 불합격, 포기, 취소 등은 카드로 표시하지 않습니다. `Hired`는 공고별 충원 완료 인원 계산에만 사용합니다.

## 1. 별도 GitHub 저장소 만들기

1. GitHub에서 `New repository`를 누릅니다.
2. 저장소 이름을 `kong-recruiting-dashboard`로 입력합니다.
3. 반드시 `Private`를 선택합니다.
4. 이 프로젝트의 모든 파일을 저장소에 업로드합니다.

## 2. Google Sheet API 설치

1. 지원자 관리 Google Sheet를 엽니다.
2. `확장 프로그램 → Apps Script`를 선택합니다.
3. 기본 코드를 지우고 `google-apps-script/Code.gs` 전체를 붙여넣습니다.
4. Apps Script의 `프로젝트 설정 → 스크립트 속성`에 다음 값을 추가합니다.
   - 속성: `API_TOKEN`
   - 값: 직접 만든 40자 이상의 임의 문자열
5. `배포 → 새 배포 → 웹 앱`을 선택합니다.
6. 실행 사용자는 `나`, 액세스 사용자는 `모든 사용자`로 설정합니다.
7. 배포 후 `/exec`로 끝나는 웹 앱 URL을 복사합니다.

웹 앱 자체는 공개 주소지만 `API_TOKEN`이 없는 요청은 데이터를 반환하지 않습니다. 토큰은 Cloudflare와 GitHub Secret에만 저장합니다.

Apps Script는 다음 탭을 자동으로 찾습니다.

- 지원자: `1. 2026 Interviewee`
- TO·채용 배경: `TO정리`
- 게임잡 동기화 결과: `채용대시보드_공고` 자동 생성

지원자 시트의 헤더 위치는 자동 탐색하므로 13행에 고정할 필요가 없습니다. 필수 헤더는 `진행단계`, `이름`, `직무(공고명)`이며, `PJ`가 있으면 프로젝트명으로 사용합니다.

## 3. Cloudflare Pages 배포

1. Cloudflare에서 `Workers & Pages → Create → Pages → Connect to Git`으로 이동합니다.
2. 위에서 만든 비공개 GitHub 저장소를 연결합니다.
3. 빌드 설정을 입력합니다.
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. `Settings → Variables and Secrets`에 다음 두 값을 `Secret`으로 등록합니다.
   - `SHEET_API_URL`: Apps Script의 `/exec` URL
   - `SHEET_API_TOKEN`: Apps Script의 `API_TOKEN`과 같은 값
5. 다시 배포합니다.

## 4. 게임잡 신규 공고 자동 등록

별도 GitHub 저장소의 `Settings → Secrets and variables → Actions`에 다음 Repository Secret을 등록합니다.

- `SHEET_API_URL`: Apps Script `/exec` URL
- `SHEET_API_TOKEN`: Apps Script `API_TOKEN`

그다음 `Actions → Sync KONG GameJob Openings → Run workflow`를 한 번 실행합니다. 이후 매시간 7분에 콩스튜디오코리아 공고를 확인합니다.

- 신규 `GI_No`: 대시보드 공고 자동 생성
- 유지 `GI_No`: 공고 정보 갱신
- 사라진 `GI_No`: 삭제하지 않고 `마감` 처리
- 수집 결과가 0건인 경우: 기존 공고를 변경하지 않고 작업 실패 처리

## 5. 공개 사이트에 링크 연결

기존 `gpt-final` 저장소에서 `Settings → Secrets and variables → Actions → Variables`로 이동해 다음 변수를 등록합니다.

- 이름: `RECRUITING_DASHBOARD_URL`
- 값: Cloudflare Pages에서 발급된 대시보드 주소

그다음 `Deploy GitHub Pages`를 실행하면 `데이터 진단` 옆의 `채용 대시보드` 링크가 활성화됩니다.

## 로컬 확인

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Cloudflare Functions까지 로컬에서 확인하려면 Wrangler를 사용해 `npx wrangler pages dev dist`로 실행합니다.

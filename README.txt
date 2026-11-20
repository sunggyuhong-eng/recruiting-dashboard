KONGSTUDIOS 채용 대시보드 수정본

수정 파일
- index.html: 주간 요약과 프로젝트별 카드 그리드, 반응형 화면
- kong-studios-logo.png: KONG STUDIOS 로고
- PublicDashboard.gs: 스프레드시트의 실제 프로젝트 탭을 찾아 데이터를 제공하는 Apps Script

표시 기준
- 프로젝트 시트의 A3:B3 값이 '파트', '전체 TO'인 탭을 프로젝트로 인식합니다.
- 프로젝트 파트/전체 TO/재직자 값은 각 탭 A4:C33에서 읽습니다.
- 채용승인신청서 C열 프로젝트, D열 파트, I열 채용 중 인원, K열 입사 예정 인원을 합산합니다.
- 입사자 이름/예정일/상태는 N:S에서 읽습니다.
- 주간 통계 범위는 한국 시간 기준 월요일부터 일요일입니다.
- 프로젝트 카드와 선택 필터는 API가 반환한 실제 프로젝트만 표시합니다. 데이터가 없는 가짜 프로젝트는 만들지 않습니다.

적용 방법
1. GitHub Pages 저장소의 index.html과 kong-studios-logo.png를 이 파일로 교체합니다.
2. config.js는 교체하지 말고 현재 DATA_URL(공개 Apps Script 웹 앱 주소)을 그대로 유지합니다.
3. Apps Script에서 공개 대시보드 코드를 PublicDashboard.gs 내용으로 교체합니다.
4. Apps Script 웹 앱을 새 버전으로 배포합니다. 배포 설정은 기존 공개 접근 설정을 유지합니다.
5. 대시보드 하단 상태에 연결된 프로젝트 수가 표시되는지 확인합니다.

참고
이 수정본은 기존 스프레드시트와 공개 웹 앱 주소를 유지하도록 만들었습니다. 외부 GitHub 배포와 Apps Script 배포는 포함하지 않습니다.

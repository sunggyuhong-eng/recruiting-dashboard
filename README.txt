KONGSTUDIOS 채용 대시보드

포함 파일
- index.html: 주간 요약과 프로젝트/파트별 채용 현황 화면
- kong-studios-logo.png: 전달받은 KONG STUDIOS 로고
- PublicDashboard.gs: 프로젝트/파트별 API 집계와 입사예정자 데이터
- RosterSync.gs: 기존 채용승인신청서·프로젝트 명단 동기화

GitHub Pages 적용
1. 저장소 루트의 index.html을 교체합니다.
2. kong-studios-logo.png를 저장소 루트에 올립니다.
3. config.js의 기존 웹 앱 주소는 유지합니다.

Google Apps Script 적용
1. PublicDashboard.gs 내용을 Apps Script의 공개 대시보드 코드와 교체합니다.
2. 웹 앱을 새 버전으로 배포합니다.
3. 웹 앱 액세스 권한은 기존 공개 대시보드 설정을 유지합니다.
4. 화면 하단에 프로젝트 11개 연결로 표시되는지 확인합니다. 11개 미만이면 Apps Script 최신 버전이 배포되지 않은 상태입니다.

데이터 흐름
- PROJECT_TABS에 지정된 11개 프로젝트 시트의 A4:C33에서 파트/TO/재직자 수를 읽습니다.
- 채용승인신청서 C열 프로젝트, D열 파트, I열 채용 중 인원, K열 입사 예정 인원을 합산합니다.
- 입사 예정자 이름/일자/상태는 N:S 열에서 가져옵니다.
- 화면에서는 전체 TO와 재직자 수를 표시하지 않습니다.
- 주간 범위는 한국 시간 기준 월요일부터 일요일입니다.

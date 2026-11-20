const RECRUITING_SPREADSHEET_ID = '1c0x-dBPGGjDTPAXiO84-H-iwytpwy3WOAG05ogsXBuk';
const PROJECT_HEADER = ['파트', '전체 TO'];

function doGet() {
  try {
    const book = SpreadsheetApp.openById(RECRUITING_SPREADSHEET_ID);
    const groups = new Map();
    const projectOrder = [];

    function group(project, team) {
      project = String(project || '').trim();
      team = String(team || '').trim();
      if (!project || !team) return null;
      if (!projectOrder.includes(project)) projectOrder.push(project);
      const key = JSON.stringify([project, team]);
      if (!groups.has(key)) groups.set(key, {project, team, to: 0, hc: 0, open: 0, planned: 0});
      return groups.get(key);
    }

    function number(value) {
      if (value === '' || value === null || value === undefined) return 0;
      const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
      if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('인원수 셀 값을 확인해 주세요: ' + value);
      return parsed;
    }

    function dateString(value) {
      if (value instanceof Date && !isNaN(value.getTime())) {
        return Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd');
      }
      return value ? String(value).slice(0, 10) : '';
    }

    // 프로젝트 이름을 고정 목록으로 관리하지 않고 A3:B3의 실제 표 머리글로 판별합니다.
    // 숨김 보고서 탭 등은 이 머리글이 없어 제외됩니다.
    const projectSheets = book.getSheets().filter(sheet => {
      const header = sheet.getRange('A3:B3').getDisplayValues()[0].map(value => String(value).trim());
      return header[0] === PROJECT_HEADER[0] && header[1] === PROJECT_HEADER[1];
    });

    for (const sheet of projectSheets) {
      const project = sheet.getName();
      if (!projectOrder.includes(project)) projectOrder.push(project);
      const values = sheet.getRange('A4:C33').getValues();
      for (const [team, to, hc] of values) {
        if (!String(team || '').trim()) continue;
        const part = group(project, team);
        part.to += number(to);
        part.hc += number(hc);
      }
    }

    const register = book.getSheetByName('채용승인신청서');
    if (!register) throw new Error('채용승인신청서 시트를 찾을 수 없습니다.');
    const rowCount = Math.max(0, register.getLastRow() - 3);
    if (rowCount) {
      // 등록부 C=프로젝트, D=파트, I=채용 중 인원, K=입사 예정 인원
      for (const row of register.getRange(4, 3, rowCount, 9).getValues()) {
        const project = String(row[0] || '').trim();
        const team = String(row[1] || '').trim();
        if (!project || !team) continue;
        const part = group(project, team);
        part.open += number(row[6]);
        part.planned += number(row[8]);
      }
    }

    const entrants = [];
    if (rowCount) {
      // N:S=코드, 이름, 입사예정일, 프로젝트, 파트, 채용상태
      for (const [code, name, date, project, team, status] of register.getRange(4, 14, rowCount, 6).getValues()) {
        const state = String(status || '').trim();
        const projectName = String(project || '').trim();
        const partName = String(team || '').trim();
        if (!name || !projectName || !partName || !['입사예정', '채용완료'].includes(state)) continue;
        entrants.push({code: String(code || '').trim(), name: String(name).trim(), date: dateString(date), project: projectName, team: partName, status: state});
      }
    }

    const history = book.getSheetByName('채용 히스토리');
    const daily = new Map();
    if (history && history.getLastRow() > 3) {
      for (const [date, project] of history.getRange(4, 1, history.getLastRow() - 3, 2).getValues()) {
        if (!(date instanceof Date) || !project) continue;
        const day = Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd');
        const projectName = String(project).trim();
        const key = JSON.stringify([day, projectName]);
        if (!daily.has(key)) daily.set(key, {day, project: projectName, count: 0});
        daily.get(key).count++;
      }
    }

    const parts = Array.from(groups.values());
    const projects = projectOrder.map(project => ({project, parts: parts.filter(part => part.project === project)}));
    return dashboardJson({apiVersion: 4, projectCount: projects.length, projects, parts, entrants, daily: Array.from(daily.values())});
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return dashboardJson({error: true, message: String(error && error.message ? error.message : error)});
  }
}

function dashboardJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

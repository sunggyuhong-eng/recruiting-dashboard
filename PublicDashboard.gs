const RECRUITING_SPREADSHEET_ID = '1c0x-dBPGGjDTPAXiO84-H-iwytpwy3WOAG05ogsXBuk';
const PROJECT_HEADER = ['파트', '전체 TO'];
const ACTIVE_PIPELINE_STAGES = new Map([
  ['온라인 과제', 'assessment'], ['코딩테스트', 'assessment'],
  ['면접', 'interview'], ['면접합격', 'interview'], ['1차 면접', 'interview'], ['2차 면접', 'interview'],
  ['처우단계', 'negotiation'], ['Offer', 'negotiation']
]);

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
      if (!groups.has(key)) groups.set(key, {project, team, to: 0, hc: 0, open: 0, planned: 0, parent: '', roster: []});
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
      if (typeof value === 'number' && Number.isFinite(value)) {
        if (value > 20000000) return String(value).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
        return Utilities.formatDate(new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000), 'UTC', 'yyyy-MM-dd');
      }
      return value ? String(value).slice(0, 10) : '';
    }

    function approvalCode(value) {
      const code = String(value || '').trim();
      return /^\d+$/.test(code) ? code.padStart(4, '0') : code;
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
      const values = sheet.getRange('A4:F33').getValues();
      for (const [team, to, hc, hiring, unused, parent] of values) {
        if (!String(team || '').trim()) continue;
        const part = group(project, team);
        part.to += number(to);
        part.hc += number(hc);
        part.parent = String(parent || '').trim();
      }
      // H:M: 파트, 성명, 명단 상태, 입사 예정일, 승인 코드, 채용 사유
      for (const [team, name, state, date, code, reason] of sheet.getRange('H4:M337').getValues()) {
        const part = group(project, team);
        if (!part || (!name && !state)) continue;
        part.roster.push({name: String(name || '').trim(), status: String(state || '').trim(), date: dateString(date), code: String(code || '').trim(), reason: String(reason || '').trim()});
      }
    }

    const register = book.getSheetByName('채용승인신청서');
    if (!register) throw new Error('채용승인신청서 시트를 찾을 수 없습니다.');
    const rowCount = Math.max(0, register.getLastRow() - 3);
    const approvals = [];
    const reasonsByCode = new Map();
    if (rowCount) {
      // A=코드, C=프로젝트, D=파트, E=사유, I=채용 중, J=승인 링크, K=입사 예정
      const rows = register.getRange(4, 1, rowCount, 11).getValues();
      const codes = register.getRange(4, 1, rowCount, 1).getDisplayValues();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const project = String(row[2] || '').trim();
        const team = String(row[3] || '').trim();
        if (!project || !team) continue;
        const code = approvalCode(codes[i][0]);
        if (code) reasonsByCode.set(code, String(row[4] || '').trim());
        const part = group(project, team);
        const open = number(row[8]);
        part.open += open;
        part.planned += number(row[10]);
        if (open) approvals.push({code, project, team,
          reason: String(row[4] || '').trim(), open, url: String(row[9] || '').trim()});
      }
    }

    const entrants = [];
    if (rowCount) {
      // N:S=코드, 이름, 입사예정일, 프로젝트, 파트, 채용상태
      const entrantRows = register.getRange(4, 14, rowCount, 6).getValues();
      const entrantCodes = register.getRange(4, 14, rowCount, 1).getDisplayValues();
      for (let i = 0; i < entrantRows.length; i++) {
        const [rawCode, name, date, project, team, status] = entrantRows[i];
        const state = String(status || '').trim();
        const projectName = String(project || '').trim();
        const partName = String(team || '').trim();
        if (!name || !projectName || !partName || !['입사예정', '채용완료'].includes(state)) continue;
        const code = approvalCode(entrantCodes[i][0] || rawCode);
        entrants.push({code, name: String(name).trim(), date: dateString(date), project: projectName,
          team: partName, status: state, reason: reasonsByCode.get(code) || ''});
      }
    }

    // 채용중 시트 A=진행단계, B=이름, C=PJ. 공개 API에는 이름을 넣지 않고 집계만 반환합니다.
    const pipelineSheet = book.getSheetByName('채용중');
    if (!pipelineSheet) throw new Error('채용중 시트를 찾을 수 없습니다.');
    const plannedEntrants = entrants.filter(person => person.status === '입사예정');
    const registeredPeople = new Set(entrants.map(person => JSON.stringify([person.project, person.name])));
    const pipelineByProject = Object.create(null);
    const pipelineByStage = {assessment: 0, interview: 0, negotiation: 0, planned: 0};
    const pipelineByProjectStage = Object.create(null);
    let pipelineTotal = 0;
    const pipelineRowCount = Math.max(0, pipelineSheet.getLastRow() - 1);
    if (pipelineRowCount) {
      for (const [stage, name, project] of pipelineSheet.getRange(2, 1, pipelineRowCount, 3).getDisplayValues()) {
        const category = ACTIVE_PIPELINE_STAGES.get(String(stage || '').trim());
        const personName = String(name || '').trim();
        const projectName = String(project || '').trim();
        if (!category || !personName || registeredPeople.has(JSON.stringify([projectName, personName]))) continue;
        pipelineTotal++;
        pipelineByStage[category]++;
        if (projectName) {
          pipelineByProject[projectName] = (pipelineByProject[projectName] || 0) + 1;
          if (!pipelineByProjectStage[projectName]) pipelineByProjectStage[projectName] = {assessment: 0, interview: 0, negotiation: 0, planned: 0};
          pipelineByProjectStage[projectName][category]++;
        }
      }
    }
    for (const person of plannedEntrants) {
      pipelineTotal++;
      pipelineByStage.planned++;
      const projectName = person.project;
      pipelineByProject[projectName] = (pipelineByProject[projectName] || 0) + 1;
      if (!pipelineByProjectStage[projectName]) pipelineByProjectStage[projectName] = {assessment: 0, interview: 0, negotiation: 0, planned: 0};
      pipelineByProjectStage[projectName].planned++;
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
    return dashboardJson({apiVersion: 10, projectCount: projects.length, projects, parts, entrants, approvals,
      pipeline: {total: pipelineTotal, byProject: pipelineByProject, byStage: pipelineByStage,
        byProjectStage: pipelineByProjectStage}, daily: Array.from(daily.values())});
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return dashboardJson({error: true, message: String(error && error.message ? error.message : error)});
  }
}

function dashboardJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

const PROJECT_TABS = ['ZERO','HERO','OTPS','MAZE','N-GDTS','Art실','KongPlay','Server','IT Infra','QA','Publishing'];

function doGet() {
  try {
    const book = SpreadsheetApp.openById('1c0x-dBPGGjDTPAXiO84-H-iwytpwy3WOAG05ogsXBuk');
    const groups = new Map();
    const projectOrder = [...PROJECT_TABS];
    function group(project, team) {
      project = String(project || '').trim();
      team = String(team || '').trim();
      if (!project || !team) return null;
      if (!projectOrder.includes(project)) projectOrder.push(project);
      const key = JSON.stringify([project, team]);
      if (!groups.has(key)) groups.set(key, {project, team, to:0, hc:0, open:0, planned:0});
      return groups.get(key);
    }
    function number(value) {
      if (value === '' || value === null) return 0;
      const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
      if (!Number.isSafeInteger(n) || n < 0) throw Error('숫자 확인: ' + value);
      return n;
    }
    function isoDate(value) {
      if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd');
      return value ? String(value).slice(0,10) : '';
    }

    // Explicit tab list avoids silently omitting projects due to hidden tabs or header mismatches.
    for (const projectName of PROJECT_TABS) {
      const sheet = book.getSheetByName(projectName);
      if (!sheet) continue;
      for (const [team,to,hc] of sheet.getRange('A4:C33').getValues()) {
        if (!team) continue;
        const g = group(projectName, team);
        g.to += number(to);
        g.hc += number(hc);
      }
    }

    const reg = book.getSheetByName('채용승인신청서');
    const length = Math.max(0, reg.getLastRow()-3);
    // Registration columns: C=project, D=part, I=active hiring TO, K=planned hires.
    if (length) for (const row of reg.getRange(4,3,length,9).getValues()) {
      const project = row[0], team = row[1];
      if (!project || !team) continue;
      const g = group(project, team);
      if (!g) continue;
      g.open += number(row[6]);
      g.planned += number(row[8]);
    }

    const entrants = [];
    if (length) {
      for (const [code,name,date,project,team,status] of reg.getRange(4,14,length,6).getValues()) {
        const state = String(status || '').trim();
        if (!name || !project || !team || !['입사예정','채용완료'].includes(state)) continue;
        entrants.push({name:String(name).trim(), date:isoDate(date), project:String(project).trim(), team:String(team).trim(), status:state});
      }
    }

    const history = book.getSheetByName('채용 히스토리');
    const daily = new Map();
    if (history.getLastRow()>3) for (const [date,project] of history.getRange(4,1,history.getLastRow()-3,2).getValues()) {
      if (!(date instanceof Date) || !project) continue;
      const day = Utilities.formatDate(date,'Asia/Seoul','yyyy-MM-dd');
      const key = JSON.stringify([day,project]);
      if (!daily.has(key)) daily.set(key,{day,project:String(project).trim(),count:0});
      daily.get(key).count++;
    }

    const parts = Array.from(groups.values());
    const projects = projectOrder.map(project => ({project,parts:parts.filter(part=>part.project===project)}));
    return dashboardJson({apiVersion:3, projectCount:projects.filter(p=>p.parts.length).length, parts, projects, entrants, daily:Array.from(daily.values())});
  } catch (err) {
    console.error(err);
    return dashboardJson({error:true, message:String(err)});
  }
}

function dashboardJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

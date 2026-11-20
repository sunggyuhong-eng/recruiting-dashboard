function doGet() {
  try {
    const book = SpreadsheetApp.openById('1c0x-dBPGGjDTPAXiO84-H-iwytpwy3WOAG05ogsXBuk');
    const groups = new Map();
    function group(project, team) {
      const key = JSON.stringify([project, team]);
      if (!groups.has(key)) groups.set(key, {project, team, to:0, hc:0, open:0, planned:0});
      return groups.get(key);
    }
    function number(value) {
      if (value === '' || value === null) return 0;
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw Error('숫자 확인');
      return value;
    }
    function isoDate(value) {
      if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd');
      return value ? String(value).slice(0,10) : '';
    }
    for (const sheet of book.getSheets()) {
      if (sheet.isSheetHidden() || sheet.getRange('A3').getValue() !== '파트' || sheet.getRange('B3').getValue() !== '전체 TO') continue;
      for (const [team,to,hc] of sheet.getRange('A4:C33').getValues()) {
        if (!team) continue;
        const g = group(sheet.getName(), String(team));
        g.to += number(to);
        g.hc += number(hc);
      }
    }
    const reg = book.getSheetByName('채용승인신청서');
    const length = reg.getLastRow()-3;
    // 등록부: C=프로젝트, D=파트, I=채용 중, K=입사 예정 인원
    if (length>0) for (const row of reg.getRange(4,3,length,10).getValues()) {
      if (!row[0]) continue;
      const g = group(String(row[0]),String(row[1] || '파트 미지정'));
      g.open += number(row[6]);
      g.planned += number(row[8]);
    }
    const entrants = [];
    const entrantLength = Math.max(0, reg.getLastRow()-3);
    if (entrantLength) {
      for (const [code,name,date,project,team,status] of reg.getRange(4,14,entrantLength,6).getValues()) {
        if (!name || !project || !team || !['입사예정','채용완료'].includes(status)) continue;
        entrants.push({name:String(name), date:isoDate(date), project:String(project), team:String(team), status:String(status)});
      }
    }
    const history = book.getSheetByName('채용 히스토리');
    const daily = new Map();
    if (history.getLastRow()>3) for (const [date,project] of history.getRange(4,1,history.getLastRow()-3,2).getValues()) {
      if (!(date instanceof Date) || !project) continue;
      const day = Utilities.formatDate(date,'Asia/Seoul','yyyy-MM-dd');
      const key = JSON.stringify([day,project]);
      if (!daily.has(key)) daily.set(key,{day,project,count:0});
      daily.get(key).count++;
    }
    return dashboardJson({rosterVersion:2, parts:Array.from(groups.values()), entrants, daily:Array.from(daily.values())});
  } catch (err) {
    console.error(err);
    return dashboardJson({error:true});
  }
}
function dashboardJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

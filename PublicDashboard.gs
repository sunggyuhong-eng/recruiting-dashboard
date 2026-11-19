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
      if (value === '') return 0;
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw Error('숫자 확인');
      return value;
    }
    const roster = book.getSheetByName('파트별 인원 보드');
    if (roster.getLastRow() >= 4) {
      const range = roster.getRange(4,1,roster.getLastRow()-3,8);
      for (const row of range.getValues()) {
        if (!row[0] || !row[1]) continue;
        const item = group(String(row[0]),String(row[1]));
        item.to=number(row[2]); item.hc=number(row[3]);
        item.staff=String(row[5]||''); item.arrivals=String(row[6]||'');
        item.parent=String(row[7]||'');
      }
    }
    const reg = book.getSheetByName('채용승인신청서');
    const length = reg.getLastRow()-3;
    if (length>0) for (const row of reg.getRange(4,2,length,10).getValues()) {
      if (!row[0]) continue;
      const g = group(String(row[0]),String(row[1] || '파트 미지정'));
      g.open += number(row[6]);
      g.planned += number(row[9]);
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
    return dashboardJson({rosterVersion:2,parts:Array.from(groups.values()),daily:Array.from(daily.values())});
  } catch (err) {
    console.error(err);
    return dashboardJson({error:true});
  }
}
function dashboardJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

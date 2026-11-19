const RECRUITING_BOOK_ID = '1c0x-dBPGGjDTPAXiO84-H-iwytpwy3WOAG05ogsXBuk';

// 한 번 실행: 신청서 편집 및 5분 주기 동기화 설치.
function setupRosterSync() {
  syncRecruitingRoster();
  const triggers=ScriptApp.getProjectTriggers();
  if (!triggers.some(t=>t.getHandlerFunction()==='onRecruitingRosterEdit'))
    ScriptApp.newTrigger('onRecruitingRosterEdit').forSpreadsheet(RECRUITING_BOOK_ID).onEdit().create();
  if (!triggers.some(t=>t.getHandlerFunction()==='syncRecruitingRoster'))
    ScriptApp.newTrigger('syncRecruitingRoster').timeBased().everyMinutes(5).create();
}
function onRecruitingRosterEdit(e) {
  if(e && e.range && e.range.getSheet().getName()==='채용승인신청서') syncRecruitingRoster();
}
function planRosterSync(existing, markers, incoming) {
  const rows=existing.map(r=>r.slice(0,2)), keys=markers.map(r=>r[0]||'');
  const desired=new Map(incoming.map(r=>[JSON.stringify([r[0],r[1]]),[r[4],r[1]]]));
  // Only rows created by this synchronizer may be changed or removed.
  for(let i=0;i<rows.length;i++) if(keys[i]) {
    const item=desired.get(keys[i]);
    if(item) { rows[i]=item; desired.delete(keys[i]); }
    else {rows[i]=['',''];keys[i]='';}
  }
  for(const [key,item] of desired) {
    if(rows.some(r=>r[0]===item[0] && r[1]===item[1]))continue;
    const i=rows.findIndex(r=>!r[0]&&!r[1]);
    if(i<0)throw Error('재직자 명단 300행이 가득 찼습니다. 입력 범위 확장이 필요합니다.');
    rows[i]=item;keys[i]=key;
  }
  return rows.flatMap((r,i)=>JSON.stringify(r)!==JSON.stringify(existing[i])||keys[i]!==markers[i][0] ? [{row:38+i,values:r,key:keys[i]}]:[]);
}
function syncRecruitingRoster() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))return;
  try {
    const book=SpreadsheetApp.openById(RECRUITING_BOOK_ID);
    SpreadsheetApp.flush();
    const reg=book.getSheetByName('채용승인신청서');
    const n=reg.getLastRow()-3;
    const people=n>0?reg.getRange(4,14,n,6).getValues().filter(r=>r[0]&&r[1]&&r[3]&&r[4]&&['입사예정','채용완료'].includes(r[5])):[];
    const plans=[];
    for(const sheet of book.getSheets()) {
      if(sheet.getRange('A3').getValue()!=='파트'||sheet.getRange('B3').getValue()!=='전체 TO')continue;
      const existing=sheet.getRange('A38:B337').getValues(),markers=sheet.getRange('L38:L337').getValues();
      const updates=planRosterSync(existing,markers,people.filter(r=>r[3]===sheet.getName()));
      plans.push({sheet,updates});
    }
    for(const {sheet,updates} of plans)for(const item of updates){
      sheet.getRange(item.row,1,1,2).setValues([item.values]);
      sheet.getRange(item.row,12).setValue(item.key);
    }
  }finally{lock.releaseLock();}
}

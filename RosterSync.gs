const RECRUITING_BOOK_ID = '1c0x-dBPGGjDTPAXiO84-H-iwytpwy3WOAG05ogsXBuk';

// 최초 한 번 실행: 이전 트리거를 정리하고 수정 즉시 실행하는 트리거만 설치합니다.
function setupRosterSync() {
  assignMissingRecruitingCodes();
  syncRecruitingRoster();
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (['onRecruitingRosterEdit','syncRecruitingRoster'].includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger('onRecruitingRosterEdit')
    .forSpreadsheet(RECRUITING_BOOK_ID).onEdit().create();
}
function onRecruitingRosterEdit(e) {
  if (!e || !e.range) return;
  const range=e.range, sheet=range.getSheet();
  if (sheet.getName()==='채용승인신청서') {
    assignMissingRecruitingCodes();
    syncRecruitingRoster();
    return;
  }
  // TO 표 또는 명단의 직접 입력 칸을 수정/붙여넣기/삭제했을 때만 실행.
  const touchesTO=range.getColumn()<=2 && range.getRow()<=33 && range.getLastRow()>=4;
  const touchesRoster=range.getColumn()<=9 && range.getLastColumn()>=8 && range.getRow()<=303 && range.getLastRow()>=4;
  if ((touchesTO || touchesRoster) &&
      sheet.getRange('A3').getValue()==='파트' &&
      sheet.getRange('B3').getValue()==='전체 TO') {
    syncRecruitingRoster(sheet.getSheetId());
  }
}
// 신청서 데이터가 입력된 행에만 순번 코드를 부여합니다. 기존 코드는 그대로 유지합니다.
function assignMissingRecruitingCodes() {
  const sheet=SpreadsheetApp.openById(RECRUITING_BOOK_ID).getSheetByName('채용승인신청서');
  const last=Math.max(sheet.getLastRow(),3);
  if(last<4)return;
  const values=sheet.getRange(4,1,last-3,10).getValues();
  let max=0;
  for(const row of values){
    const n=Number(String(row[0]||'').trim());
    if(Number.isSafeInteger(n)&&n>max)max=n;
  }
  let changed=false;
  for(const row of values){
    // A=코드, B=신청일, C=프로젝트, J=승인 신청서 링크
    if(!row[0]&&(row[1]||row[2]||row[9])){
      row[0]=String(++max).padStart(4,'0');
      changed=true;
    }
  }
  if(changed)sheet.getRange(4,1,values.length,1).setValues(values.map(r=>[r[0]||'']));
}
function planRosterSync(existing, markers, incoming, targets) {
  const capacity=existing.length;
  const desired=new Map(incoming.map(r=>[JSON.stringify([r[0],r[1]]),[r[4],r[1]]]));
  const people=[];
  for(let i=0;i<capacity;i++) {
    const key=markers[i][0]||'', row=existing[i];
    if(key) {
      if(desired.has(key)){people.push({values:desired.get(key),key});desired.delete(key);}
    } else if(row[1])people.push({values:row.slice(0,2),key:''});
  }
  for(const [key,values] of desired) {
    if(!people.some(p=>p.values[0]===values[0]&&p.values[1]===values[1]))people.push({values,key});
  }
  const teams=new Map();
  for(const [team,to] of targets)if(team){
    const count=to===''?0:to;
    if(!Number.isSafeInteger(count)||count<0)throw Error(team+' TO는 0 이상의 정수로 입력하세요.');
    teams.set(team,(teams.get(team)||0)+count);
  }
  for(const p of people)if(!teams.has(p.values[0]))teams.set(p.values[0],0);
  const output=[];
  for(const [team,to] of teams){
    const members=people.filter(p=>p.values[0]===team);
    output.push(...members);
    for(let i=members.length;i<to;i++)output.push({values:[team,''],key:''});
  }
  if(output.length>capacity)throw Error('필요한 명단이 '+output.length+'행입니다. 현재 입력 범위 '+capacity+'행을 확장해야 합니다. 기존 명단은 유지됩니다.');
  while(output.length<capacity)output.push({values:['',''],key:''});
  return output.flatMap((p,i)=>JSON.stringify(p.values)!==JSON.stringify(existing[i])||p.key!==(markers[i][0]||'') ? [{row:4+i,values:p.values,key:p.key}]:[]);
}
function syncRecruitingRoster(targetSheetId) {
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const book=SpreadsheetApp.openById(RECRUITING_BOOK_ID);
    SpreadsheetApp.flush();
    const reg=book.getSheetByName('채용승인신청서');
    const n=reg.getLastRow()-3;
    const people=n>0?reg.getRange(4,14,n,6).getValues().filter(r=>r[0]&&r[1]&&r[3]&&r[4]&&['입사예정','채용완료'].includes(r[5])):[];
    const plans=[];
    const sheets=typeof targetSheetId==='number'?[book.getSheetById(targetSheetId)]:book.getSheets();
    for(const sheet of sheets) {
      if(!sheet)continue;
      if(sheet.getRange('A3').getValue()!=='파트'||sheet.getRange('B3').getValue()!=='전체 TO')continue;
      if(sheet.getRange('H3').getValue()!=='파트'||sheet.getRange('I3').getValue()!=='성명')throw Error(sheet.getName()+' 명단 위치를 확인하세요. 좌우 배치 버전용 코드입니다.');
      const existing=sheet.getRange('H4:I303').getValues(),markers=sheet.getRange('T4:T303').getValues();
      const updates=planRosterSync(existing,markers,people.filter(r=>r[3]===sheet.getName()),sheet.getRange('A4:B33').getValues());
      plans.push({sheet,updates});
    }
    // 연속된 변경 행은 묶어서 기록해 실행 시간을 줄입니다. J:K 수식은 유지합니다.
    for(const {sheet,updates} of plans) {
      let block=[];
      function writeBlock(){
        if(!block.length)return;
        sheet.getRange(block[0].row,8,block.length,2).setValues(block.map(u=>u.values));
        sheet.getRange(block[0].row,20,block.length,1).setValues(block.map(u=>[u.key]));
        block=[];
      }
      for(const update of updates){
        if(block.length && update.row!==block[block.length-1].row+1)writeBlock();
        block.push(update);
      }
      writeBlock();
    }
    SpreadsheetApp.flush();
  }finally{lock.releaseLock();}
}

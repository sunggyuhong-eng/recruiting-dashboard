import { json, sheetRequest, type Env } from './_lib'

const stages = new Set(['온라인 과제','코딩테스트','역량검사','면접','1차 면접','2차 면접','면접합격','처우단계','Offer'])
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const body = await context.request.json().catch(() => ({})) as { row?: number; stage?: string }
  if (!Number.isInteger(body.row) || Number(body.row) < 2 || !body.stage || !stages.has(body.stage)) return json({ error: '허용되지 않은 단계 변경입니다.' }, 400)
  try { await sheetRequest(context.env, { action: 'update_stage', row: body.row, stage: body.stage }); return json({ ok: true }) }
  catch (error) { return json({ error: error instanceof Error ? error.message : '단계를 저장하지 못했습니다.' }, 502) }
}

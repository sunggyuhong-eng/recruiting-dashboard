import { json, requireAuth, sheetRequest, type Env } from './_lib'

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const denied = await requireAuth(context); if (denied) return denied
  const body = await context.request.json().catch(() => ({})) as { title?: string; targetTo?: number; reason?: string; project?: string }
  if (!body.title || !Number.isFinite(body.targetTo) || Number(body.targetTo) < 0) return json({ error: '공고명과 목표 TO를 확인해 주세요.' }, 400)
  try { await sheetRequest(context.env, { action: 'update_opening', title: body.title, targetTo: Math.floor(Number(body.targetTo)), reason: String(body.reason || ''), project: String(body.project || '') }); return json({ ok: true }) }
  catch (error) { return json({ error: error instanceof Error ? error.message : '공고 정보를 저장하지 못했습니다.' }, 502) }
}

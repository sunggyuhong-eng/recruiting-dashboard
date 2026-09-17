import { json, requireAuth, sheetRequest, type Env } from './_lib'

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const denied = await requireAuth(context); if (denied) return denied
  try { const result = await sheetRequest(context.env, { action: 'dashboard' }); return json(result) }
  catch (error) { return json({ error: error instanceof Error ? error.message : '연동 오류가 발생했습니다.' }, 502) }
}

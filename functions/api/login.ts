import { createSession, json, safeEqual, sessionCookie, type Env } from './_lib'

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const body = await request.json().catch(() => ({})) as { password?: string }
  if (!env.DASHBOARD_PASSWORD || !env.DASHBOARD_SESSION_SECRET) return json({ error: '서버 비밀번호 설정이 필요합니다.' }, 500)
  if (!body.password || !await safeEqual(body.password, env.DASHBOARD_PASSWORD)) return json({ error: '비밀번호가 일치하지 않습니다.' }, 401)
  const token = await createSession(env.DASHBOARD_SESSION_SECRET)
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) })
}

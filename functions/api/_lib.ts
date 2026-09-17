export type Env = {
  DASHBOARD_PASSWORD: string
  DASHBOARD_SESSION_SECRET: string
  SHEET_API_URL: string
  SHEET_API_TOKEN: string
}

type Context = { request: Request; env: Env }

const encoder = new TextEncoder()
const cookieName = 'kong_recruit_session'

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('')
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return bytesToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

async function digest(value: string) { return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value))) }

export async function safeEqual(left: string, right: string) {
  const [a, b] = await Promise.all([digest(left), digest(right)])
  let result = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return result === 0
}

export async function createSession(secret: string) {
  const expires = Date.now() + 8 * 60 * 60 * 1000
  const value = String(expires)
  return `${value}.${await hmac(value, secret)}`
}

export async function authenticated(request: Request, env: Env) {
  const cookie = request.headers.get('Cookie') || ''
  const token = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  if (!token) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature || Number(expires) < Date.now()) return false
  return safeEqual(signature, await hmac(expires, env.DASHBOARD_SESSION_SECRET))
}

export function sessionCookie(value: string, maxAge = 28800) {
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } })
}

export async function requireAuth(context: Context) {
  if (!await authenticated(context.request, context.env)) return json({ error: '로그인이 만료되었습니다. 다시 로그인해 주세요.' }, 401)
  return null
}

export async function sheetRequest(env: Env, payload: Record<string, unknown>) {
  const response = await fetch(env.SHEET_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, token: env.SHEET_API_TOKEN }),
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`Google Sheet 연동 오류 (${response.status})`)
  const result = await response.json() as { ok?: boolean; error?: string }
  if (!result.ok) throw new Error(result.error || 'Google Sheet 요청을 처리하지 못했습니다.')
  return result
}

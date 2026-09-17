export type Env = {
  SHEET_API_URL: string
  SHEET_API_TOKEN: string
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } })
}

export async function sheetRequest(env: Env, payload: Record<string, unknown>) {
  if (!env.SHEET_API_URL || !env.SHEET_API_TOKEN) throw new Error('Google Sheet 연동 환경변수를 확인해 주세요.')
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

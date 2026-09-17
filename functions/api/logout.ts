import { json, sessionCookie } from './_lib'

export const onRequestPost = async () => json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) })

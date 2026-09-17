import { authenticated, json, type Env } from './_lib'

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => json({ authenticated: await authenticated(request, env) })

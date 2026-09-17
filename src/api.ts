import type { DashboardData, PipelineStage } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(body.error || '요청을 처리하지 못했습니다.')
  return body as T
}

export const api = {
  dashboard: () => request<DashboardData>('/api/dashboard'),
  moveCandidate: (row: number, stage: PipelineStage) => request<{ ok: true }>('/api/stage', { method: 'POST', body: JSON.stringify({ row, stage }) }),
  updateOpening: (title: string, targetTo: number, reason: string, project: string) => request<{ ok: true }>('/api/opening', { method: 'POST', body: JSON.stringify({ title, targetTo, reason, project }) }),
}

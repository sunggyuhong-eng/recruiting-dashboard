import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Check, ChevronRight, Clock3, ExternalLink, RefreshCw, Search, Settings2, Target, UsersRound, X } from 'lucide-react'
import { api } from './api'
import { PIPELINE_STAGES, type Candidate, type DashboardData, type Opening, type PipelineStage } from './types'

export default function App() {
  return <Dashboard />
}

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(''), [query, setQuery] = useState(''), [includeClosed, setIncludeClosed] = useState(false)
  const load = async () => { setLoading(true); setError(''); try { const next = await api.dashboard(); setData(next); setSelectedId(id => id || next.openings.find(x => x.status === '진행중')?.id || next.openings[0]?.id || '') } catch (e) { setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const openings = useMemo(() => (data?.openings || []).filter(x => (includeClosed || x.status === '진행중') && `${x.title} ${x.project}`.toLowerCase().includes(query.toLowerCase())), [data, query, includeClosed])
  const selected = data?.openings.find(x => x.id === selectedId) || null
  const replaceOpening = (opening: Opening) => setData(current => current ? { ...current, openings: current.openings.map(x => x.id === opening.id ? opening : x) } : current)

  return <div className="shell"><header className="topbar"><div><div className="brand-mark">KS</div><span><b>채용 대시보드</b><small>콩스튜디오코리아</small></span></div><nav><button onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> 새로고침</button></nav></header>
    <div className="workspace"><aside className="opening-sidebar"><div className="sidebar-title"><span>OPEN POSITIONS</span><h2>채용 공고</h2></div><label className="search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="공고·프로젝트 검색" />{query && <button onClick={() => setQuery('')}><X size={14} /></button>}</label><label className="closed-toggle"><input type="checkbox" checked={includeClosed} onChange={e => setIncludeClosed(e.target.checked)} /> 마감 공고 포함</label><div className="opening-list">{openings.map(opening => <button key={opening.id} className={selectedId === opening.id ? 'active' : ''} onClick={() => setSelectedId(opening.id)}><span className={`status-dot ${opening.status === '마감' ? 'closed' : ''}`} /><div><b>{opening.title}</b><small>{opening.project || '프로젝트 미지정'} · 진행 {opening.candidates.length}명</small></div><ChevronRight size={15} /></button>)}</div></aside>
      <main className="content">{error ? <ErrorState message={error} retry={load} /> : loading && !data ? <Loading label="채용 현황을 불러오는 중이에요" /> : selected ? <OpeningBoard opening={selected} onChange={replaceOpening} /> : <EmptyState />}</main></div>
    <footer><span>마지막 동기화 {data?.syncedAt ? new Date(data.syncedAt).toLocaleString('ko-KR') : '-'}</span><span>진행 지원자 {data?.candidateCount || 0}명</span></footer>
  </div>
}

function OpeningBoard({ opening, onChange }: { opening: Opening; onChange: (opening: Opening) => void }) {
  const [editing, setEditing] = useState(false), [dragging, setDragging] = useState<Candidate | null>(null), [saving, setSaving] = useState(false), [notice, setNotice] = useState('')
  const [form, setForm] = useState({ targetTo: opening.targetTo, reason: opening.reason, project: opening.project })
  useEffect(() => setForm({ targetTo: opening.targetTo, reason: opening.reason, project: opening.project }), [opening])
  const remaining = Math.max(0, opening.targetTo - opening.hiredCount)
  const move = async (stage: PipelineStage) => {
    if (!dragging || dragging.stage === stage) return setDragging(null)
    const before = opening
    const next = { ...opening, candidates: opening.candidates.map(x => x.id === dragging.id ? { ...x, stage } : x) }
    onChange(next); setDragging(null); setNotice('저장 중…')
    try { await api.moveCandidate(dragging.row, stage); setNotice('시트에 저장됐어요') } catch (e) { onChange(before); setNotice(e instanceof Error ? e.message : '단계 변경에 실패했습니다.') }
    window.setTimeout(() => setNotice(''), 2500)
  }
  const save = async () => {
    setSaving(true)
    try { await api.updateOpening(opening.title, Number(form.targetTo) || 0, form.reason, form.project); onChange({ ...opening, targetTo: Number(form.targetTo) || 0, reason: form.reason, project: form.project }); setEditing(false); setNotice('공고 정보가 저장됐어요') } catch (e) { setNotice(e instanceof Error ? e.message : '저장하지 못했습니다.') } finally { setSaving(false) }
  }
  return <section className="opening-view"><div className="opening-head"><div><span className="eyebrow">{opening.status === '진행중' ? 'ACTIVE OPENING' : 'CLOSED OPENING'}</span><h1>{opening.title}</h1><p>{opening.project || '프로젝트 미지정'}{opening.url && <a href={opening.url} target="_blank" rel="noreferrer">게임잡 공고 <ExternalLink size={13} /></a>}</p></div><button className="outline" onClick={() => setEditing(true)}><Settings2 size={16} /> 공고 정보 편집</button></div>
    <div className="summary-grid"><Summary icon={Target} label="목표 TO" value={`${opening.targetTo}명`} /><Summary icon={Check} label="충원 완료" value={`${opening.hiredCount}명`} /><Summary icon={BriefcaseBusiness} label="잔여 TO" value={`${remaining}명`} accent /><Summary icon={UsersRound} label="진행 지원자" value={`${opening.candidates.length}명`} /></div>
    <article className="reason-card"><span>채용 배경</span><p>{opening.reason || '채용 배경을 입력해 주세요.'}</p></article>
    <div className="board-title"><div><span>HIRING PIPELINE</span><h2>전형 진행 현황</h2></div><p><Clock3 size={14} /> 카드를 드래그해 단계를 변경하세요.</p></div>
    <div className="kanban">{PIPELINE_STAGES.map(stage => { const candidates = opening.candidates.filter(x => x.stage === stage); return <section className="lane" key={stage} onDragOver={e => e.preventDefault()} onDrop={() => void move(stage)}><header><b>{stage}</b><span>{candidates.length}</span></header><div className="lane-body">{candidates.map(candidate => <article draggable className="candidate" key={candidate.id} onDragStart={() => setDragging(candidate)} onDragEnd={() => setDragging(null)}><b>{candidate.name}</b><small>{candidate.project || opening.project || '프로젝트 미지정'}</small></article>)}{!candidates.length && <div className="lane-empty">지원자 없음</div>}</div></section> })}</div>
    {notice && <div className="toast">{notice}</div>}
    {editing && <div className="modal-backdrop" onMouseDown={() => setEditing(false)}><section className="modal" onMouseDown={e => e.stopPropagation()}><header><div><span>OPENING SETTINGS</span><h2>공고 정보 편집</h2></div><button onClick={() => setEditing(false)}><X /></button></header><label>프로젝트<input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} /></label><label>목표 TO<input type="number" min="0" value={form.targetTo} onChange={e => setForm({ ...form, targetTo: Number(e.target.value) })} /></label><label>채용 배경<textarea rows={5} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label><div className="modal-actions"><button className="outline" onClick={() => setEditing(false)}>취소</button><button className="primary" disabled={saving} onClick={save}>{saving ? '저장 중…' : '저장하기'}</button></div></section></div>}
  </section>
}

function Summary({ icon: Icon, label, value, accent = false }: { icon: typeof Target; label: string; value: string; accent?: boolean }) { return <article className={`summary ${accent ? 'accent' : ''}`}><Icon size={18} /><div><span>{label}</span><b>{value}</b></div></article> }
function Loading({ label }: { label: string }) { return <div className="state"><RefreshCw className="spin" /><b>{label}</b></div> }
function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <div className="state"><b>데이터를 불러오지 못했어요</b><p>{message}</p><button onClick={retry}>다시 시도</button></div> }
function EmptyState() { return <div className="state"><BriefcaseBusiness /><b>표시할 공고가 없어요</b><p>게임잡 동기화를 실행하거나 TO정리 시트를 확인해 주세요.</p></div> }

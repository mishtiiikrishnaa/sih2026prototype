import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, Handshake, Banknote, CheckCircle2, Loader2, Send } from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

const STAGE_LABELS = {
  discovery: 'Discovery',
  prototype: 'Prototype',
  pilot: 'Pilot',
  scaled: 'Scaled',
  verified: 'Verified',
}

export default function IndustryPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [opps, setOpps] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/industry/opportunities')
      setOpps(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function express(projectId, interestType) {
    setBusy(true)
    try {
      await api.post('/projects/interest', { project_id: projectId, message: message.trim(), interest_type: interestType })
      setFlash(interestType === 'funding' ? 'Funding interest sent to the project owner.' : 'Co-development interest sent to the project owner.')
      setOpenId(null)
      setMessage('')
      await load()
      setTimeout(() => setFlash(''), 4000)
    } catch (e) {
      alert(e.response?.data?.detail || 'Something went wrong sending interest.')
    } finally { setBusy(false) }
  }

  const isIndustry = user?.role === 'industry_partner'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Factory size={18} className="text-rose-600 dark:text-rose-400" />
          <h1 className="text-xl font-bold text-text-primary">Industry Collaboration Hub</h1>
        </div>
        <p className="text-sm text-text-secondary">
          {isIndustry
            ? 'University-led projects here are looking for industry support — co-develop solutions or provide funding.'
            : 'Overview of university projects open to industry partnerships.'}
        </p>
      </div>

      {flash && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/15 text-green-800 dark:text-green-200 px-4 py-3 text-sm">
          <CheckCircle2 size={16} /> {flash}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-text-secondary"><Loader2 size={22} className="animate-spin" /></div>
      ) : opps.length === 0 ? (
        <div className="card p-10 text-center text-sm text-text-secondary">
          No projects are currently seeking industry collaboration or funding.
        </div>
      ) : (
        <div className="space-y-4">
          {opps.map(o => (
            <div key={o.project_id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <button onClick={() => navigate(`/projects/${o.project_id}`)} className="text-base font-bold text-text-primary hover:underline text-left">
                      {o.project_title}
                    </button>
                    <span className="badge text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">{STAGE_LABELS[o.stage] || o.stage}</span>
                    {o.seeking_collab && <Handshake size={15} className="text-rose-500" />}
                    {o.needs_funding && <Banknote size={15} className="text-emerald-500" />}
                  </div>
                  <p className="text-sm text-text-secondary mb-2 line-clamp-2">{o.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="badge bg-bg-secondary text-text-secondary">📍 {o.problem_district}</span>
                    <span className="badge bg-bg-secondary text-text-secondary">{o.member_count} team members</span>
                    {o.seeking_collab && <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">Open to co-development</span>}
                    {o.needs_funding && <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">Seeking funding</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {o.is_member ? (
                    <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200">Already on team</span>
                  ) : isIndustry ? (
                    <button
                      onClick={() => { setOpenId(openId === o.project_id ? null : o.project_id); setMessage('') }}
                      className="btn-primary text-xs"
                    >
                      Collaborate
                    </button>
                  ) : null}
                </div>
              </div>

              {openId === o.project_id && isIndustry && (
                <div className="mt-4 pt-4 border-t border-border">
                  <textarea
                    className="input text-sm"
                    rows={2}
                    placeholder="A short note to the project owner — e.g. what capability or funding you can offer."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => express(o.project_id, 'co-development')} disabled={busy} className="btn-secondary text-xs flex items-center gap-1.5">
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Handshake size={13} />} Offer co-development
                    </button>
                    <button onClick={() => express(o.project_id, 'funding')} disabled={busy} className="btn-secondary text-xs flex items-center gap-1.5">
                      <Banknote size={13} /> Offer funding
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isIndustry && (
        <p className="mt-6 text-xs text-text-secondary text-center">
          <Send size={11} className="inline mr-1" /> Once the problem owner accepts, your company is added as a project team member and you'll get notified.
        </p>
      )}
    </div>
  )
}
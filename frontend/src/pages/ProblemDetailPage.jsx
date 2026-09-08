import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Zap, CheckCircle, MapPin, Clock, Banknote, Megaphone, LocateFixed, Film, Image, School, Search, X, Loader2 } from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import { DomainBadge, DifficultyBadge, StatusBadge } from '../components/problems/ProblemCard'

export default function ProblemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [problem, setProblem] = useState(null)
  const [matches, setMatches] = useState([])
  const [interests, setInterests] = useState([])
  const [loading, setLoading] = useState(true)
  const [expressing, setExpressing] = useState(false)
  const [expressed, setExpressed] = useState(false)
  const [message, setMessage] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [faculty, setFaculty] = useState([])
  const [facultyLoading, setFacultyLoading] = useState(false)
  const [assignQ, setAssignQ] = useState('')
  const [assigningId, setAssigningId] = useState(null)
  const [assignError, setAssignError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/problems/${id}`)
        setProblem(data)
        if (user?.role === 'problem_owner' || user?.role === 'gov_admin') {
          try {
            const { data: intr } = await api.get(`/projects/interest/problem/${id}`)
            setInterests(intr)
          } catch {}
          try {
            const { data: m } = await api.get(`/matching/problem/${id}/solvers`)
            setMatches(m.matches || [])
          } catch {}
        }
        if (user?.role === 'faculty' || user?.role === 'student') {
          try {
            const { data: m } = await api.get(`/matching/problem/${id}/solvers`)
            setMatches(m.matches || [])
          } catch {}
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleExpressInterest() {
    setExpressing(true)
    try {
      await api.post('/projects/interest', { problem_id: parseInt(id), message })
      setExpressed(true)
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not express interest')
    } finally {
      setExpressing(false)
    }
  }

  async function handleAccept(requestId) {
    try {
      const { data } = await api.patch(`/projects/interest/${requestId}/accept`)
      alert('Team member added! Project created.')
      navigate(`/projects/${data.project_id}`)
    } catch (e) {
      alert(e.response?.data?.detail || 'Error')
    }
  }

  async function openAssign() {
    setAssignOpen(true)
    setAssignError('')
    if (faculty.length) return
    setFacultyLoading(true)
    try {
      const { data } = await api.get('/users?role=faculty')
      setFaculty(data)
    } catch {
      setAssignError('Could not load the faculty directory.')
    } finally {
      setFacultyLoading(false)
    }
  }

  async function handleAssign(facultyId) {
    setAssigningId(facultyId)
    setAssignError('')
    try {
      const { data } = await api.patch(`/problems/${id}/assign`, { faculty_id: facultyId })
      setAssignOpen(false)
      navigate(`/projects/${data.project_id}`)
    } catch (e) {
      setAssignError(e.response?.data?.detail || 'Assignment failed')
      setAssigningId(null)
    }
  }

  if (loading) return (
    <div className="p-6 animate-pulse">
      <div className="h-6 bg-bg-secondary rounded w-1/2 mb-4" />
      <div className="h-4 bg-bg-secondary rounded w-full mb-2" />
      <div className="h-4 bg-bg-secondary rounded w-5/6" />
    </div>
  )

  if (!problem) return (
    <div className="p-6 text-center text-text-secondary py-20">Problem not found</div>
  )

  const isSolver = user?.role === 'faculty' || user?.role === 'student'
  const isOwner = user?.role === 'problem_owner'
  const isAssigner = isOwner || user?.role === 'gov_admin'
  const goodFaculty = faculty.filter(f => (f.full_name + ' ' + (f.department || '') + ' ' + (f.institution || '')).toLowerCase().includes(assignQ.toLowerCase()))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Title block */}
      <div className="card p-6 mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {(problem.domain || []).map(d => <DomainBadge key={d} domain={d} />)}
          <DifficultyBadge difficulty={problem.difficulty} />
          <StatusBadge status={problem.status} />
          {problem.community_submitted && (
            <span className="badge bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
              <Megaphone size={11} className="inline mr-1" />Community-submitted{problem.submitted_by ? ` by ${problem.submitted_by}` : ''}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">{problem.title}</h1>
        <p className="text-xs text-text-secondary">
          Posted by <strong>{problem.owner_name}</strong>
          {problem.owner_designation && <> · {problem.owner_designation}</>}
        </p>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-text-secondary">
          {problem.district && <span className="flex items-center gap-1"><MapPin size={13}/>{problem.district}</span>}
          {problem.location && <span className="flex items-center gap-1"><LocateFixed size={13}/>{problem.location}</span>}
          {problem.timeline && <span className="flex items-center gap-1"><Clock size={13}/>{problem.timeline}</span>}
          {problem.budget && <span className="flex items-center gap-1"><Banknote size={13}/>{problem.budget}</span>}
        </div>

        {(problem.attachments || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {problem.attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 badge bg-bg-secondary text-text-secondary text-xs">
                {a.type === 'video' ? <Film size={12} /> : <Image size={12} />} {a.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Detail sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Section title="Current Situation" content={problem.situation} />
        <Section title="Problem / Gap" content={problem.gap} />
        <Section title="Desired Outcome" content={problem.desired_outcome} />
        {problem.constraints && <Section title="Constraints" content={problem.constraints} />}
      </div>

      {/* SDG tags */}
      {(problem.sdg_tags || []).length > 0 && (
        <div className="card p-4 mb-4">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">SDG Alignment</p>
          <div className="flex flex-wrap gap-2">
            {problem.sdg_tags.map(s => (
              <span key={s} className="badge bg-blue-50 text-blue-700 text-xs">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Solver: express interest */}
      {isSolver && problem.status === 'open' && (
        <div className="card p-5 mb-4 border-blue-200 bg-blue-50">
          <h2 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Zap size={16} /> Express Interest
          </h2>
          {expressed ? (
            <p className="text-green-700 font-medium flex items-center gap-2">
              <CheckCircle size={16} /> Interest registered! The problem owner will review your request.
            </p>
          ) : (
            <>
              <textarea
                className="input mb-3 text-xs"
                rows={3}
                placeholder="Optional: briefly explain why you're a good fit for this challenge…"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button
                onClick={handleExpressInterest}
                disabled={expressing}
                className="btn-primary"
              >
                {expressing ? 'Submitting…' : 'Express Interest'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Owner: view interest requests */}
      {isOwner && interests.length > 0 && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Users size={16} /> Interest Requests ({interests.length})
          </h2>
          <div className="space-y-3">
            {interests.map(req => (
              <div key={req.request_id} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text-primary">{req.full_name}</p>
                  <p className="text-xs text-text-secondary">{req.department} · {req.institution}</p>
                  {req.message && <p className="text-xs text-text-secondary mt-1 italic">"{req.message}"</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(req.expertise_tags || []).slice(0, 3).map(t => (
                      <span key={t} className="badge bg-bg-secondary text-text-secondary text-xs">{t}</span>
                    ))}
                  </div>
                </div>
                {req.status === 'pending' ? (
                  <button onClick={() => handleAccept(req.request_id)} className="btn-primary text-xs">
                    Accept & Form Team
                  </button>
                ) : (
                  <span className="badge bg-green-100 text-green-700">Accepted</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owner/admin: assign directly to a university faculty */}
      {isAssigner && problem.status === 'open' && (
        <div className="card p-5 mb-4 border-emerald-200 bg-emerald-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-emerald-900 mb-1 flex items-center gap-2">
                <School size={16} /> Assign to a University
              </h2>
              <p className="text-xs text-emerald-800/70">
                Skip the wait — push this challenge directly to a faculty lead. Their student team is formed automatically.
              </p>
            </div>
            <button onClick={openAssign} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-md shadow-emerald-600/20">
              Assign
            </button>
          </div>
        </div>
      )}

      {/* Matched solvers */}
      {matches.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
            <Zap size={16} className="text-blue-600" /> AI-Recommended Solvers
          </h2>
          <p className="text-xs text-text-secondary mb-3">Ranked by semantic similarity + expertise match</p>
          <div className="space-y-3">
            {matches.slice(0, 5).map((m, i) => (
              <div key={m.user_id} className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {m.avatar_initials || m.full_name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">{m.full_name}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${m.match_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-blue-700">{m.match_score}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary">{m.department} · {m.institution}</p>
                  <p className="text-xs text-text-secondary mt-1 italic">{m.explanation}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(m.expertise_tags || []).slice(0, 3).map(t => (
                      <span key={t} className="badge bg-blue-50 text-blue-700 text-xs">{t}</span>
                    ))}
                    <span className="badge bg-bg-secondary text-text-secondary text-xs">{m.match_method}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, content }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">{title}</p>
      <p className="text-sm text-text-primary leading-relaxed">{content}</p>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Plus, Loader2, Shield } from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import clsx from 'clsx'

const STAGES = ['discovery', 'proposal', 'research', 'prototype', 'evaluation', 'deployment', 'verified']
const STAGE_LABELS = {
  discovery: 'Discovery', proposal: 'Proposal', research: 'Research',
  prototype: 'Prototype', evaluation: 'Evaluation', deployment: 'Deployment', verified: 'Verified'
}
const STAGE_DESCRIPTIONS = {
  discovery: 'Understanding the problem, stakeholders, and root causes',
  proposal: 'Defining the approach, methodology, and team plan',
  research: 'Deep investigation, literature review, data collection',
  prototype: 'Building and testing the solution',
  evaluation: 'Validating with real users and stakeholders',
  deployment: 'Implementing in the real environment',
  verified: 'Problem owner has confirmed real-world implementation',
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [advancingTo, setAdvancingTo] = useState(null)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDesc, setMilestoneDesc] = useState('')
  const [milestoneDue, setMilestoneDue] = useState('')
  const [savingMilestone, setSavingMilestone] = useState(false)
  const [verifyEvidence, setVerifyEvidence] = useState('')
  const [verifying, setVerifying] = useState(false)

  async function load() {
    try {
      const { data } = await api.get(`/projects/${id}`)
      setProject(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function advanceStage(stage) {
    setAdvancingTo(stage)
    try {
      await api.patch(`/projects/${id}/stage?stage=${stage}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Error advancing stage')
    } finally {
      setAdvancingTo(null)
    }
  }

  async function addMilestone() {
    if (!milestoneTitle.trim()) return
    setSavingMilestone(true)
    try {
      await api.post(`/projects/${id}/milestones`, {
        title: milestoneTitle,
        description: milestoneDesc,
        due_date: milestoneDue,
      })
      setMilestoneTitle(''); setMilestoneDesc(''); setMilestoneDue('')
      setShowMilestoneForm(false)
      await load()
    } finally {
      setSavingMilestone(false)
    }
  }

  async function completeMilestone(milestoneId) {
    try {
      await api.patch(`/projects/milestones/${milestoneId}/complete`)
      await load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Error')
    }
  }

  async function verifyOutcome() {
    setVerifying(true)
    try {
      await api.patch(`/projects/${id}/verify?evidence=${encodeURIComponent(verifyEvidence)}`)
      await load()
    } finally {
      setVerifying(false)
    }
  }

  if (loading) return (
    <div className="p-6 animate-pulse">
      <div className="h-6 bg-bg-secondary rounded w-1/2 mb-4" />
      <div className="h-4 bg-bg-secondary rounded w-full mb-2" />
    </div>
  )
  if (!project) return <div className="p-6 text-text-secondary">Project not found</div>

  const currentStageIdx = STAGES.indexOf(project.stage)
  const isVerified = project.stage === 'verified'
  const canVerify = user?.role === 'problem_owner' || user?.role === 'gov_admin'
  const canAdvance = user?.role !== 'problem_owner'
  const nextStage = STAGES[currentStageIdx + 1]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header */}
      <div className="card p-6 mb-4">
        {isVerified && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <CheckCircle size={18} className="text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Outcome Verified</p>
              {project.outcome_verified_at && (
                <p className="text-xs text-emerald-600">
                  Confirmed on {new Date(project.outcome_verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              {project.outcome_evidence && (
                <p className="text-xs text-emerald-700 mt-1 italic">"{project.outcome_evidence}"</p>
              )}
            </div>
          </div>
        )}
        <h1 className="text-lg font-bold text-text-primary mb-1">{project.problem_title}</h1>
        <p className="text-xs text-text-secondary mb-4">Project #{project.id}</p>

        <div className="flex flex-wrap gap-2">
          {(project.problem_domain || []).map(d => (
            <span key={d} className="badge bg-blue-100 text-blue-800 text-xs">{d}</span>
          ))}
          {project.problem_district && <span className="text-xs text-text-secondary">📍 {project.problem_district}</span>}
        </div>
      </div>

      {/* Stage tracker */}
      <div className="card p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Project Lifecycle</h2>
        <div className="space-y-2">
          {STAGES.map((s, i) => {
            const isPast = i < currentStageIdx
            const isCurrent = i === currentStageIdx
            const isFuture = i > currentStageIdx
            return (
              <div key={s} className={clsx(
                'flex items-start gap-3 p-3 rounded-lg transition-colors',
                isCurrent ? 'bg-blue-50 border border-blue-200' : isPast ? 'bg-bg-primary' : ''
              )}>
                <div className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  isPast ? 'bg-green-500' : isCurrent ? 'bg-blue-600' : 'bg-bg-secondary'
                )}>
                  {isPast ? <CheckCircle size={14} className="text-white" /> :
                    <span className="text-xs font-bold text-white">{i + 1}</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={clsx('text-sm font-medium', isCurrent ? 'text-blue-800' : isPast ? 'text-text-secondary' : 'text-text-secondary')}>
                      {STAGE_LABELS[s]}
                      {isCurrent && <span className="ml-2 badge bg-blue-600 text-white text-xs">Current</span>}
                    </p>
                    {isCurrent && nextStage && canAdvance && !isVerified && (
                      <button
                        onClick={() => advanceStage(nextStage)}
                        disabled={!!advancingTo}
                        className="btn-primary text-xs py-1"
                      >
                        {advancingTo === nextStage ? <Loader2 size={12} className="animate-spin" /> : null}
                        Advance to {STAGE_LABELS[nextStage]}
                      </button>
                    )}
                  </div>
                  <p className={clsx('text-xs mt-0.5', isCurrent ? 'text-blue-600' : 'text-text-secondary')}>
                    {STAGE_DESCRIPTIONS[s]}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Outcome verification (for problem owners, when at deployment stage) */}
      {canVerify && project.stage === 'deployment' && !isVerified && (
        <div className="card p-5 mb-4 border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-emerald-700" />
            <h2 className="font-semibold text-emerald-800">Verify Outcome</h2>
          </div>
          <p className="text-sm text-emerald-700 mb-3">
            Has this solution been implemented in the real world? Confirming this marks the challenge as <strong>Outcome Verified</strong> — the highest status on Setu.
          </p>
          <textarea
            className="input mb-3"
            rows={3}
            placeholder="Describe the evidence of implementation (e.g. 'Water purification units installed in 12 of 15 villages. District survey confirms 60% reduction in waterborne disease cases.')…"
            value={verifyEvidence}
            onChange={e => setVerifyEvidence(e.target.value)}
          />
          <button onClick={verifyOutcome} disabled={verifying} className="btn-primary">
            {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Confirm Real-World Implementation
          </button>
        </div>
      )}

      {/* Team */}
      <div className="card p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Team ({project.members?.length || 0} members)</h2>
        <div className="space-y-2">
          {(project.members || []).map(m => (
            <div key={m.user_id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold">
                {m.avatar_initials || m.full_name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{m.full_name}</p>
                <p className="text-xs text-text-secondary">{m.department} · {m.institution}</p>
              </div>
              <span className={clsx('badge text-xs ml-auto', m.role_in_team === 'lead' ? 'bg-blue-100 text-blue-700' : 'bg-bg-secondary text-text-secondary')}>
                {m.role_in_team}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Milestones ({project.milestones?.filter(m => m.status === 'completed').length || 0}/{project.milestones?.length || 0} completed)
          </h2>
          {!isVerified && (
            <button onClick={() => setShowMilestoneForm(!showMilestoneForm)} className="btn-ghost text-xs">
              <Plus size={13} /> Add
            </button>
          )}
        </div>

        {showMilestoneForm && (
          <div className="bg-bg-primary rounded-lg p-4 mb-4 space-y-3">
            <input className="input" placeholder="Milestone title" value={milestoneTitle} onChange={e => setMilestoneTitle(e.target.value)} />
            <textarea className="input text-xs" rows={2} placeholder="Description (optional)" value={milestoneDesc} onChange={e => setMilestoneDesc(e.target.value)} />
            <input className="input text-xs" type="date" value={milestoneDue} onChange={e => setMilestoneDue(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={addMilestone} disabled={savingMilestone} className="btn-primary text-xs">
                {savingMilestone ? <Loader2 size={12} className="animate-spin" /> : null} Save
              </button>
              <button onClick={() => setShowMilestoneForm(false)} className="btn-secondary text-xs">Cancel</button>
            </div>
          </div>
        )}

        {(project.milestones || []).length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">No milestones yet</p>
        ) : (
          <div className="space-y-2">
            {project.milestones.map(m => (
              <div key={m.id} className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg">
                <button
                  onClick={() => m.status !== 'completed' && completeMilestone(m.id)}
                  disabled={m.status === 'completed' || isVerified}
                  className={clsx(
                    'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors',
                    m.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-blue-400'
                  )}
                >
                  {m.status === 'completed' && <CheckCircle size={12} className="text-white" />}
                </button>
                <div className="flex-1">
                  <p className={clsx('text-sm font-medium', m.status === 'completed' ? 'line-through text-text-secondary' : 'text-text-primary')}>
                    {m.title}
                  </p>
                  {m.description && <p className="text-xs text-text-secondary mt-0.5">{m.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-text-secondary">
                    {m.due_date && <span>Due: {m.due_date}</span>}
                    {m.completed_at && <span>Completed: {new Date(m.completed_at).toLocaleDateString('en-IN')}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

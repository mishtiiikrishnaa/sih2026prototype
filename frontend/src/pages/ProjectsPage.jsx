import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, ArrowRight, CheckCircle, Handshake, Banknote, FileText, Rocket } from 'lucide-react'
import api from '../api/client'
import clsx from 'clsx'

const STAGE_ORDER = ['discovery', 'proposal', 'research', 'prototype', 'evaluation', 'deployment', 'verified']
const STAGE_LABELS = {
  discovery: 'Discovery', proposal: 'Proposal', research: 'Research',
  prototype: 'Prototype', evaluation: 'Evaluation', deployment: 'Deployment', verified: 'Verified ✓',
}

function StageIndicator({ stage }) {
  const idx = STAGE_ORDER.indexOf(stage)
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STAGE_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            i < idx ? 'bg-green-500' : i === idx ? 'bg-blue-600' : 'bg-bg-secondary'
          )} />
          {i < STAGE_ORDER.length - 1 && <div className={clsx('w-4 h-px', i < idx ? 'bg-green-400' : 'bg-bg-secondary')} />}
        </div>
      ))}
      <span className={clsx(
        'badge text-xs ml-1',
        stage === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-700'
      )}>
        {STAGE_LABELS[stage] || stage}
      </span>
    </div>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/projects/')
        setProjects(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="p-6 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="h-4 bg-bg-secondary rounded w-2/3 mb-3" />
          <div className="h-3 bg-bg-secondary rounded w-1/2" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <FolderKanban size={20} className="text-text-secondary" />
        <h1 className="text-xl font-bold text-text-primary">Projects</h1>
        <span className="badge bg-bg-secondary text-text-secondary text-xs">{projects.length}</span>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm mt-1">Express interest in a challenge to start a project</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-200"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {p.stage === 'verified' && <CheckCircle size={15} className="text-emerald-600" />}
                    <h3 className="text-sm font-semibold text-text-primary truncate">{p.problem_title}</h3>
                  </div>

                  <StageIndicator stage={p.stage} />

                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    {(p.problem_domain || []).slice(0, 2).map(d => (
                      <span key={d} className="badge bg-blue-50 text-blue-700 text-xs">{d}</span>
                    ))}
                    {p.problem_district && (
                      <span className="text-xs text-text-secondary">📍 {p.problem_district}</span>
                    )}
                    {p.seeking_collab && (
                      <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200 text-xs"><Handshake size={11} className="inline mr-1" />Seeking collab</span>
                    )}
                    {p.needs_funding && (
                      <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 text-xs"><Banknote size={11} className="inline mr-1" />Needs funding</span>
                    )}
                    {p.patents?.length > 0 && (
                      <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200 text-xs"><FileText size={11} className="inline mr-1" />{p.patents.length} patent{p.patents.length > 1 ? 's' : ''}</span>
                    )}
                    {p.startups_created > 0 && (
                      <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 text-xs"><Rocket size={11} className="inline mr-1" />{p.startups_created} startup{p.startups_created > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {/* Team */}
                  <div className="flex items-center gap-1 mt-2">
                    {(p.members || []).slice(0, 5).map(m => (
                      <div
                        key={m.user_id}
                        title={`${m.full_name} (${m.role_in_team})`}
                        className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold -ml-1 first:ml-0 border border-white"
                      >
                        {m.avatar_initials || m.full_name?.slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {p.members?.length > 5 && (
                      <span className="text-xs text-text-secondary ml-1">+{p.members.length - 5} more</span>
                    )}
                    <span className="text-xs text-text-secondary ml-2">
                      {p.milestones_completed}/{p.milestone_count} milestones
                    </span>
                  </div>
                </div>
                <ArrowRight size={15} className="text-text-secondary flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

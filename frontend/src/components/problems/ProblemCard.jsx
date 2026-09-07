import clsx from 'clsx'

const DOMAIN_COLORS = {
  'Water Management': 'bg-cyan-100 text-cyan-800',
  'Healthcare': 'bg-red-100 text-red-800',
  'Agriculture': 'bg-green-100 text-green-800',
  'Education': 'bg-yellow-100 text-yellow-800',
  'Infrastructure': 'bg-bg-secondary text-text-primary',
  'Environment': 'bg-emerald-100 text-emerald-800',
  'Rural Livelihoods': 'bg-orange-100 text-orange-800',
  'Digital Access': 'bg-violet-100 text-violet-800',
  'default': 'bg-blue-100 text-blue-800',
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
}

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  matched: 'bg-violet-100 text-violet-700',
  in_progress: 'bg-amber-100 text-amber-700',
  solved: 'bg-green-100 text-green-700',
  verified: 'bg-emerald-100 text-emerald-800',
}

const STATUS_LABELS = {
  open: 'Open',
  matched: 'Matched',
  in_progress: 'In Progress',
  solved: 'Solved',
  verified: '✓ Outcome Verified',
}

export function DomainBadge({ domain }) {
  const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS.default
  return <span className={clsx('badge text-xs', color)}>{domain}</span>
}

export function DifficultyBadge({ difficulty }) {
  return (
    <span className={clsx('badge text-xs capitalize', DIFFICULTY_COLORS[difficulty] || 'bg-bg-secondary text-text-secondary')}>
      {difficulty}
    </span>
  )
}

export function StatusBadge({ status }) {
  return (
    <span className={clsx('badge text-xs', STATUS_COLORS[status] || 'bg-bg-secondary text-text-secondary')}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function ProblemCard({ problem, onClick }) {
  const domains = problem.domain || []
  const sdgs = problem.sdg_tags || []

  return (
    <div
      className="card p-5 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300 dark:hover:border-blue-700"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 flex-1">
          {problem.title}
        </h3>
        <StatusBadge status={problem.status} />
      </div>

      {/* Situation */}
      <p className="text-xs text-text-secondary line-clamp-2 mb-3">{problem.situation}</p>

      {/* Domains */}
      <div className="flex flex-wrap gap-1 mb-3">
        {domains.slice(0, 3).map((d) => (
          <DomainBadge key={d} domain={d} />
        ))}
        <DifficultyBadge difficulty={problem.difficulty} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-border">
        <span className="flex items-center gap-1">
          <span>📍</span>
          {problem.district || 'Jharkhand'}
        </span>
        {problem.timeline && <span>⏱ {problem.timeline}</span>}
        {problem.budget && <span>💰 {problem.budget}</span>}
      </div>

      {/* Posted by */}
      {problem.owner_name && (
        <p className="text-xs text-text-secondary mt-1">
          Posted by {problem.owner_name}
          {problem.owner_designation ? ` · ${problem.owner_designation}` : ''}
        </p>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, ArrowRight } from 'lucide-react'
import api from '../api/client'
import { DomainBadge } from '../components/problems/ProblemCard'

export default function MatchesPage() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/matching/solver/problems')
        setMatches(data.matches || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="p-6 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="h-4 bg-bg-secondary rounded w-3/4 mb-3" />
          <div className="h-3 bg-bg-secondary rounded w-full mb-2" />
          <div className="h-3 bg-bg-secondary rounded w-5/6" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-text-primary">My Recommended Challenges</h1>
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Ranked by semantic similarity between your expertise profile and each problem.
        </p>
      </div>

      {/* Method explanation */}
      <div className="card p-4 mb-5 bg-blue-50 border-blue-100">
        <p className="text-xs text-blue-800">
          <strong>How matching works:</strong> Your expertise tags and bio are encoded into a 384-dimensional semantic vector
          using a multilingual sentence-transformer model. Each problem is encoded similarly.
          Cosine similarity between these vectors (weighted 75%) plus domain tag overlap (25%) produces the match score.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <Zap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No matches found yet</p>
          <p className="text-sm mt-1">Ensure your profile has expertise tags set</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m, i) => (
            <div
              key={m.problem_id}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-200"
              onClick={() => navigate(`/problems/${m.problem_id}`)}
            >
              <div className="flex items-start gap-4">
                {/* Rank */}
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary leading-snug">{m.title}</h3>
                    <ArrowRight size={15} className="text-text-secondary flex-shrink-0" />
                  </div>

                  {/* Match score bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${m.match_score}%`,
                          background: m.match_score > 70 ? '#16a34a' : m.match_score > 50 ? '#2563eb' : '#f59e0b'
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-text-primary">{m.match_score}% match</span>
                    <span className="badge bg-bg-secondary text-text-secondary text-xs">{m.match_method}</span>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-text-secondary italic mb-2">{m.explanation}</p>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(m.domain || []).slice(0, 2).map(d => <DomainBadge key={d} domain={d} />)}
                    {m.district && <span className="text-xs text-text-secondary">📍 {m.district}</span>}
                    <span className={`badge text-xs ${m.difficulty === 'hard' ? 'bg-red-100 text-red-700' : m.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {m.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

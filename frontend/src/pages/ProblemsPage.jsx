import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, PlusCircle, RefreshCw } from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import ProblemCard from '../components/problems/ProblemCard'

const DOMAINS = [
  'Water Management', 'Healthcare', 'Agriculture', 'Education',
  'Infrastructure', 'Environment', 'Rural Livelihoods', 'Digital Access',
]
const DIFFICULTIES = ['easy', 'medium', 'hard']
const STATUSES = ['open', 'in_progress', 'solved', 'verified']
const DISTRICTS = [
  'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Gumla',
  'Khunti', 'Hazaribagh', 'Deoghar', 'Dumka', 'Giridih',
]

export default function ProblemsPage() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [status, setStatus] = useState('')
  const [district, setDistrict] = useState('')
  const { user } = useAuthStore()
  const navigate = useNavigate()

  async function fetchProblems() {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (domain) params.domain = domain
      if (difficulty) params.difficulty = difficulty
      if (status) params.status = status
      if (district) params.district = district
      const { data } = await api.get('/problems/', { params })
      setProblems(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProblems() }, [search, domain, difficulty, status, district])

  function clearFilters() {
    setSearch(''); setDomain(''); setDifficulty(''); setStatus(''); setDistrict('')
  }

  const hasFilters = search || domain || difficulty || status || district

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Problem Marketplace</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {loading ? 'Loading…' : `${problems.length} challenges from across Jharkhand`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchProblems} className="btn-ghost">
            <RefreshCw size={15} />
          </button>
          {user?.role === 'problem_owner' && (
            <button onClick={() => navigate('/wizard')} className="btn-primary">
              <PlusCircle size={15} />
              Post Challenge
            </button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass-card p-5 mb-6">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Search problems by title, situation, or gap…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="input w-auto text-xs py-1.5" value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="">All Domains</option>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="input w-auto text-xs py-1.5" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">All Districts</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="input w-auto text-xs py-1.5" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Any Difficulty</option>
              {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
            </select>
            <select className="input w-auto text-xs py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="btn-ghost text-xs py-1.5">
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-bg-secondary rounded w-3/4 mb-3" />
              <div className="h-3 bg-bg-secondary rounded w-full mb-1" />
              <div className="h-3 bg-bg-secondary rounded w-5/6 mb-4" />
              <div className="flex gap-2">
                <div className="h-5 bg-bg-secondary rounded-full w-20" />
                <div className="h-5 bg-bg-secondary rounded-full w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No problems found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary mt-4">Clear all filters</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {problems.map((p) => (
            <ProblemCard
              key={p.id}
              problem={p}
              onClick={() => navigate(`/problems/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

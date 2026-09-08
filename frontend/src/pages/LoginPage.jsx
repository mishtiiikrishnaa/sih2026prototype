import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../store/ThemeContext.jsx'
import api from '../api/client'
import { Moon, Sun, ShieldCheck, Zap, Users, Globe, Factory, Megaphone } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { label: 'Problem Owner', name: 'Suresh Kumar', role: 'District Collector, Gumla', email: 'suresh.kumar@gov.jh.in', hex: '#f97316', icon: ShieldCheck },
  { label: 'Faculty', name: 'Dr. Priya Singh', role: 'Civil Engineering, BIT Mesra', email: 'priya.singh@bitmesra.ac.in', hex: '#3b82f6', icon: Zap },
  { label: 'Student', name: 'Rahul Sharma', role: 'B.Tech Student, BIT Mesra', email: 'rahul.sharma@bitmesra.ac.in', hex: '#22c55e', icon: Users },
  { label: 'Gov. Admin', name: 'Dr. Nirmala Soren', role: 'Principal Secretary, Education', email: 'secretary@education.jh.gov.in', hex: '#a855f7', icon: Globe },
  { label: 'Industry Partner', name: 'Ankit Jha', role: 'Tata Steel R&D, Jamshedpur', email: 'ankit.jha@company.in', hex: '#f43f5e', icon: Factory },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('demo123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const form = new URLSearchParams(); form.append('username', email); form.append('password', password)
      const { data } = await api.post('/auth/token', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      setAuth(data.access_token, data.user); navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Try a demo account below.')
    } finally { setLoading(false) }
  }
  function fillDemo(acct) { setEmail(acct.email); setPassword('demo123'); setError('') }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-950 via-blue-900 to-teal-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-600/20 rounded-full blur-[120px] pointer-events-none" />
      {/* faint radial grid */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(147,197,253,0.28) 0 1px, transparent 2px)', backgroundSize: '34px 34px' }} />

      <button onClick={toggleTheme} className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white/70 hover:text-white transition backdrop-blur-md border border-white/10 shadow-lg" aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center z-10">
        {/* Left — Brand */}
        <div className="text-center lg:text-left lg:pl-8 relative">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl shadow-blue-900/30">
              <span className="text-3xl">🌉</span>
            </div>
            <div className="text-left">
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9]">Setu</h1>
              <p className="text-blue-200/80 text-sm font-medium tracking-wide">Societal Problem-Solving Ecosystem</p>
            </div>
          </div>

          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-5 leading-snug">Bridge <span className="text-blue-300">government</span> challenges with <span className="text-teal-300">university</span> innovation.</h2>
          <p className="text-blue-100/70 text-base max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">A digital platform connecting Jharkhand's societal needs with the state's brightest academic minds — from idea to verified real-world impact.</p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-2.5">
            <span className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-blue-50 text-xs font-medium backdrop-blur-sm shadow-lg shadow-blue-950/30">Government</span>
            <span className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-blue-50 text-xs font-medium backdrop-blur-sm shadow-lg shadow-blue-950/30">Universities</span>
            <span className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-blue-50 text-xs font-medium backdrop-blur-sm shadow-lg shadow-blue-950/30">Industry</span>
          </div>

          <p className="hidden lg:block text-blue-200/30 text-[11px] mt-10 tracking-widest uppercase">S I H  ·  2 0 2 6  ·  P S  2 6 0 4 3</p>
        </div>

        {/* Right — Form */}
        <div className="w-full max-w-sm mx-auto lg:max-w-md lg:ml-auto">
          <div className="bg-white/5 dark:bg-slate-900/20 backdrop-blur-xl rounded-3xl border border-white/10 dark:border-border/30 shadow-2xl p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-1">Welcome back</h3>
              <p className="text-sm text-blue-200/60">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-blue-100/90 mb-1.5">Email</label>
                <input id="email" type="email" className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-slate-800/60 border border-white/10 dark:border-slate-600 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-blue-100/90 mb-1.5">Password</label>
                <input id="password" type="password" className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-slate-800/60 border border-white/10 dark:border-slate-600 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-red-300 bg-red-900/30 px-3 py-2 rounded-lg border border-red-700/30">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]">
                {loading ? 'Signing in…' : 'Continue →'}
              </button>
            </form>
          </div>

          {/* Demo cards */}
          <div className="mt-4">
            <p className="text-[10px] text-blue-200/50 font-semibold tracking-widest uppercase mb-3">Quick Access</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <button key={acct.email} onClick={() => fillDemo(acct)} className="group flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] backdrop-blur-sm">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: acct.hex, boxShadow: `0 0 0 0px rgba(0,0,0,0.1)`, WebkitBoxShadow: `0 4px 16px -4px ${acct.hex}80, inset 0 0 0 1px rgba(255,255,255,0.18)` }}>
                    <acct.icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-xs leading-tight">{acct.label}</p>
                    <p className="text-[10px] text-blue-100/50 truncate">{acct.name}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-blue-200/40 text-[11px] mt-3 text-center">Password for all: <span className="font-mono text-blue-100/70 bg-white/10 px-1.5 py-0.5 rounded-md">demo123</span></p>
            <p className="text-blue-200/50 text-[11px] mt-1.5 text-center">Spotted a local problem? <Link to="/report" className="text-teal-300 hover:text-teal-200 font-semibold underline decoration-teal-500/50 hover:decoration-teal-300">Report it — no login needed →</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

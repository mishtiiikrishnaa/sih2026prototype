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
    <div className="min-h-screen bg-gradient-to-tr from-indigo-950 via-blue-900 to-teal-950 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-600/20 rounded-full blur-[120px] pointer-events-none" />
      {/* faint radial grid */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(147,197,253,0.28) 0 1px, transparent 2px)', backgroundSize: '34px 34px' }} />

      <button onClick={toggleTheme} className="fixed top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white/70 hover:text-white transition backdrop-blur-md border border-white/10 shadow-lg" aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-lg mx-auto z-10">
        <div className="bg-white/[0.06] dark:bg-slate-900/30 backdrop-blur-xl rounded-3xl border border-white/10 dark:border-white/10 shadow-2xl p-8 sm:p-10 text-center">
          {/* Brand */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl shadow-blue-900/30 mb-4">
              <span className="text-3xl">🌉</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Setu</h1>
            <p className="text-blue-200/70 text-sm font-medium tracking-wide mt-1.5">Societal Problem-Solving Ecosystem</p>
          </div>

          <h2 className="text-lg font-bold text-white mb-1.5 leading-snug">Bridge <span className="text-blue-300">government</span> challenges with <span className="text-teal-300">university</span> innovation.</h2>
          <p className="text-blue-100/60 text-sm mb-7 leading-relaxed">From idea to verified real-world impact across Jharkhand.</p>

          <div className="h-px bg-white/10 mb-7" />

          {/* Sign in */}
          <div className="mb-3 text-left">
            <p className="text-[11px] text-blue-200/60 font-semibold tracking-widest uppercase mb-3">Sign in</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 text-left">
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

          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[11px] text-blue-200/40">or quick access</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          {/* Demo cards */}
          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((acct) => (
              <button key={acct.email} onClick={() => fillDemo(acct)} className="group flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] backdrop-blur-sm">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: acct.hex, WebkitBoxShadow: `0 4px 16px -4px ${acct.hex}80, inset 0 0 0 1px rgba(255,255,255,0.18)` }}>
                  <acct.icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-xs leading-tight">{acct.label}</p>
                  <p className="text-[10px] text-blue-100/50 truncate">{acct.role}</p>
                </div>
                <span className="text-[10px] font-mono text-blue-200/40 group-hover:text-blue-100/70 px-1.5 text-right">{acct.name}</span>
              </button>
            ))}
          </div>
          <p className="text-blue-200/40 text-[11px] mt-3 text-center">Password for all: <span className="font-mono text-blue-100/70 bg-white/10 px-1.5 py-0.5 rounded-md">demo123</span></p>
        </div>

        <p className="text-blue-200/50 text-[12px] mt-5 text-center">Spotted a local problem? <Link to="/report" className="text-teal-300 hover:text-teal-200 font-semibold underline underline-offset-2 decoration-teal-500/50 hover:decoration-teal-300">Report it — no login needed →</Link></p>
        <p className="hidden sm:block text-blue-200/25 text-[11px] mt-3 text-center tracking-widest uppercase">S I H · 2 0 2 6 · P S 2 6 0 4 3</p>
      </div>
    </div>
  )
}

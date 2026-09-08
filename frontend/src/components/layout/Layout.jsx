import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../store/ThemeContext.jsx'
import api from '../../api/client'
import {
  LayoutDashboard, Search, PlusCircle, Zap, FolderKanban, Factory,
  LogOut, Sun, Moon, Bell, CheckCheck
} from 'lucide-react'
import clsx from 'clsx'

const ROLE_LABELS = {
  problem_owner: 'Problem Owner',
  faculty: 'Faculty',
  student: 'Student',
  gov_admin: 'Gov. Admin',
  industry_partner: 'Industry Partner',
  citizen: 'Citizen',
}

const ROLE_COLORS = {
  problem_owner: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  faculty: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  student: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  gov_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  industry_partner: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  citizen: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
}

function NotificationBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { data } = await api.get('/notifications')
        if (alive) setItems(data)
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter(n => !n.read).length

  async function markRead(id) {
    await api.post(`/notifications/${id}/read`).catch(() => {})
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }
  async function markAll() {
    await api.post('/notifications/read').catch(() => {})
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-xl hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary" title="Notifications">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-hidden rounded-2xl bg-bg-primary border border-border shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-text-primary">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"><CheckCheck size={14} /> Mark all read</button>
            )}
          </div>
          <div className="overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-6 text-sm text-text-secondary text-center">No notifications yet.</p>}
            {items.map(n => (
              <button key={n.id} onClick={() => markRead(n.id)} className={clsx('w-full text-left px-4 py-3 border-b border-border/50 hover:bg-bg-secondary transition-colors', !n.read && 'bg-blue-50 dark:bg-blue-900/10')}>
                <p className={clsx('text-xs font-bold', n.read ? 'text-text-secondary' : 'text-text-primary')}>{n.title}</p>
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
        )
      }
    >
      <Icon size={18} strokeWidth={2.2} />
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const role = user?.role
  const { theme, toggleTheme } = useTheme()

  function handleLogout() {
    logout(); navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 border-b border-border bg-bg-primary shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-base font-bold">🌉</span>
          </div>
          <div className="leading-tight">
            <span className="text-base font-extrabold text-text-primary block tracking-tight">Setu</span>
            <span className="text-[10px] text-text-secondary font-medium tracking-widest">PS26043</span>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <NavItem to="/problems" icon={Search} label="Marketplace" />
          {(role === 'problem_owner') && (<NavItem to="/wizard" icon={PlusCircle} label="Post" />)}
          {(role === 'faculty' || role === 'student') && (<NavItem to="/matches" icon={Zap} label="Matches" />)}
          {(role === 'industry_partner' || role === 'gov_admin') && (<NavItem to="/industry" icon={Factory} label="Industry" />)}
          <NavItem to="/projects" icon={FolderKanban} label="Projects" />
          {(role === 'gov_admin') && (<NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />)}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary" aria-label="Toggle theme" title="Toggle light/dark">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="flex items-center gap-2.5 pl-3 border-l border-border ml-0.5">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-text-primary leading-none truncate max-w-[120px]">{user?.full_name}</p>
              <span className={clsx('badge text-[10px] mt-0.5', ROLE_COLORS[role])}>{ROLE_LABELS[role]}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-extrabold shadow-md shadow-blue-700/20">
              {user?.avatar_initials || user?.full_name?.slice(0, 2).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-xl transition-colors" title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-bg-primary">
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

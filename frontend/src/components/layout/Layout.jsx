import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../store/ThemeContext.jsx'
import {
  LayoutDashboard, Search, PlusCircle, Zap, FolderKanban,
  LogOut, Sun, Moon
} from 'lucide-react'
import clsx from 'clsx'

const ROLE_LABELS = {
  problem_owner: 'Problem Owner',
  faculty: 'Faculty',
  student: 'Student',
  gov_admin: 'Gov. Admin',
}

const ROLE_COLORS = {
  problem_owner: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  faculty: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  student: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  gov_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
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
          <NavItem to="/projects" icon={FolderKanban} label="Projects" />
          {(role === 'gov_admin') && (<NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />)}
        </nav>

        <div className="flex items-center gap-2">
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

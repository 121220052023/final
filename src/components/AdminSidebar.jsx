import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BarChart3, BookOpen, FileText, Settings, LogOut, Sun, Moon, Library, MessageSquarePlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/library', label: 'Library', icon: Library },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/content', label: 'Content', icon: BookOpen },
  { to: '/admin/requests', label: 'Requests', icon: MessageSquarePlus },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminSidebar() {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <div className="text-sm font-bold text-foreground">Oceanic</div>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Admin Panel
        </div>
      </div>

      <nav className="admin-sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `admin-sidebar-item${isActive ? ' active' : ''}`
            }
          >
            <link.icon />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">Theme</span>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md transition-all text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button onClick={handleLogout} className="admin-sidebar-item" style={{ color: 'var(--app-muted-foreground)' }}>
          <LogOut />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
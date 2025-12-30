import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Layout,
    GitCompare,
    Image,
    Gauge,
    BookOpen,
    Mail,
    Settings,
    LogOut,
    Sparkles,
    Sparkles as EmailSparkle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/website-auditor', icon: Layout, label: 'Website Auditor' },
    { path: '/comparator', icon: GitCompare, label: 'Live vs Stage' },
    { path: '/image-optimizer', icon: Image, label: 'Image Optimizer' },
    { path: '/pagespeed', icon: Gauge, label: 'PageSpeed' },
    { path: '/auto-docs', icon: BookOpen, label: 'Auto Docs' },
    { path: '/newsletter', icon: Mail, label: 'Newsletter' },
    { path: '/email-generator', icon: EmailSparkle, label: 'Email Generator' },
]

export default function Sidebar() {
    const { user, logout } = useAuth()
    return (
        <aside className="w-64 bg-surface-card border-r border-surface-border flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-surface-border">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent-purple rounded-lg flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold gradient-text">Frontend AI</h1>
                        <p className="text-xs text-gray-400">Quality Suite</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-1">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                        ? 'bg-primary text-white shadow-glow'
                                        : 'text-gray-300 hover:bg-surface-dark hover:text-white'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="p-4 border-t border-surface-border space-y-2">
                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all ${isActive ? 'bg-primary text-white shadow-glow' : 'text-gray-300 hover:bg-surface-dark hover:text-white'
                        }`
                    }
                >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Settings</span>
                </NavLink>

                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-dark group relative">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-teal to-primary rounded-full flex items-center justify-center text-sm font-bold text-black uppercase">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user?.email || 'user@example.com'}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-md transition-all absolute right-2 bg-surface-dark border border-white/5"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    )
}

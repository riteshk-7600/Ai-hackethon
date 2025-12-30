import { Search, Bell, Sun, Moon, Download } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
    const [isDark, setIsDark] = useState(true)

    const toggleTheme = () => {
        setIsDark(!isDark)
        document.documentElement.classList.toggle('dark')
    }

    return (
        <header className="h-16 bg-surface-card border-b border-surface-border px-6 flex items-center justify-between sticky top-0 z-10">
            {/* Left: Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Home</span>
                <span className="text-gray-600">/</span>
                <span className="text-white font-medium">Dashboard</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark rounded-lg text-gray-400 hover:text-white transition-colors focus-ring">
                    <Search className="w-4 h-4" />
                    <span className="text-sm">Search...</span>
                    <kbd className="px-2 py-0.5 text-xs bg-surface-border rounded">⌘K</kbd>
                </button>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-surface-dark transition-colors focus-ring">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-status-error rounded-full"></span>
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-surface-dark transition-colors focus-ring"
                >
                    {isDark ? (
                        <Sun className="w-5 h-5 text-gray-400" />
                    ) : (
                        <Moon className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {/* Export Report */}
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors btn-lift focus-ring">
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export</span>
                </button>
            </div>
        </header>
    )
}

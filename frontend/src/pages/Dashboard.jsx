import { useState, useEffect } from 'react'
import { ArrowRight, TrendingUp, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalAudits: 0,
        avgScore: 0,
        issuesFound: 0,
        criticalIssues: 0,
        timeSaved: 0
    })
    const [recentAudits, setRecentAudits] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, historyRes] = await Promise.all([
                    axios.get('/api/audit/dashboard/stats'),
                    axios.get('/api/audit/dashboard/history')
                ])

                const statsData = statsRes.data
                const historyData = historyRes.data

                if (statsData.ok) setStats(statsData.stats)
                if (historyData.ok) setRecentAudits(historyData.history)
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHrs = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHrs / 24)

        if (diffMins < 60) return `${diffMins} mins ago`
        if (diffHrs < 24) return `${diffHrs} hours ago`
        return `${diffDays} days ago`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                    Quality Dashboard 👋
                </h1>
                <p className="text-gray-400">Real-time snapshots of your frontend health.</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link
                    to="/website-auditor"
                    className="group relative overflow-hidden bg-gradient-to-br from-primary to-accent-purple p-6 rounded-2xl hover:shadow-glow transition-all btn-lift"
                >
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-white mb-2">Run Website Audit</h3>
                        <p className="text-blue-100 mb-4">Analyze layout, spacing, and design consistency</p>
                        <div className="flex items-center gap-2 text-white font-medium">
                            <span>Get Started</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                </Link>

                <Link
                    to="/accessibility"
                    className="group relative overflow-hidden bg-gradient-to-br from-accent-teal to-primary p-6 rounded-2xl hover:shadow-glow transition-all btn-lift"
                >
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-white mb-2">Check Accessibility</h3>
                        <p className="text-teal-100 mb-4">Ensure WCAG compliance and inclusive design</p>
                        <div className="flex items-center gap-2 text-white font-medium">
                            <span>Start Testing</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                </Link>

                <Link
                    to="/email-generator"
                    className="group relative overflow-hidden bg-gradient-to-br from-accent-purple to-pink-600 p-6 rounded-2xl hover:shadow-glow transition-all btn-lift"
                >
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-white mb-2">Email Template Generator</h3>
                        <p className="text-purple-100 mb-4">Create production-ready email HTML with AI</p>
                        <div className="flex items-center gap-2 text-white font-medium">
                            <span>Generate</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                </Link>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface-card border border-surface-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Total Audits</span>
                        <TrendingUp className="w-5 h-5 text-status-success" />
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalAudits}</p>
                    <p className="text-xs text-status-success mt-1">Live updates active</p>
                </div>

                <div className="bg-surface-card border border-surface-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Avg Score</span>
                        <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.avgScore}</p>
                    <p className="text-xs text-gray-400 mt-1">Quality index</p>
                </div>

                <div className="bg-surface-card border border-surface-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Issues Found</span>
                        <AlertCircle className="w-5 h-5 text-status-warning" />
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.issuesFound}</p>
                    <p className="text-xs text-status-warning mt-1">{stats.criticalIssues} critical</p>
                </div>

                <div className="bg-surface-card border border-surface-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Time Saved</span>
                        <Clock className="w-5 h-5 text-accent-purple" />
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.timeSaved}h</p>
                    <p className="text-xs text-gray-400 mt-1">Automated efficiency</p>
                </div>
            </div>

            {/* Recent Audits */}
            <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-surface-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Audit History</h2>
                    <span className="text-xs text-gray-400">Last 100 audits</span>
                </div>
                <div className="overflow-x-auto">
                    {recentAudits.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-500 mb-4">No audits performed yet.</p>
                            <Link to="/website-auditor" className="text-primary hover:underline font-medium">Start your first audit</Link>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-surface-dark/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">URL</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Link</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border">
                                {recentAudits.map((audit) => (
                                    <tr key={audit.id} className="hover:bg-surface-dark transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium max-w-xs truncate">{audit.url}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            <span className="flex items-center gap-2">
                                                {audit.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-lg font-bold ${audit.score >= 80 ? 'text-status-success' :
                                                audit.score >= 60 ? 'text-status-warning' :
                                                    'text-status-error'
                                                }`}>
                                                {audit.score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${audit.status === 'pass' ? 'bg-status-success/10 text-status-success border border-status-success/20' :
                                                audit.status === 'warning' ? 'bg-status-warning/10 text-status-warning border border-status-warning/20' :
                                                    'bg-status-error/10 text-status-error border border-status-error/20'
                                                }`}>
                                                {audit.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDate(audit.date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <a href={audit.url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}

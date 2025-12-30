import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Shield, Activity, Bell, Save, Loader2, LogOut, CheckCircle2, AlertCircle } from 'lucide-react'
import axios from 'axios'

const Settings = () => {
    const { user, updateProfile, logout } = useAuth()
    const [activeTab, setActiveTab] = useState('account')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    // Account State
    const [name, setName] = useState(user?.name || '')
    const [email, setEmail] = useState(user?.email || '')

    // Security State
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage({ type: '', text: '' })
        try {
            await updateProfile({ name, email })
            setMessage({ type: 'success', text: 'Profile updated successfully!' })
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            return setMessage({ type: 'error', text: 'Passwords do not match' })
        }
        setIsLoading(true)
        setMessage({ type: '', text: '' })
        try {
            await axios.post('/api/auth/change-password', { currentPassword, newPassword })
            setMessage({ type: 'success', text: 'Password changed successfully!' })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' })
        } finally {
            setIsLoading(false)
        }
    }

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'sessions', label: 'Sessions', icon: Activity },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ]

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2">Settings</h1>
                    <p className="text-gray-400">Manage your account, security preferences and active sessions.</p>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="flex bg-surface-card/30 backdrop-blur-md rounded-2xl p-1.5 border border-white/5 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-glow'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="bg-surface-card border border-white/10 rounded-3xl p-8 shadow-xl">
                {activeTab === 'account' && (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-surface-dark border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-title"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-surface-dark border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                            <p className="text-[10px] text-gray-500 font-medium">Last updated: {new Date(user?.updatedAt || user?.createdAt).toLocaleDateString()}</p>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:shadow-glow transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'security' && (
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-surface-dark border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-surface-dark border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-surface-dark border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-end">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>Update Password</span>
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'sessions' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Active Sessions</h3>
                            <button onClick={logout} className="text-[10px] text-red-500 font-bold uppercase tracking-widest hover:underline">Sign Out of all devices</button>
                        </div>
                        <div className="space-y-4">
                            {user?.sessions?.map((session, i) => (
                                <div key={i} className="flex items-center justify-between p-5 bg-surface-dark border border-white/5 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/5 rounded-xl text-primary">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white mb-0.5">{session.device}</div>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase">{session.ip} • {new Date(session.lastActive).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] bg-green-500/10 text-green-500 px-3 py-1 rounded-full font-black uppercase tracking-tighter">Current</div>
                                </div>
                            )) || <p className="text-gray-500 text-sm">No active sessions found.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-gray-700" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Notification preferences coming soon</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto">We're building a real-time notification system to keep you updated on your audit results.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-center pt-4">
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-8 py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all group shadow-2xl"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Sign Out of Account</span>
                </button>
            </div>
        </div>
    )
}

export default Settings

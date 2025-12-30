import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = location.state?.from?.pathname || '/'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            await login(email, password)
            navigate(from, { replace: true })
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to sign in. Please check your credentials.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-surface-dark flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-accent-purple/20 rounded-full blur-[120px] animate-pulse duration-5000"></div>

            <div className="w-full max-w-md bg-surface-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-4">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
                    <p className="text-gray-400">Sign in to access your AI Quality Suite</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-surface-dark/50 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between pl-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Password</label>
                            <Link to="/forgot-password" size="sm" className="text-[10px] text-primary hover:underline font-bold uppercase tracking-tighter">
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-surface-dark/50 border border-white/5 rounded-xl py-3.5 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-primary to-accent-purple text-white py-4 rounded-xl font-bold hover:shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex items-center justify-center gap-2">
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </div>
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-white hover:text-primary font-bold underline underline-offset-4 decoration-primary/50">
                        Create one for free
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Login

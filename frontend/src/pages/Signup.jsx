import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Lock, Loader2, ArrowRight, UserPlus, Check } from 'lucide-react'

const Signup = () => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const { signup } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        if (password.length < 8) {
            setError('Password must be at least 8 characters long')
            setIsLoading(false)
            return
        }

        try {
            await signup(name, email, password)
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create account. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const checks = [
        { label: 'Min 8 characters', met: password.length >= 8 },
        { label: 'Has number', met: /\d/.test(password) },
        { label: 'Has special char', met: /[!@#$%^&*]/.test(password) }
    ]

    return (
        <div className="min-h-screen bg-surface-dark flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 -left-20 w-96 h-96 bg-accent-teal/20 rounded-full blur-[120px] animate-pulse duration-5000"></div>

            <div className="w-full max-w-md bg-surface-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-accent-teal/10 rounded-2xl border border-accent-teal/20 mb-4">
                        <UserPlus className="w-8 h-8 text-accent-teal" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">Create Account</h1>
                    <p className="text-gray-400">Join the AI Quality revolution today</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-surface-dark/50 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-accent-teal/50 transition-all font-title"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-surface-dark/50 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-accent-teal/50 transition-all"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-surface-dark/50 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-accent-teal/50 transition-all font-mono"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1 pl-1">
                            {checks.map((check, i) => (
                                <div key={i} className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight ${check.met ? 'text-accent-teal' : 'text-gray-600'}`}>
                                    <div className={`w-3 h-3 rounded-full flex items-center justify-center border ${check.met ? 'bg-accent-teal border-accent-teal text-black' : 'border-white/10'}`}>
                                        {check.met && <Check className="w-2 h-2" />}
                                    </div>
                                    {check.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-accent-teal to-primary text-black py-4 rounded-xl font-bold hover:shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group mt-4"
                    >
                        <div className="flex items-center justify-center gap-2">
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign Up</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </div>
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-white hover:text-accent-teal font-bold underline underline-offset-4 decoration-accent-teal/50">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Signup

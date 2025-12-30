import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2, Send, CheckCircle } from 'lucide-react'
import axios from 'axios'

const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        try {
            await axios.post('/api/auth/forgot-password', { email })
            setIsSent(true)
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSent) {
        return (
            <div className="min-h-screen bg-surface-dark flex items-center justify-center p-6 bg-glow-radial">
                <div className="w-full max-w-md bg-surface-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-green-500/10 rounded-full border border-green-500/20 mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-4">Check your email</h1>
                    <p className="text-gray-400 mb-8">We've sent a password reset link to <span className="text-white font-bold">{email}</span>. Please check your inbox and spam folder.</p>
                    <Link to="/login" className="inline-flex items-center gap-2 text-primary hover:underline font-bold uppercase tracking-widest text-xs">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Sign In
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface-dark flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md bg-surface-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-black text-white mb-2">Forgot Password?</h1>
                    <p className="text-gray-400">Enter your email and we'll send you a recovery link.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-surface-dark border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:shadow-glow transition-all disabled:opacity-50 group"
                    >
                        <div className="flex items-center justify-center gap-2">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Send Reset Link</span>
                                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </div>
                    </button>

                    <Link to="/login" className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest pt-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </form>
            </div>
        </div>
    )
}

export default ForgotPassword

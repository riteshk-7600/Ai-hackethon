import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import WebsiteAuditor from './pages/WebsiteAuditor'
import LiveStageComparator from './pages/LiveStageComparator'
import ImageOptimizer from './pages/ImageOptimizer'
import PageSpeedAnalyzer from './pages/PageSpeedAnalyzer'
import AutoDocs from './pages/AutoDocs'
import NewsletterTester from './pages/NewsletterTester'
import EmailTemplateGenerator from './pages/EmailTemplateGenerator'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'

const queryClient = new QueryClient()

function AppContent() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface-dark">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow"></div>
            </div>
        )
    }

    return (
        <Router>
            <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected Layout Routes */}
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <div className="flex h-screen bg-surface-dark overflow-hidden">
                                <Sidebar />
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <Header />
                                    <main className="flex-1 overflow-y-auto p-6 md:p-8">
                                        <div className="max-w-7xl mx-auto">
                                            <Routes>
                                                <Route path="/" element={<Dashboard />} />
                                                <Route path="/website-auditor" element={<WebsiteAuditor />} />
                                                <Route path="/comparator" element={<LiveStageComparator />} />
                                                <Route path="/image-optimizer" element={<ImageOptimizer />} />
                                                <Route path="/pagespeed" element={<PageSpeedAnalyzer />} />
                                                <Route path="/auto-docs" element={<AutoDocs />} />
                                                <Route path="/newsletter" element={<NewsletterTester />} />
                                                <Route path="/email-generator" element={<EmailTemplateGenerator />} />
                                                <Route path="/settings" element={<Settings />} />
                                            </Routes>
                                        </div>
                                    </main>
                                </div>
                            </div>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    )
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </QueryClientProvider>
    )
}

export default App

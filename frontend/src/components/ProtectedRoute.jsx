import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface-dark">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    // TEMPORARILY DISABLED FOR TESTING - REMOVE IN PRODUCTION
    // if (!user) {
    //     return <Navigate to="/login" state={{ from: location }} replace />
    // }

    return children
}

export default ProtectedRoute

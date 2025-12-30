import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState(localStorage.getItem('token'))

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            fetchProfile()
        } else {
            delete axios.defaults.headers.common['Authorization']
            setLoading(false)
        }
    }, [token])

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/auth/profile')
            setUser(res.data.user)
        } catch (err) {
            console.error('Failed to fetch profile:', err)
            logout()
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        const res = await axios.post('/api/auth/login', { email, password })
        const { user, token } = res.data
        localStorage.setItem('token', token)
        setToken(token)
        setUser(user)
        return user
    }

    const signup = async (name, email, password) => {
        const res = await axios.post('/api/auth/register', { name, email, password })
        const { user, token } = res.data
        localStorage.setItem('token', token)
        setToken(token)
        setUser(user)
        return user
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        delete axios.defaults.headers.common['Authorization']
    }

    const updateProfile = async (updates) => {
        const res = await axios.patch('/api/auth/profile', updates)
        setUser(res.data.user)
        return res.data.user
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

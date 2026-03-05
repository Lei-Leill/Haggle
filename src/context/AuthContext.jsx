import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(() => {
    const token = localStorage.getItem('haggle_token')
    const stored = localStorage.getItem('haggle_user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        api.setToken(null)
        localStorage.removeItem('haggle_user')
      }
    } else {
      setUser(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    const handler = () => {
      setUser(null)
      api.setToken(null)
      localStorage.removeItem('haggle_user')
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [])

  const login = useCallback(async (email, password) => {
    const { user: u, token } = await api.login({ email, password })
    api.setToken(token)
    localStorage.setItem('haggle_user', JSON.stringify(u))
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email, password, name) => {
    const { user: u, token } = await api.register({ email, password, name })
    api.setToken(token)
    localStorage.setItem('haggle_user', JSON.stringify(u))
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    api.setToken(null)
    localStorage.removeItem('haggle_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

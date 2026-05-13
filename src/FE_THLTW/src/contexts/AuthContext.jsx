import React, { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../lib/api'
import { disconnectAll } from '../lib/socket'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password })
    const { accessToken, refreshToken, user: userData } = res.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    localStorage.clear()
    disconnectAll()
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'ADMIN'
  const isManager = user?.role === 'MANAGER'
  const isStaff = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'].includes(user?.role)
  const isKitchen = user?.role === 'KITCHEN'

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isManager, isStaff, isKitchen }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

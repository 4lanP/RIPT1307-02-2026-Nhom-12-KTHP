import React, { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../lib/api'
import { disconnectAll } from '../lib/socket'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  isAdmin: boolean
  isManager: boolean
  isStaff: boolean
  isKitchen: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })

  const login = useCallback(async (email: string, password: string) => {
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
  const isStaff = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'].includes(user?.role || '')
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

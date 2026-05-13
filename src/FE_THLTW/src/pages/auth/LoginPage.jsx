import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UtensilsCrossed, Eye, EyeOff, LogIn, ChefHat } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = [
  { email: 'admin@restaurant.com', role: 'ADMIN', color: 'from-purple-500 to-purple-700' },
  { email: 'manager@restaurant.com', role: 'MANAGER', color: 'from-blue-500 to-blue-700' },
  { email: 'cashier@restaurant.com', role: 'CASHIER', color: 'from-emerald-500 to-emerald-700' },
  { email: 'kitchen@restaurant.com', role: 'KITCHEN', color: 'from-red-500 to-red-700' },
  { email: 'waiter@restaurant.com', role: 'WAITER', color: 'from-orange-500 to-orange-700' },
]

const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: 'Password123!' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Chào mừng, ${user.full_name}!`)
      if (user.role === 'KITCHEN') navigate('/kds')
      else if (['ADMIN', 'MANAGER'].includes(user.role)) navigate('/admin/dashboard')
      else navigate('/tables')
    } catch (err) {
      toast.error(err?.message || 'Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (email) => {
    setForm({ email, password: 'Password123!' })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-purple-900/20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-2xl shadow-orange-500/30 mb-4">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Nhà Hàng KTHP</h1>
          <p className="text-gray-400 mt-2 text-sm">Hệ thống quản lý nhà hàng</p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-orange-400" />
            Đăng nhập
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@restaurant.com"
                required
                className="input-field"
                id="login-email"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="input-field pr-12"
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              id="login-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        {/* Quick login */}
        <div className="mt-6">
          <p className="text-center text-gray-500 text-xs mb-3">Tài khoản demo (click để điền)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map(({ email, role, color }) => (
              <button
                key={email}
                onClick={() => quickLogin(email)}
                className={`
                  px-3 py-2 rounded-xl text-xs font-medium text-white
                  bg-gradient-to-r ${color} opacity-70 hover:opacity-100
                  transition-all duration-200 hover:shadow-lg
                `}
              >
                {role}
              </button>
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs mt-3">Mật khẩu chung: Password123!</p>
        </div>

        {/* Customer link */}
        <div className="mt-4 text-center">
          <a
            href="/scan"
            className="text-orange-400 hover:text-orange-300 text-sm flex items-center justify-center gap-1 transition-colors"
          >
            <ChefHat className="w-4 h-4" />
            Đặt món khách hàng (QR)
          </a>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

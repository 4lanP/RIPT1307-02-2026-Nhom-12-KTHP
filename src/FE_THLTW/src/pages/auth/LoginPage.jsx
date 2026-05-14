import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UtensilsCrossed, Eye, EyeOff, LogIn, ChefHat } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = [
  { email: 'admin@restaurant.com', role: 'ADMIN', color: 'from-emerald-600 to-emerald-700' },
  { email: 'manager@restaurant.com', role: 'MANAGER', color: 'from-blue-600 to-blue-700' },
  { email: 'cashier@restaurant.com', role: 'CASHIER', color: 'from-teal-600 to-teal-700' },
  { email: 'kitchen@restaurant.com', role: 'KITCHEN', color: 'from-orange-500 to-orange-600' },
  { email: 'waiter@restaurant.com', role: 'WAITER', color: 'from-amber-500 to-amber-600' },
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/50 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-[24px] shadow-sm border border-emerald-100 mb-5">
            <UtensilsCrossed className="w-10 h-10 text-emerald-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">3POS</h1>
          <p className="text-emerald-600 font-medium mt-2 text-sm">Restaurant Management System</p>
        </div>

        {/* Login card */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            Đăng nhập hệ thống
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@restaurant.com"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-[16px] px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all duration-200"
                id="login-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-[16px] px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all duration-200 pr-12"
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 rounded-[16px] transition-all duration-200 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
              id="login-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        {/* Quick login */}
        <div className="mt-8">
          <p className="text-center text-gray-500 text-xs font-medium mb-3 uppercase tracking-wider">Tài khoản demo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map(({ email, role, color }) => (
              <button
                key={email}
                onClick={() => quickLogin(email)}
                className={`
                  px-3 py-2.5 rounded-[12px] text-xs font-semibold text-white shadow-sm
                  bg-gradient-to-r ${color} hover:opacity-90 active:scale-[0.98]
                  transition-all duration-200
                `}
              >
                {role}
              </button>
            ))}
          </div>
          <p className="text-center text-gray-400 text-xs mt-4">Mật khẩu: Password123!</p>
        </div>

        {/* Customer link */}
        <div className="mt-8 text-center">
          <a
            href="/scan"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-[14px] text-sm font-medium hover:bg-gray-50 hover:text-emerald-600 transition-all duration-200 shadow-sm"
          >
            <ChefHat className="w-4 h-4" />
            Trải nghiệm đặt món (Khách hàng)
          </a>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

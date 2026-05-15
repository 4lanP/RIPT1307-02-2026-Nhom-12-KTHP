import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UtensilsCrossed, Eye, EyeOff, LogIn, ChefHat, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = [
  { email: 'admin@restaurant.com', role: 'ADMIN', color: 'from-violet-500 to-purple-600', icon: '👑' },
  { email: 'manager@restaurant.com', role: 'MANAGER', color: 'from-blue-500 to-blue-600', icon: '📊' },
  { email: 'cashier@restaurant.com', role: 'CASHIER', color: 'from-emerald-500 to-teal-600', icon: '💰' },
  { email: 'kitchen@restaurant.com', role: 'KITCHEN', color: 'from-orange-500 to-red-500', icon: '🔥' },
  { email: 'waiter@restaurant.com', role: 'WAITER', color: 'from-amber-400 to-orange-500', icon: '🍽️' },
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans bg-gray-950">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-gray-950 to-gray-950" />
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-blue-500/6 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-[50%] right-[30%] w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] animate-float" style={{ animationDelay: '-1.5s' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[24px] shadow-2xl shadow-emerald-500/25 mb-6 animate-glow">
            <UtensilsCrossed className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">3POS</h1>
          <p className="text-emerald-400/70 font-medium mt-2 text-sm tracking-wide">Restaurant Management System</p>
        </div>

        {/* Login card */}
        <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/10 p-8 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Đăng nhập hệ thống
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@restaurant.com"
                required
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all duration-200"
                id="login-email"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all duration-200 pr-12"
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 mt-1 disabled:opacity-50 disabled:hover:translate-y-0"
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
          <p className="text-center text-gray-500 text-[11px] font-semibold mb-4 uppercase tracking-[0.15em]">Tài khoản demo</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map(({ email, role, color, icon }) => (
              <button
                key={email}
                onClick={() => quickLogin(email)}
                className={`
                  group px-3 py-3 rounded-xl text-xs font-semibold text-white/90 shadow-sm
                  bg-gradient-to-r ${color} hover:shadow-lg hover:-translate-y-0.5
                  active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-1.5
                `}
              >
                <span className="text-sm">{icon}</span>
                {role}
              </button>
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs mt-4 font-medium">Mật khẩu: <code className="text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded">Password123!</code></p>
        </div>

        {/* Customer link */}
        <div className="mt-8 text-center">
          <a
            href="/scan"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/[0.05] border border-white/10 text-gray-400 rounded-xl text-sm font-medium hover:bg-white/[0.08] hover:text-emerald-400 hover:border-emerald-500/20 transition-all duration-200"
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

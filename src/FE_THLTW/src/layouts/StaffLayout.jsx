import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutGrid, Users, UtensilsCrossed, BarChart3, QrCode,
  Table2, Bell, LogOut, ChefHat, Menu, X, Search, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

// Ma trận vai trò theo frontend-handoff.md:
// Staff HTTP: CASHIER, MANAGER, ADMIN → /tables, /requests
// Staff force-close: MANAGER, ADMIN (xử lý trong trang detail)
// Admin HTTP: chỉ ADMIN → /admin/*
const navItems = [
  { to: '/tables', icon: Table2, label: 'Quản lý bàn', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
  { to: '/requests', icon: Bell, label: 'Yêu cầu', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
  { to: '/admin/dashboard', icon: LayoutGrid, label: 'Dashboard', roles: ['ADMIN'] },
  { to: '/admin/reports', icon: BarChart3, label: 'Báo cáo', roles: ['ADMIN'] },
  { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menu', roles: ['ADMIN'] },
  { to: '/admin/users', icon: Users, label: 'Nhân viên', roles: ['ADMIN'] },
  { to: '/admin/tables', icon: Table2, label: 'Quản lý bàn (Admin)', roles: ['ADMIN'] },
  { to: '/admin/qr', icon: QrCode, label: 'Mã QR', roles: ['ADMIN'] },
]

const StaffLayout = () => {
  const { user, logout, isKitchen } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Đã đăng xuất')
    navigate('/login')
  }

  const userNav = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Dark Sidebar ─── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-[280px] flex-shrink-0 flex flex-col
        bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="p-6 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <UtensilsCrossed className="w-5.5 h-5.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight tracking-tight">3POS</h1>
            <p className="text-emerald-400/80 text-[11px] font-medium tracking-wide">Restaurant POS</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-5 px-3.5 space-y-1">
          {userNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'text-gray-500 group-hover:text-gray-300'
                  }`}>
                    <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {isKitchen && (
            <>
              <div className="mx-2 my-3 h-px bg-white/5" />
              <NavLink
                to="/kds"
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium
                  transition-all duration-200 group
                  ${isActive
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'text-gray-400 hover:text-orange-400 hover:bg-orange-500/5'
                  }
                `}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10">
                  <ChefHat className="w-[18px] h-[18px]" strokeWidth={2} />
                </div>
                Kitchen Display
              </NavLink>
            </>
          )}
        </nav>

        {/* Bottom User Section */}
        <div className="p-4 border-t border-white/5">
          {/* User Info */}
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/15">
              {user?.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.full_name}</p>
              <p className="text-emerald-400/70 text-[11px] font-medium">{user?.role}</p>
            </div>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-[68px] bg-white/90 backdrop-blur-xl border-b border-gray-100/80 px-6 lg:px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden md:flex items-center gap-2.5 text-gray-400 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-72 hover:border-gray-200 transition-colors group">
              <Search className="w-4 h-4 group-hover:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-[1.5px] border-white"></span>
            </button>
            <div className="h-7 w-px bg-gray-100"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                <p className="text-[11px] font-medium text-emerald-600">{user?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/15">
                {user?.full_name?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/80 p-5 lg:p-8">
          <div className="max-w-7xl mx-auto h-full page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default StaffLayout

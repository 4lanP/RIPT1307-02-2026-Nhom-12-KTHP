import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutGrid, Users, UtensilsCrossed, BarChart3, QrCode,
  Table2, Bell, LogOut, ChefHat, Menu, X
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/tables', icon: Table2, label: 'Quản lý bàn', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
  { to: '/requests', icon: Bell, label: 'Yêu cầu', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
  { to: '/admin/dashboard', icon: LayoutGrid, label: 'Dashboard', roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/reports', icon: BarChart3, label: 'Báo cáo', roles: ['ADMIN', 'MANAGER'] },
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

  const roleColors = {
    ADMIN: 'from-purple-500 to-purple-700',
    MANAGER: 'from-blue-500 to-blue-700',
    CASHIER: 'from-emerald-500 to-emerald-700',
    WAITER: 'from-orange-500 to-orange-700',
    KITCHEN: 'from-red-500 to-red-700',
  }
  const gradientClass = roleColors[user?.role] || 'from-orange-500 to-orange-700'

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-72 flex-shrink-0 flex flex-col
        bg-gray-900 border-r border-white/10
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg`}>
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Nhà Hàng KTHP</h1>
              <p className="text-gray-500 text-xs">Restaurant Management</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="glass-card p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
              {user?.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.full_name || 'Người dùng'}</p>
              <p className="text-gray-400 text-xs">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {userNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? `bg-gradient-to-r ${gradientClass} text-white shadow-lg`
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {isKitchen && (
            <NavLink
              to="/kds"
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <ChefHat className="w-5 h-5" />
              KDS — Màn hình bếp
            </NavLink>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-gray-900/80 backdrop-blur-xl px-6 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="hidden lg:block">
            <p className="text-gray-400 text-sm">
              Xin chào, <span className="text-white font-medium">{user?.full_name}</span> 👋
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${gradientClass} text-white`}>
              {user?.role}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          <div className="bg-radial-orange min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default StaffLayout

import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { staffApi } from '../lib/api'
import { getStaffSocket } from '../lib/socket'
import {
  LayoutGrid, Users, UtensilsCrossed, BarChart3, QrCode,
  Table2, Bell, LogOut, ChefHat, Menu, X, Search, Landmark
} from 'lucide-react'
import toast from 'react-hot-toast'

// Ma trận vai trò theo frontend-handoff.md:
// Staff HTTP: CASHIER, MANAGER, ADMIN, WAITER -> /tables, /requests
// Staff force-close: MANAGER, ADMIN (xử lý trong trang detail)
// Admin operational HTTP: ADMIN, MANAGER -> dashboard/reports/menu/tables/QR
// Admin user management: chỉ ADMIN -> /admin/users
const navItems = [
  { to: '/tables', icon: Table2, label: 'Sơ đồ bàn', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
  { to: '/requests', icon: Bell, label: 'Yêu cầu', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
  { to: '/admin/dashboard', icon: LayoutGrid, label: 'Dashboard', roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/reports', icon: BarChart3, label: 'Báo cáo', roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menu', roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/users', icon: Users, label: 'Nhân viên', roles: ['ADMIN'] },
  { to: '/admin/tables', icon: Table2, label: 'Cấu hình bàn', roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/qr', icon: QrCode, label: 'Mã QR', roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin/settings', icon: Landmark, label: 'Cài đặt ngân hàng', roles: ['ADMIN'] },
]

const StaffLayout = () => {
  const { user, logout, isKitchen } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeRequestsCount, setActiveRequestsCount] = useState(0)

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      const osc1 = audioCtx.createOscillator()
      const gain1 = audioCtx.createGain()
      osc1.connect(gain1)
      gain1.connect(audioCtx.destination)
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
      osc1.start(audioCtx.currentTime)
      osc1.stop(audioCtx.currentTime + 0.4)

      const osc2 = audioCtx.createOscillator()
      const gain2 = audioCtx.createGain()
      osc2.connect(gain2)
      gain2.connect(audioCtx.destination)
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15) // A5
      gain2.gain.setValueAtTime(0.15, audioCtx.currentTime + 0.15)
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6)
      osc2.start(audioCtx.currentTime + 0.15)
      osc2.stop(audioCtx.currentTime + 0.6)
    } catch (e) {
      console.error('Audio chime failed to play', e)
    }
  }

  useEffect(() => {
    loadRequestsCount()
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return
    const socket = getStaffSocket(accessToken)
    
    const handleNewRequest = () => {
      loadRequestsCount()
    }

    const handleBankTransferRequested = (data: any) => {
      playChime()
      toast.success(
        (t) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-gray-900">💳 Yêu cầu chuyển khoản!</span>
            <span className="text-sm text-gray-600">
              {data.table_name} đang chờ xác nhận số tiền{' '}
              <strong className="text-emerald-600 font-bold">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.amount)}
              </strong>
            </span>
          </div>
        ),
        {
          duration: 8000,
          icon: '🏦',
          style: {
            borderRadius: '20px',
            background: '#ffffff',
            color: '#111827',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e5e7eb',
            padding: '16px'
          }
        }
      )
    }
    
    socket.on('new_request', handleNewRequest)
    socket.on('table:status_update', handleNewRequest)
    socket.on('bank_transfer_requested', handleBankTransferRequested)
    
    const interval = setInterval(loadRequestsCount, 10000)
    
    return () => {
      socket.off('new_request', handleNewRequest)
      socket.off('table:status_update', handleNewRequest)
      socket.off('bank_transfer_requested', handleBankTransferRequested)
      clearInterval(interval)
    }
  }, [])

  const loadRequestsCount = async () => {
    try {
      const res = await staffApi.getRequests()
      setActiveRequestsCount(res.data?.length || 0)
    } catch {
      // ignore
    }
  }

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
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-72 flex-shrink-0 flex flex-col
        bg-white border-r border-gray-100 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-gray-900 font-bold text-lg leading-tight tracking-tight">3POS</h1>
            <p className="text-emerald-600 text-xs font-medium">Restaurant POS</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {userNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-emerald-50 text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Icon className={`w-5 h-5 flex-shrink-0`} strokeWidth={2.5} />
              {label}
            </NavLink>
          ))}

          {isKitchen && (
            <NavLink
              to="/kds"
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium
                transition-all duration-200 mt-4
                ${isActive
                  ? 'bg-orange-50 text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                }
              `}
            >
              <ChefHat className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
              Kitchen Display
            </NavLink>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-[72px] bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden md:flex items-center gap-2 text-gray-400 bg-gray-50/50 px-4 py-2.5 rounded-2xl border border-gray-100 w-80">
              <Search className="w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate('/requests')}
              className="relative p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all active:scale-95"
              title="Xem yêu cầu từ khách hàng"
            >
              <Bell className="w-5.5 h-5.5" />
              {activeRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center px-1 animate-pulse">
                  {activeRequestsCount}
                </span>
              )}
            </button>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                <p className="text-xs font-medium text-emerald-600">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-[14px] bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                {user?.full_name?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default StaffLayout

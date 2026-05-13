import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerApi } from '../../lib/api'
import { formatCurrency, getStatusLabel, getStatusClass } from '../../lib/utils'
import { getCustomerSocket } from '../../lib/socket'
import {
  ShoppingCart, Plus, Minus, Trash2, X, ChevronDown, ChevronUp,
  Flame, Wine, Salad, Bell, CreditCard, CheckCircle, Clock,
  UtensilsCrossed, ArrowLeft
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATIONS = [
  { value: '', label: 'Tất cả', icon: UtensilsCrossed },
  { value: 'GRILL', label: 'Nướng', icon: Flame },
  { value: 'BAR', label: 'Bar', icon: Wine },
  { value: 'COLD', label: 'Lạnh', icon: Salad },
]

const CustomerMenuPage = () => {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [menu, setMenu] = useState([])
  const [orders, setOrders] = useState([])
  const [station, setStation] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [note, setNote] = useState({})

  const sessionToken = sessionStorage.getItem('session_token')

  useEffect(() => {
    if (!sessionToken) {
      navigate('/scan')
      return
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!session) return
    const socket = getCustomerSocket(session.id)
    socket.on('order_status_updated', (data) => {
      toast(`🍽️ Đơn #${data.order_id}: ${getStatusLabel(data.new_status)}`, { icon: '📢' })
      loadOrders()
    })
    socket.on('session_closed', () => {
      toast.success('Phiên của bạn đã kết thúc. Cảm ơn!')
      sessionStorage.clear()
      navigate('/scan')
    })
    return () => {
      socket.off('order_status_updated')
      socket.off('session_closed')
    }
  }, [session])

  useEffect(() => {
    loadMenu()
  }, [station])

  const loadData = async () => {
    try {
      const [sessionRes, ordersRes] = await Promise.all([
        customerApi.getSession(),
        customerApi.getOrders(),
      ])
      setSession(sessionRes.data)
      setOrders(ordersRes.data || [])
    } catch {
      toast.error('Phiên không hợp lệ')
      navigate('/scan')
    } finally {
      setLoading(false)
    }
  }

  const loadMenu = async () => {
    try {
      const params = station ? { station } : {}
      const res = await customerApi.getMenu(params)
      setMenu(res.data || [])
    } catch {
      toast.error('Không tải được menu')
    }
  }

  const loadOrders = async () => {
    try {
      const res = await customerApi.getOrders()
      setOrders(res.data || [])
      const sessionRes = await customerApi.getSession()
      setSession(sessionRes.data)
    } catch { /* ignore */ }
  }

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    toast.success(`Đã thêm ${item.name}`, { duration: 1000 })
  }

  const updateQty = (id, delta) => {
    setCart(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
      return updated.filter(c => c.quantity > 0)
    })
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(c => c.id !== id))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const placeOrder = async () => {
    if (cart.length === 0) return
    setPlacing(true)
    try {
      const sessionRes = await customerApi.getSession()
      const currentSession = sessionRes.data
      await customerApi.createOrder({
        session_version: currentSession.version,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          note: note[item.id] || '',
          options: [],
        })),
      })
      setCart([])
      setNote({})
      setCartOpen(false)
      toast.success('🎉 Đặt món thành công!')
      loadOrders()
    } catch (err) {
      if (err?.message?.includes('409') || err?.status === 409) {
        toast.error('Xung đột phiên, vui lòng thử lại')
        loadData()
      } else {
        toast.error(err?.message || 'Đặt món thất bại')
      }
    } finally {
      setPlacing(false)
    }
  }

  const requestBill = async () => {
    try {
      await customerApi.createRequest('REQUEST_BILL')
      toast.success('Đã gọi nhân viên tính tiền!')
    } catch { toast.error('Không gửi được yêu cầu') }
  }

  const callStaff = async () => {
    try {
      await customerApi.createRequest('CALL_STAFF')
      toast.success('Đã gọi nhân viên!')
    } catch { toast.error('Không gửi được yêu cầu') }
  }

  // Group menu by category
  const grouped = menu.reduce((acc, item) => {
    const cat = item.category_name || 'Khác'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Đang tải menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-white font-bold text-lg">🍽️ Menu</h1>
              <p className="text-gray-400 text-xs">
                {session?.table_name || 'Bàn'} — Tổng: <span className="text-orange-400 font-semibold">{formatCurrency(session?.subtotal || 0)}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={callStaff}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-yellow-400 transition-colors"
                title="Gọi nhân viên"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={() => setOrdersOpen(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-blue-400 transition-colors"
                title="Xem đơn"
              >
                <Clock className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Station filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {STATIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setStation(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${station === value
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu items */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Không có món nào</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="animate-slide-up">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-orange-500 rounded-full inline-block" />
                {category}
              </h2>
              <div className="space-y-3">
                {items.map(item => {
                  const inCart = cart.find(c => c.id === item.id)
                  const isAvailable = item.is_available && (item.daily_quota === null || item.daily_quota > 0)
                  return (
                    <div key={item.id} className={`menu-item-card ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {/* Image placeholder */}
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-700/20 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">
                          {item.station === 'GRILL' ? '🔥' : item.station === 'BAR' ? '🍹' : '🥗'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm leading-tight">{item.name}</h3>
                        {item.description && (
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-orange-400 font-bold">{formatCurrency(item.price)}</span>
                          {isAvailable ? (
                            inCart ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQty(item.id, -1)}
                                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                >
                                  <Minus className="w-3 h-3 text-white" />
                                </button>
                                <span className="text-white font-bold w-5 text-center text-sm">{inCart.quantity}</span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-all shadow-lg shadow-orange-500/30 hover:scale-110 active:scale-95"
                              >
                                <Plus className="w-4 h-4 text-white" />
                              </button>
                            )
                          ) : (
                            <span className="text-red-400 text-xs">Hết món</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 animate-slide-up">
          <button
            onClick={() => setCartOpen(true)}
            className="btn-primary flex items-center gap-3 px-6 py-4 shadow-2xl shadow-orange-500/40 glow-orange"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-600 text-xs font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <span>Giỏ hàng</span>
            <span className="font-bold">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="fixed bottom-6 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={requestBill}
          className="btn-success btn-sm flex items-center gap-1 shadow-lg"
        >
          <CreditCard className="w-4 h-4" />
          Thanh toán
        </button>
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl border border-white/10 max-h-[85vh] flex flex-col animate-slide-in">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-400" />
                Giỏ hàng ({cartCount})
              </h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-orange-400 text-sm font-bold mt-1">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <Minus className="w-3 h-3 text-white" />
                      </button>
                      <span className="text-white font-bold w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center">
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center ml-1">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Ghi chú (không cay, ít đường...)"
                    value={note[item.id] || ''}
                    onChange={e => setNote(n => ({ ...n, [item.id]: e.target.value }))}
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  />
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Tổng tiền</span>
                <span className="text-white font-bold text-xl">{formatCurrency(cartTotal)}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4"
              >
                {placing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {placing ? 'Đang đặt món...' : 'Xác nhận đặt món'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders drawer */}
      {ordersOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOrdersOpen(false)} />
          <div className="relative w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl border border-white/10 max-h-[85vh] flex flex-col animate-slide-in">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Đơn hàng của bạn</h2>
              <button onClick={() => setOrdersOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có đơn hàng</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-semibold text-sm">Đơn #{order.id}</span>
                      <span className={`badge ${getStatusClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {order.items?.map(item => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-gray-400">{item.name} x{item.quantity}</span>
                          <span className={`badge ${getStatusClass(item.status)} text-xs px-1.5 py-0.5`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-5 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Tổng thanh toán</span>
                <span className="text-orange-400 font-bold text-xl">{formatCurrency(session?.subtotal || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerMenuPage

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerApi } from '../../lib/api'
import { formatCurrency, getStatusLabel, getStatusClass } from '../../lib/utils'
import { getCustomerSocket } from '../../lib/socket'
import {
  ShoppingCart, Plus, Minus, Trash2, X, ChevronDown, ChevronUp,
  Flame, Wine, Salad, Bell, CreditCard, CheckCircle, Clock,
  UtensilsCrossed, ArrowLeft, Search, Heart, Star, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATIONS = [
  { value: '', label: 'Tất cả', icon: UtensilsCrossed, color: 'bg-emerald-50 text-emerald-600' },
  { value: 'GRILL', label: 'Món Nướng', icon: Flame, color: 'bg-orange-50 text-orange-600' },
  { value: 'BAR', label: 'Đồ Uống', icon: Wine, color: 'bg-blue-50 text-blue-600' },
  { value: 'COLD', label: 'Khai Vị', icon: Salad, color: 'bg-green-50 text-green-600' },
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
  const [searchTerm, setSearchTerm] = useState('')

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
      toast.success(`Đơn #${data.order_id}: ${getStatusLabel(data.new_status)}`)
      loadOrders()
    })
    socket.on('session_closed', () => {
      toast.success('Cảm ơn quý khách. Hẹn gặp lại!')
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
    toast.success(`Đã thêm ${item.name}`, { duration: 800, position: 'bottom-center' })
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
      toast.success('🎉 3POS đã nhận món!')
      loadOrders()
    } catch (err) {
      if (err?.status === 409) {
        toast.error('Có sự thay đổi, vui lòng thử lại')
        loadData()
      } else {
        toast.error('Đặt món chưa thành công')
      }
    } finally {
      setPlacing(false)
    }
  }

  const requestBill = async () => {
    try {
      await customerApi.createRequest('REQUEST_BILL')
      toast.success('Đã yêu cầu thanh toán!')
    } catch { toast.error('Lỗi yêu cầu') }
  }

  const callStaff = async () => {
    try {
      await customerApi.createRequest('CALL_STAFF')
      toast.success('Nhân viên đang đến!')
    } catch { toast.error('Lỗi yêu cầu') }
  }

  const filteredMenu = menu.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const grouped = filteredMenu.reduce((acc, item) => {
    const cat = item.category_name || 'Món Khác'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-12">
        <div className="relative">
          <div className="w-20 h-20 border-[6px] border-emerald-50 border-t-emerald-500 rounded-full animate-spin" />
          <UtensilsCrossed className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500 opacity-50" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FBF9] text-gray-900 font-sans pb-32 overflow-x-hidden">
      {/* Hero Header */}
      <div className="bg-emerald-600 pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full -ml-10 -mb-10 blur-2xl" />
        
        <div className="max-w-2xl mx-auto flex items-start justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">3POS</h1>
            <div className="flex items-center gap-2 text-emerald-50 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{session?.table_name || 'Bàn Quý Khách'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={callStaff} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <button onClick={() => setOrdersOpen(true)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all relative">
              <Clock className="w-5 h-5" />
              {orders.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-emerald-600" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mt-8 relative z-10">
          <div className="bg-white rounded-[24px] shadow-2xl shadow-emerald-950/20 p-2 flex items-center border border-emerald-100">
            <Search className="w-5 h-5 text-gray-400 ml-4" />
            <input 
              type="text" 
              placeholder="Tìm món ăn..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none px-4 py-3 focus:outline-none text-gray-800 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-0 z-40 bg-[#F9FBF9]/80 backdrop-blur-xl border-b border-gray-100 -mt-8 pt-4 pb-2">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {STATIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStation(s.value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all
                  ${station === s.value 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105' 
                    : 'bg-white text-gray-500 border border-gray-100'}`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-12">
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Search className="w-8 h-8 text-gray-200" />
            </div>
            <p className="text-gray-400 font-bold">Không tìm thấy món ăn</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                  {category}
                </h2>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{items.length} món</span>
              </div>
              
              <div className="grid gap-4">
                {items.map(item => {
                  const inCart = cart.find(c => c.id === item.id)
                  const isAvailable = item.is_available && (item.daily_quota === null || item.daily_quota > 0)
                  return (
                    <div 
                      key={item.id} 
                      className={`bg-white rounded-[32px] p-4 flex gap-5 border border-gray-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group relative ${!isAvailable && 'grayscale opacity-60'}`}
                    >
                      {/* Image */}
                      <div className="w-28 h-28 rounded-[24px] bg-[#F3F7F3] border border-emerald-50 flex items-center justify-center flex-shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                        <span className="text-4xl filter drop-shadow-md">
                          {item.station === 'GRILL' ? '🍖' : item.station === 'BAR' ? '🍹' : '🥗'}
                        </span>
                        {!isAvailable && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Hết món</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 py-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-lg font-black text-gray-900 group-hover:text-emerald-600 transition-colors">{item.name}</h3>
                          <button className="text-gray-200 hover:text-red-400 transition-colors">
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-gray-400 text-xs font-medium line-clamp-2 mb-3 leading-relaxed">
                          {item.description || 'Hương vị tuyệt vời từ những nguyên liệu tươi sạch nhất tại 3POS.'}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex flex-col">
                            <span className="text-emerald-600 font-black text-xl">{formatCurrency(item.price)}</span>
                          </div>
                          
                          {isAvailable && (
                            inCart ? (
                              <div className="flex items-center bg-emerald-50 rounded-full p-1 border border-emerald-100 scale-105 shadow-sm">
                                <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-emerald-600 hover:text-emerald-700 active:scale-90">
                                  <Minus className="w-4 h-4" strokeWidth={3} />
                                </button>
                                <span className="w-8 text-center font-black text-emerald-700 text-sm">{inCart.quantity}</span>
                                <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm text-white hover:bg-emerald-600 active:scale-90">
                                  <Plus className="w-4 h-4" strokeWidth={3} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="w-12 h-12 rounded-[20px] bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:-rotate-12 transition-all active:scale-90"
                              >
                                <Plus className="w-6 h-6" strokeWidth={3} />
                              </button>
                            )
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

      {/* Floating Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pointer-events-none">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 pointer-events-auto">
          {/* Bill Info */}
          <div className="bg-white/90 backdrop-blur-2xl border border-emerald-100 rounded-[28px] px-6 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tạm tính</p>
              <p className="text-lg font-black text-gray-900">{formatCurrency(session?.subtotal || 0)}</p>
            </div>
            <button onClick={requestBill} className="ml-auto w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Button */}
          {cartCount > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="bg-emerald-500 h-[72px] aspect-square rounded-[28px] shadow-[0_20px_40px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center text-white relative animate-[bounce-in_0.5s_ease-out] hover:bg-emerald-600 transition-colors"
            >
              <ShoppingCart className="w-6 h-6 mb-1" strokeWidth={2.5} />
              <span className="text-[10px] font-black">{cartCount} món</span>
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-[3px] border-emerald-500 flex items-center justify-center text-[10px] font-black scale-90">!</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm animate-fade-in" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[80vh] animate-[slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="h-1.5 w-12 bg-gray-200 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
            <div className="px-8 py-6 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-2xl font-black text-gray-900">Giỏ hàng của bạn</h2>
              <button onClick={() => setCartOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {cart.map(item => (
                <div key={item.id} className="group">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[20px] bg-emerald-50 flex items-center justify-center text-2xl border border-emerald-100">
                      {item.station === 'GRILL' ? '🍖' : item.station === 'BAR' ? '🍹' : '🥗'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-black text-gray-900">{item.name}</p>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-emerald-600 font-bold text-sm">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
                      <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 hover:text-emerald-500">
                        <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                      <span className="w-8 text-center font-black text-gray-700 text-xs">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 hover:text-emerald-500">
                        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 relative">
                    <input
                      type="text"
                      placeholder="Ghi chú món ăn..."
                      value={note[item.id] || ''}
                      onChange={e => setNote(n => ({ ...n, [item.id]: e.target.value }))}
                      className="w-full bg-[#F9FBF9] border border-gray-100 rounded-xl px-4 py-2 text-xs text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-gray-50 bg-[#F9FBF9]/50 rounded-b-[40px] space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 font-bold text-sm uppercase tracking-widest">Tổng hóa đơn</span>
                <span className="text-3xl font-black text-emerald-600 tracking-tight">{formatCurrency(cartTotal)}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 text-white font-black py-5 rounded-[24px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95"
              >
                {placing ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" strokeWidth={3} />
                    <span className="text-lg">Xác nhận đặt món</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders History Drawer */}
      {ordersOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm animate-fade-in" onClick={() => setOrdersOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[80vh] animate-[slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="h-1.5 w-12 bg-gray-200 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
            <div className="px-8 py-6 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-2xl font-black text-gray-900">Lịch sử đặt món</h2>
              <button onClick={() => setOrdersOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <Clock className="w-6 h-6 text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-bold">Chưa có món nào được đặt</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-[#F9FBF9] border border-gray-100 rounded-[32px] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đơn số</span>
                        <span className="text-lg font-black text-gray-900">#{order.id}</span>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${getStatusClass(order.status).replace('bg-', 'bg-').replace('text-', 'text-')}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {order.items?.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-600">x{item.quantity}</span>
                            <span className="text-gray-600 font-medium">{item.name}</span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md ${getStatusClass(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-8 border-t border-gray-50 bg-[#F9FBF9]/50 rounded-b-[40px]">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 font-bold text-sm uppercase tracking-widest">Đã gọi món</span>
                <span className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(session?.subtotal || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

export default CustomerMenuPage

import React, { useState, useEffect } from 'react'
import { adminApi, staffApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import {
  LayoutGrid, TrendingUp, Users, Table2, UtensilsCrossed,
  DollarSign, ShoppingBag, RefreshCw, BarChart3, ChevronUp, ChevronDown
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts'
import toast from 'react-hot-toast'

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-6">
      <div className={`w-14 h-14 rounded-[20px] ${color} flex items-center justify-center shadow-lg shadow-emerald-950/5`}>
        <Icon className="w-7 h-7" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend > 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">{label}</p>
    <p className="text-gray-900 font-black text-3xl tracking-tight">{value}</p>
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-xl border border-gray-800 animate-fade-in">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-black">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

const AdminDashboardPage = () => {
  const [revenue, setRevenue] = useState([])
  const [menuReport, setMenuReport] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('day')

  useEffect(() => {
    loadData()
  }, [period])

  const getDateRange = () => {
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    const from = new Date(now)
    if (period === 'day') from.setDate(from.getDate() - 7)
    else if (period === 'week') from.setDate(from.getDate() - 28)
    else from.setMonth(from.getMonth() - 3)
    return { from: from.toISOString().split('T')[0], to }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const { from, to } = getDateRange()
      const [revRes, menuRes, tableRes] = await Promise.all([
        adminApi.getRevenueReport({ from, to, group_by: period }),
        adminApi.getMenuReport(),
        staffApi.getTables(),
      ])
      setRevenue(revRes.data || [])
      setMenuReport((menuRes.data || []).slice(0, 5))
      setTables(tableRes.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.total || 0), 0)
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-gray-400 font-medium mt-1 text-base">Dữ liệu kinh doanh của 3POS.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-[20px] border border-gray-100 flex shadow-sm">
            {['day', 'week', 'month'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2.5 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all
                  ${period === p ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {p === 'day' ? '7 Ngày' : p === 'week' ? '4 Tuần' : '3 Tháng'}
              </button>
            ))}
          </div>
          <button onClick={loadData} className="w-12 h-12 rounded-[20px] bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          icon={DollarSign} 
          label="Tổng Doanh Thu" 
          value={formatCurrency(totalRevenue)} 
          color="bg-emerald-500 text-white" 
          trend={12.5}
        />
        <StatCard 
          icon={Table2} 
          label="Bàn Đang Phục Vụ" 
          value={`${occupiedTables}/${tables.length}`} 
          color="bg-blue-500 text-white" 
          trend={-2.4}
        />
        <StatCard 
          icon={ShoppingBag} 
          label="Bán Chạy Nhất" 
          value={menuReport[0]?.name?.split(' ')[0] || '—'} 
          color="bg-orange-500 text-white" 
        />
        <StatCard 
          icon={Users} 
          label="Tổng Sản Phẩm" 
          value={menuReport.length + '+'} 
          color="bg-purple-500 text-white" 
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Doanh Thu Theo Thời Gian</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Xu hướng tăng trưởng</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                    tickFormatter={v => `${(v / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Top Bán Chạy</h2>
            <BarChart3 className="w-6 h-6 text-gray-200" />
          </div>
          
          <div className="space-y-6">
            {loading ? (
               <div className="space-y-4">
                 {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-2xl animate-pulse" />)}
               </div>
            ) : (
              menuReport.map((item, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 font-black text-xs flex items-center justify-center border border-gray-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">
                        #{i + 1}
                      </div>
                      <span className="text-gray-900 font-bold text-sm truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-gray-400 uppercase">{item.total_quantity} Lượt</span>
                  </div>
                  <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000 group-hover:bg-emerald-600"
                      style={{ width: `${(item.total_quantity / (menuReport[0]?.total_quantity || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button className="w-full mt-8 py-4 bg-[#F9FBF9] text-emerald-600 font-black text-xs uppercase tracking-widest rounded-2xl border border-emerald-50 hover:bg-emerald-50 transition-colors">
            Xem tất cả báo cáo
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage

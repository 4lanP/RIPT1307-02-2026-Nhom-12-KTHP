import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import { BarChart3, Download, Calendar, TrendingUp, UtensilsCrossed, Clock, PieChart as PieIcon, ArrowUpRight, DollarSign, ShoppingBag } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f59e0b']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-xl border border-gray-800 animate-fade-in">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-black">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

const AdminReportsPage = () => {
  const [revenue, setRevenue] = useState([])
  const [menuReport, setMenuReport] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [groupBy, setGroupBy] = useState('day')

  useEffect(() => { loadReports() }, [from, to, groupBy])

  const loadReports = async () => {
    setLoading(true)
    try {
      const [revRes, menuRes] = await Promise.all([
        adminApi.getRevenueReport({ from, to, group_by: groupBy }),
        adminApi.getMenuReport(),
      ])
      setRevenue(revRes.data || [])
      setMenuReport((menuRes.data || []).slice(0, 8))
    } catch { toast.error('Lỗi tải báo cáo') }
    finally { setLoading(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await adminApi.exportReport()
      const url = URL.createObjectURL(new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `beanfarm-report-${from}-to-${to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã xuất báo cáo Excel')
    } catch { toast.error('Xuất báo cáo thất bại') }
    finally { setExporting(false) }
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.total || 0), 0)
  const totalOrders = revenue.reduce((sum, r) => sum + (r.order_count || 0), 0)

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Trung Tâm Báo Cáo</h1>
          <p className="text-gray-400 font-medium mt-1 text-base">Phân tích sâu hiệu quả kinh doanh của hệ thống.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-emerald-500 text-white px-8 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} strokeWidth={3} />
          {exporting ? 'Đang chuẩn bị...' : 'Xuất Dữ Liệu Excel'}
        </button>
      </div>

      {/* Date Filters & Controls */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-auto">
             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
             <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full sm:w-44 bg-[#F9FBF9] border-none rounded-xl pl-12 pr-4 py-3 text-xs font-black text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
          <span className="text-gray-200 font-black hidden sm:block">/</span>
          <div className="relative w-full sm:w-auto">
             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
             <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full sm:w-44 bg-[#F9FBF9] border-none rounded-xl pl-12 pr-4 py-3 text-xs font-black text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
        </div>

        <div className="bg-gray-50 p-1.5 rounded-2xl flex w-full lg:w-auto border border-gray-100">
          {['day', 'week', 'month'].map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`flex-1 lg:flex-none px-8 py-2.5 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all
                ${groupBy === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {g === 'day' ? 'Ngày' : g === 'week' ? 'Tuần' : 'Tháng'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6"><DollarSign className="w-6 h-6" /></div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Doanh thu thời kỳ</p>
           <p className="text-3xl font-black text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><ShoppingBag className="w-6 h-6" /></div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số lượng đơn hàng</p>
           <p className="text-3xl font-black text-gray-900">{totalOrders} <span className="text-gray-400 text-sm font-bold uppercase ml-1">đơn</span></p>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6"><ArrowUpRight className="w-6 h-6" /></div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Trung bình hóa đơn</p>
           <p className="text-3xl font-black text-gray-900">{formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-40"><div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
               <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Biểu Đồ Doanh Thu</h2>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Sự biến động qua thời gian</p>
               </div>
               <TrendingUp className="w-8 h-8 text-emerald-500 opacity-20" />
            </div>
            
            <div className="h-[350px]">
              {revenue.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 font-bold uppercase text-xs tracking-widest bg-[#F9FBF9] rounded-[32px] border border-dashed border-gray-200">Không có dữ liệu trong khoảng này</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Distribution Pie */}
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tỷ Trọng Món Ăn</h2>
                   <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Cơ cấu doanh thu sản phẩm</p>
                </div>
                <PieIcon className="w-8 h-8 text-blue-500 opacity-20" />
             </div>
             
             <div className="h-[300px]">
               {menuReport.length === 0 ? (
                  <div className="h-full flex items-center justify-center">Chưa có dữ liệu</div>
               ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={menuReport} dataKey="total_quantity" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5}>
                      {menuReport.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
               )}
             </div>
             
             <div className="grid grid-cols-2 gap-4 mt-6">
               {menuReport.slice(0, 4).map((item, i) => (
                 <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter truncate">{item.name}</span>
                 </div>
               ))}
             </div>
          </div>

          {/* Ranking List */}
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
               <h2 className="text-2xl font-black text-gray-900 tracking-tight">Bảng Xếp Hạng</h2>
               <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                  <UtensilsCrossed className="w-5 h-5" />
               </div>
            </div>
            
            <div className="space-y-6">
              {menuReport.map((item, idx) => {
                const maxQty = menuReport[0]?.total_quantity || 1
                const pct = ((item.total_quantity || 0) / maxQty) * 100
                return (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-gray-300">0{idx + 1}</span>
                        <span className="text-sm font-black text-gray-900 group-hover:text-emerald-600 transition-colors">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-gray-400">{item.total_quantity} Lượt</span>
                    </div>
                    <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: COLORS[idx % COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReportsPage

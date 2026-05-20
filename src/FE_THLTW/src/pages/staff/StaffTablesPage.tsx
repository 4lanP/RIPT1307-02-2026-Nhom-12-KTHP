import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { staffApi } from '../../lib/api'
import { getStaffSocket } from '../../lib/socket'
import { formatCurrency, getStatusLabel, getStatusClass } from '../../lib/utils'
import { Table2, Users, RefreshCw, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const TableCard = ({ table }) => {
  const isOccupied = table.status === 'OCCUPIED'
  return (
    <Link
      to={`/tables/${table.id}`}
      className={`bg-white border rounded-[24px] p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer block ${
        isOccupied
          ? 'border-emerald-200 shadow-sm shadow-emerald-500/5 hover:border-emerald-300'
          : 'border-gray-100 hover:border-gray-200 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
          isOccupied ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
        }`}>
          <Table2 className="w-6 h-6" strokeWidth={2} />
        </div>
        <span className={`badge ${getStatusClass(table.status)}`}>
          {getStatusLabel(table.status)}
        </span>
      </div>
      <h3 className="text-gray-900 font-bold text-lg mb-1">{table.name}</h3>
      {table.capacity && (
        <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
          <Users className="w-4 h-4" />
          <span>{table.capacity} chỗ</span>
        </div>
      )}
      {isOccupied && table.subtotal != null && (
        <div className="mt-4 pt-4 border-t border-gray-50">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Tổng tiền</p>
          <p className="text-emerald-600 font-bold text-lg">{formatCurrency(table.subtotal)}</p>
        </div>
      )}
    </Link>
  )
}

const StaffTablesPage = () => {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    loadTables()
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return
    const socket = getStaffSocket(accessToken)
    socket.on('table:status_update', () => loadTables())
    socket.on('new_request', () => toast('🔔 Yêu cầu mới từ khách!', { icon: '📢' }))
    return () => {
      socket.off('table:status_update')
      socket.off('new_request')
    }
  }, [])

  const loadTables = async () => {
    try {
      const res = await staffApi.getTables()
      setTables(res.data || [])
    } catch { toast.error('Không tải được danh sách bàn') }
    finally { setLoading(false) }
  }

  const filtered = tables
    .filter(t => filter === 'ALL' || t.status === filter)
    .filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))

  const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length
  const availableCount = tables.filter(t => t.status === 'AVAILABLE').length

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sơ đồ bàn</h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">{occupiedCount}</span> bàn đang phục vụ ·{' '}
            <span className="text-gray-600 font-bold bg-gray-100 px-2 py-0.5 rounded-md">{availableCount}</span> bàn trống
          </p>
        </div>
        <button
          onClick={loadTables}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 hover:text-emerald-600 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm bàn..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'OCCUPIED', 'AVAILABLE'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {f === 'ALL' ? 'Tất cả' : f === 'OCCUPIED' ? 'Đang phục vụ' : 'Trống'}
            </button>
          ))}
        </div>
      </div>

      {/* Tables grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-[24px] p-5 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 mb-4" />
              <div className="h-5 bg-gray-100 rounded-md w-2/3 mb-2" />
              <div className="h-4 bg-gray-50 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-[32px]">
          <Table2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">Không tìm thấy bàn phù hợp</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map(table => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      )}
    </div>
  )
}

export default StaffTablesPage

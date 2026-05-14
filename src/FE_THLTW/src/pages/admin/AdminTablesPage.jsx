import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { getStatusLabel, getStatusClass } from '../../lib/utils'
import { Table2, Plus, Edit2, Trash2, X, Check, Users, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const defaultForm = { name: '', capacity: 4 }

const AdminTablesPage = () => {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTable, setEditTable] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTables() }, [])

  const loadTables = async () => {
    try {
      const res = await adminApi.getTables()
      setTables(res.data || [])
    } catch { toast.error('Lỗi tải danh sách bàn') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditTable(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (table) => {
    setEditTable(table)
    setForm({ name: table.name, capacity: table.capacity || 4 })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editTable) {
        await adminApi.updateTable(editTable.id, form)
        toast.success('Đã cập nhật cấu hình bàn')
      } else {
        await adminApi.createTable(form)
        toast.success('Đã thêm bàn mới vào hệ thống')
      }
      setModalOpen(false)
      loadTables()
    } catch (err) { toast.error('Lỗi lưu dữ liệu') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xác nhận xóa bàn này?')) return
    try {
      await adminApi.deleteTable(id)
      setTables(prev => prev.filter(t => t.id !== id))
      toast.success('Đã xóa bàn')
    } catch { toast.error('Lỗi xóa bàn (có thể đang có khách)') }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Sơ Đồ Bàn Ăn</h1>
          <p className="text-gray-400 font-medium mt-1 text-base">Quản lý không gian và sức chứa chỗ ngồi của 3POS.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={loadTables} className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
             <RefreshCw className="w-6 h-6" />
           </button>
           <button 
             onClick={openCreate} 
             className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200"
           >
             <Plus className="w-4 h-4" strokeWidth={3} />
             Thêm bàn mới
           </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {loading ? (
          [...Array(10)].map((_, i) => <div key={i} className="bg-white rounded-[28px] p-8 h-48 border border-gray-100 animate-pulse shadow-sm" />)
        ) : tables.length === 0 ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center opacity-40">
             <Table2 className="w-24 h-24 mb-6" />
             <p className="text-2xl font-bold uppercase tracking-widest text-gray-900">Không gian chưa có bàn</p>
          </div>
        ) : (
          tables.map(table => {
            const isOccupied = table.status === 'OCCUPIED'
            return (
              <div key={table.id} className="bg-white rounded-[28px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => openEdit(table)} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(table.id)} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 transition-colors shadow-inner ${
                  isOccupied ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'
                }`}>
                  <Table2 className="w-8 h-8" strokeWidth={2.5} />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">{table.name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                       <Users className="w-3.5 h-3.5" />
                       {table.capacity} ghế
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${getStatusClass(table.status)}`}>
                      {getStatusLabel(table.status)}
                    </span>
                  </div>
                </div>

                <div className={`absolute bottom-0 left-0 w-full h-1.5 ${isOccupied ? 'bg-orange-500' : 'bg-emerald-500'}`} />
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-md animate-[bounce-in_0.4s_ease-out] overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{editTable ? 'Sửa Cấu Hình Bàn' : 'Thêm Bàn Ăn'}</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Quản lý thông tin không gian</p>
               </div>
               <button onClick={() => setModalOpen(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all">
                  <X className="w-5 h-5" strokeWidth={3} />
               </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Tên hoặc số hiệu bàn</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="Ví dụ: Bàn VIP 01" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Số lượng khách tối đa</label>
                <div className="relative">
                  <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" min="1" max="20" />
                </div>
              </div>

              <div className="bg-emerald-50 p-6 rounded-[24px] border border-emerald-100 flex items-start gap-4 text-emerald-700">
                 <Table2 className="w-10 h-10 flex-shrink-0" />
                 <p className="text-xs font-bold leading-relaxed">Thông tin bàn sẽ được hiển thị trên sơ đồ nhân viên và cho phép khách hàng quét QR để đặt món.</p>
              </div>
            </div>

            <div className="px-10 py-8 bg-gray-50 flex gap-4">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {saving ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : editTable ? 'Cập Nhật Bàn' : 'Khởi Tạo Bàn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTablesPage

import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { QrCode, Plus, Trash2, ToggleLeft, ToggleRight, X, Check, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const AdminQRPage = () => {
  const [qrCodes, setQrCodes] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ table_id: '', code: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    try {
      const [qrRes, tableRes] = await Promise.all([
        adminApi.getQRCodes(),
        adminApi.getTables(),
      ])
      setQrCodes(qrRes.data || [])
      setTables(tableRes.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const tableId = parseInt(form.table_id)
      const table = tables.find(t => t.id === tableId)
      const code = form.code || `BF-${table?.name?.replace(/\s/g, '-') || 'TABLE'}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      await adminApi.createQRCode({ table_id: tableId, code })
      toast.success('Mã QR đã được thiết lập thành công')
      setModalOpen(false)
      loadAll()
    } catch (err) { toast.error('Lỗi thiết lập mã') }
    finally { setSaving(false) }
  }

  const handleToggle = async (id) => {
    try {
      await adminApi.toggleQRCode(id)
      setQrCodes(prev => prev.map(q => q.id === id ? { ...q, is_active: !q.is_active } : q))
      toast.success('Đã cập nhật trạng thái')
    } catch { toast.error('Lỗi cập nhật') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xác nhận xóa mã QR này?')) return
    try {
      await adminApi.deleteQRCode(id)
      setQrCodes(prev => prev.filter(q => q.id !== id))
      toast.success('Đã xóa vĩnh viễn')
    } catch { toast.error('Lỗi xóa') }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Đã lưu mã vào bộ nhớ tạm')
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Cấu Hình Mã QR</h1>
          <p className="text-gray-400 font-medium mt-1 text-base">Quản lý các điểm truy cập thực đơn tự động tại bàn.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={loadAll} className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
             <RefreshCw className="w-6 h-6" />
           </button>
           <button 
             onClick={() => { setForm({ table_id: tables[0]?.id || '', code: '' }); setModalOpen(true) }} 
             className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200"
           >
             <Plus className="w-4 h-4" strokeWidth={3} />
             Tạo mã QR mới
           </button>
        </div>
      </div>

      {/* QR Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-[28px] p-8 h-64 border border-gray-100 animate-pulse shadow-sm" />)
        ) : qrCodes.length === 0 ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center opacity-40">
             <QrCode className="w-24 h-24 mb-6" />
             <p className="text-2xl font-bold uppercase tracking-widest text-gray-900">Chưa có mã QR nào</p>
          </div>
        ) : (
          qrCodes.map(qr => (
            <div key={qr.id} className={`bg-white rounded-[28px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group ${!qr.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-8">
                <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-[28px] flex items-center justify-center text-gray-900 shadow-inner group-hover:bg-emerald-50 group-hover:border-emerald-100 group-hover:text-emerald-500 transition-colors">
                  <QrCode className="w-10 h-10" />
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleToggle(qr.id)} 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${qr.is_active ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {qr.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button 
                    onClick={() => handleDelete(qr.id)} 
                    className="w-10 h-10 bg-red-50 text-red-500 border border-red-100 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                   <h3 className="text-xl font-bold text-gray-900 tracking-tight">{qr.table_name || `Bàn ${qr.table_id}`}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${qr.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{qr.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}</span>
                   </div>
                </div>

                <div className="bg-[#F9FBF9] rounded-2xl p-4 border border-gray-50 flex items-center justify-between group/code">
                   <code className="text-xs font-mono font-bold text-gray-500 truncate mr-4">{qr.code}</code>
                   <button onClick={() => copyCode(qr.code)} className="text-gray-300 hover:text-emerald-500 transition-colors">
                      <Copy className="w-4 h-4" />
                   </button>
                </div>

                <button className="w-full py-3 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 rounded-xl border border-gray-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all flex items-center justify-center gap-2">
                   <ExternalLink className="w-3 h-3" />
                   Xem chi tiết đơn bàn
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-md animate-[bounce-in_0.4s_ease-out] overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Tạo Mã QR Mới</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gán thực đơn cho bàn ăn</p>
               </div>
               <button onClick={() => setModalOpen(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all">
                  <X className="w-5 h-5" strokeWidth={3} />
               </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Lựa chọn bàn ăn</label>
                <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none">
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Mã định danh (tùy chọn)</label>
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-mono font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="BF-TABLE-XXX" />
              </div>
              
              <div className="bg-emerald-50 p-6 rounded-[24px] border border-emerald-100 text-emerald-700">
                 <div className="flex items-start gap-4">
                    <QrCode className="w-10 h-10 flex-shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">Khi tạo mã, khách hàng có thể dùng điện thoại quét mã tại bàn để truy cập thực đơn và đặt món trực tiếp.</p>
                 </div>
              </div>
            </div>

            <div className="px-10 py-8 bg-gray-50 flex gap-4">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                Hủy bỏ
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.table_id}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {saving ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : 'Xác Nhận Tạo Mã'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminQRPage

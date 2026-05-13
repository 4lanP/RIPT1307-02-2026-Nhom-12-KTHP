import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { QrCode, Plus, Trash2, ToggleLeft, ToggleRight, X, Check, Copy } from 'lucide-react'
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
    } catch { toast.error('Không tải được') }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const tableId = parseInt(form.table_id)
      const table = tables.find(t => t.id === tableId)
      const code = form.code || `QR-${table?.name?.replace(/\s/g, '-') || 'Bàn'}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      await adminApi.createQRCode({ table_id: tableId, code })
      toast.success('Đã tạo mã QR')
      setModalOpen(false)
      loadAll()
    } catch (err) { toast.error(err?.message || 'Lỗi') }
    finally { setSaving(false) }
  }

  const handleToggle = async (id) => {
    try {
      await adminApi.toggleQRCode(id)
      setQrCodes(prev => prev.map(q => q.id === id ? { ...q, is_active: !q.is_active } : q))
      toast.success('Đã cập nhật trạng thái')
    } catch { toast.error('Lỗi') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa mã QR này?')) return
    try {
      await adminApi.deleteQRCode(id)
      setQrCodes(prev => prev.filter(q => q.id !== id))
      toast.success('Đã xóa mã QR')
    } catch { toast.error('Không thể xóa') }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Đã copy mã QR')
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0 flex items-center gap-2">
          <QrCode className="w-6 h-6 text-orange-400" />
          Quản lý mã QR
        </h1>
        <button onClick={() => { setForm({ table_id: tables[0]?.id || '', code: '' }); setModalOpen(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tạo mã QR
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => <div key={i} className="glass-card p-6 animate-pulse h-40" />)
          : qrCodes.map(qr => (
              <div key={qr.id} className={`glass-card p-5 transition-all ${!qr.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center">
                    <QrCode className="w-9 h-9 text-gray-900" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggle(qr.id)} className={`p-1.5 rounded-lg transition-colors ${qr.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {qr.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleDelete(qr.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-white font-bold mb-1">{qr.table_name || `Bàn ${qr.table_id}`}</p>
                <div className="flex items-center gap-2">
                  <code className="text-gray-400 text-xs bg-white/5 px-2 py-1 rounded font-mono truncate flex-1">{qr.code}</code>
                  <button onClick={() => copyCode(qr.code)} className="p-1.5 rounded text-gray-500 hover:text-white transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className={`badge mt-3 ${qr.is_active ? 'badge-ready' : 'badge-cancelled'}`}>
                  {qr.is_active ? 'Kích hoạt' : 'Vô hiệu'}
                </span>
              </div>
            ))
        }
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative glass-card p-6 w-full max-w-sm animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Tạo mã QR</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Bàn *</label>
                <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))} className="input-field">
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Mã QR (để trống để tự tạo)</label>
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field font-mono" placeholder="QR-Bàn-01-XXXX" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Hủy</button>
              <button onClick={handleCreate} disabled={saving || !form.table_id} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Tạo QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminQRPage

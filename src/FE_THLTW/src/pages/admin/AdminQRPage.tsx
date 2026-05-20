import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import ModalPortal from '../../components/ModalPortal'
import { QrCode, Plus, Trash2, ToggleLeft, ToggleRight, X, Copy, ExternalLink, RefreshCw, Download, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

const TableQRCode = ({ code, className }) => {
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    let active = true
    const scanUrl = `${window.location.origin}/scan?qr=${encodeURIComponent(code)}`
    
    import('qrcode').then(QRCode => {
      QRCode.default.toDataURL(scanUrl, {
        width: 300,
        margin: 1,
        color: {
          dark: '#10b981', // emerald-500
          light: '#ffffff'
        }
      })
      .then(url => {
        if (active) setQrUrl(url)
      })
      .catch(err => console.error('Failed to generate QR:', err))
    })

    return () => {
      active = false
    }
  }, [code])

  if (!qrUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-100 rounded-[20px] animate-pulse">
        <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
      </div>
    )
  }

  return (
    <img src={qrUrl} alt="Table QR Code" className={className} />
  )
}

const AdminQRPage = () => {
  const [qrCodes, setQrCodes] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedQR, setSelectedQR] = useState(null)
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
    const tableId = Number(form.table_id)
    if (!Number.isInteger(tableId) || tableId <= 0) {
      toast.error('Vui lòng chọn bàn để tạo mã QR')
      return
    }

    setSaving(true)
    try {
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

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Đã lưu mã vào bộ nhớ tạm')
    } catch {
      toast.error('Không thể sao chép mã')
    }
  }

  const downloadHighResQR = (qr) => {
    const scanUrl = `${window.location.origin}/scan?qr=${encodeURIComponent(qr.code)}`
    import('qrcode').then(QRCode => {
      QRCode.default.toDataURL(scanUrl, {
        width: 1200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(url => {
        const link = document.createElement('a')
        link.download = `3POS-QR-${qr.table_name?.replace(/\s/g, '-') || 'Table'}-${qr.code}.png`
        link.href = url
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Đã tải xuống QR độ phân giải cao để in ấn!')
      })
      .catch(() => toast.error('Không thể tải xuống mã QR'))
    })
  }

  const printPlacard = (qr) => {
    const scanUrl = `${window.location.origin}/scan?qr=${encodeURIComponent(qr.code)}`
    import('qrcode').then(QRCode => {
      QRCode.default.toDataURL(scanUrl, {
        width: 600,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(qrUrl => {
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
          <html>
            <head>
              <title>Placard Bàn - ${qr.table_name || 'Bàn ' + qr.table_id}</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #ffffff;
                  color: #111827;
                }
                .placard {
                  border: 6px solid #10b981;
                  border-radius: 40px;
                  padding: 50px;
                  text-align: center;
                  max-width: 450px;
                  box-shadow: 0 20px 50px rgba(0,0,0,0.05);
                }
                .logo {
                  font-size: 42px;
                  font-weight: 900;
                  color: #10b981;
                  margin-bottom: 5px;
                  letter-spacing: 0.05em;
                }
                .tagline {
                  font-size: 13px;
                  color: #4b5563;
                  text-transform: uppercase;
                  letter-spacing: 0.2em;
                  margin-bottom: 35px;
                  font-weight: 800;
                }
                .qr-container {
                  background: #f9fafb;
                  padding: 24px;
                  border-radius: 32px;
                  border: 2px dashed #e5e7eb;
                  display: inline-block;
                  margin-bottom: 35px;
                }
                .qr-image {
                  width: 280px;
                  height: 280px;
                  display: block;
                }
                .instruction {
                  font-size: 18px;
                  font-weight: 900;
                  letter-spacing: 0.1em;
                  margin-bottom: 8px;
                  text-transform: uppercase;
                  color: #111827;
                }
                .sub-instruction {
                  font-size: 12px;
                  color: #6b7280;
                  margin-bottom: 30px;
                  font-weight: 500;
                }
                .table-badge {
                  background: #111827;
                  color: #ffffff;
                  font-size: 28px;
                  font-weight: 900;
                  padding: 14px 40px;
                  border-radius: 20px;
                  display: inline-block;
                  letter-spacing: 0.05em;
                }
                @media print {
                  body { height: auto; }
                  .placard { border: 4px solid #000000; box-shadow: none; }
                  .table-badge { background: #000000; }
                }
              </style>
            </head>
            <body>
              <div class="placard">
                <div class="logo">3POS</div>
                <div class="tagline">Hệ Thống Đặt Món Tại Bàn</div>
                <div class="qr-container">
                  <img class="qr-image" src="${qrUrl}" alt="QR" />
                </div>
                <div class="instruction">QUÉT MÃ ĐỂ ĐẶT MÓN</div>
                <div class="sub-instruction">Sử dụng camera điện thoại để quét mã QR và chọn món</div>
                <div class="table-badge">${(qr.table_name || 'Bàn ' + qr.table_id).toUpperCase()}</div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      })
      .catch(() => toast.error('Không thể khởi tạo bản in'))
    })
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Cấu Hình Mã QR</h1>
          <p className="text-gray-400 font-medium mt-1 text-base">Quản lý các điểm truy cập thực đơn tự động tại bàn.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={loadAll} className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
             <RefreshCw className="w-6 h-6" />
           </button>
           <button 
             onClick={() => { setForm({ table_id: tables[0]?.id || '', code: '' }); setModalOpen(true) }} 
             disabled={tables.length === 0}
             className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Plus className="w-4 h-4" strokeWidth={3} />
             Tạo mã QR mới
           </button>
        </div>
      </div>

      {/* QR Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-[40px] p-8 h-64 border border-gray-100 animate-pulse shadow-sm" />)
        ) : qrCodes.length === 0 ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center opacity-40">
             <QrCode className="w-24 h-24 mb-6" />
             <p className="text-2xl font-black uppercase tracking-widest text-gray-900">Chưa có mã QR nào</p>
          </div>
        ) : (
          qrCodes.map(qr => (
            <div key={qr.id} className={`bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group ${!qr.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-8">
                <div 
                  onClick={() => setSelectedQR(qr)}
                  className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-[28px] flex items-center justify-center text-gray-900 shadow-inner group-hover:bg-emerald-50 group-hover:border-emerald-100 group-hover:text-emerald-500 transition-all cursor-pointer overflow-hidden p-1.5 active:scale-95 hover:rotate-2 shadow-sm"
                  title="Click để xem chi tiết & in ấn"
                >
                  <TableQRCode code={qr.code} className="w-full h-full object-contain rounded-2xl" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleToggle(qr.id)} 
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${qr.is_active ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}
                      title={qr.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    >
                      {qr.is_active ? <ToggleRight className="w-5.5 h-5.5" /> : <ToggleLeft className="w-5.5 h-5.5" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(qr.id)} 
                      className="w-9 h-9 bg-red-50 text-red-500 border border-red-100 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      title="Xóa mã"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => downloadHighResQR(qr)} 
                      className="w-9 h-9 bg-gray-50 text-gray-500 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-100 transition-all shadow-sm"
                      title="Tải ảnh QR"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => printPlacard(qr)} 
                      className="w-9 h-9 bg-gray-50 text-gray-500 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-100 transition-all shadow-sm"
                      title="In thẻ đặt bàn"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                   <h3 className="text-xl font-black text-gray-900 tracking-tight">{qr.table_name || `Bàn ${qr.table_id}`}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${qr.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{qr.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}</span>
                   </div>
                </div>

                <div className="bg-[#F9FBF9] rounded-2xl p-4 border border-gray-50 flex items-center justify-between group/code">
                   <code className="text-xs font-mono font-bold text-gray-500 truncate mr-4">{qr.code}</code>
                   <button onClick={() => copyCode(qr.code)} className="text-gray-300 hover:text-emerald-500 transition-colors">
                      <Copy className="w-4 h-4" />
                   </button>
                </div>

                <button className="w-full py-3 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 rounded-xl border border-gray-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all flex items-center justify-center gap-2">
                   <ExternalLink className="w-3 h-3" />
                   Xem chi tiết đơn bàn
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal tạo mới */}
      {modalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md animate-[bounce-in_0.4s_ease-out] overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Tạo Mã QR Mới</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gán thực đơn cho bàn ăn</p>
               </div>
               <button onClick={() => setModalOpen(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all">
                  <X className="w-5 h-5" strokeWidth={3} />
               </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Lựa chọn bàn ăn</label>
                <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none">
                  <option value="" disabled>Chọn bàn</option>
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mã định danh (tùy chọn)</label>
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-mono font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="BF-TABLE-XXX" />
              </div>
              
              <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 text-emerald-700">
                 <div className="flex items-start gap-4">
                    <QrCode className="w-10 h-10 flex-shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">Khi tạo mã, khách hàng có thể dùng điện thoại quét mã tại bàn để truy cập thực đơn và đặt món trực tiếp.</p>
                 </div>
              </div>
            </div>

            <div className="px-10 py-8 bg-gray-50 flex gap-4">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                Hủy bỏ
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.table_id}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {saving ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : 'Xác Nhận Tạo Mã'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Placard Preview Modal */}
      {selectedQR && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSelectedQR(null)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-sm animate-[bounce-in_0.4s_ease-out] overflow-hidden flex flex-col">
            <div className="px-10 py-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Chi Tiết Thẻ QR</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Xem trước placard in ấn</p>
              </div>
              <button onClick={() => setSelectedQR(null)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all">
                <X className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center bg-gray-50/50">
              {/* Premium Print Preview placard */}
              <div className="bg-white border-4 border-emerald-500 rounded-[36px] p-8 text-center w-full max-w-[280px] shadow-xl relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-50 rounded-full blur-2xl opacity-70" />
                <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-emerald-50 rounded-full blur-2xl opacity-70" />
                
                <h4 className="text-3xl font-black text-emerald-500 tracking-wider mb-0.5">3POS</h4>
                <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 uppercase mb-6">Hệ thống đặt món tại bàn</p>
                
                <div className="bg-gray-50 p-4 border-2 border-dashed border-gray-200 rounded-[28px] inline-block mb-6 shadow-inner">
                  <div className="w-40 h-40 bg-white p-2 rounded-2xl flex items-center justify-center">
                    <TableQRCode code={selectedQR.code} className="w-full h-full object-contain rounded-lg" />
                  </div>
                </div>
                
                <h5 className="text-xs font-black tracking-widest text-gray-900 uppercase mb-1">QUÉT MÃ ĐỂ ĐẶT MÓN</h5>
                <p className="text-[9px] text-gray-400 font-medium px-2 mb-6 leading-relaxed">Sử dụng camera điện thoại để quét mã QR và chọn món trực tiếp</p>
                
                <div className="bg-gray-900 text-white text-base font-black uppercase px-6 py-2.5 rounded-2xl tracking-widest inline-block shadow-lg shadow-gray-900/20">
                  {selectedQR.table_name || `Bàn ${selectedQR.table_id}`}
                </div>
              </div>
            </div>

            <div className="px-10 py-6 bg-gray-50 flex gap-4">
              <button 
                onClick={() => printPlacard(selectedQR)}
                className="flex-1 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-gray-900/10"
              >
                <Printer className="w-4 h-4" />
                In Thẻ
              </button>
              <button
                onClick={() => downloadHighResQR(selectedQR)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-500/15"
              >
                <Download className="w-4 h-4" />
                Tải Ảnh (PNG)
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}

export default AdminQRPage

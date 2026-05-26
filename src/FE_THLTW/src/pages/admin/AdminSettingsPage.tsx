import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { Landmark, CreditCard, User, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const POPULAR_BANKS = [
  { id: 'MB', name: 'MBBank (Ngân hàng Quân Đội)' },
  { id: 'TCB', name: 'Techcombank (Ngân hàng Kỹ Thương)' },
  { id: 'VCB', name: 'Vietcombank (Ngân hàng Ngoại Thương)' },
  { id: 'CTG', name: 'VietinBank (Ngân hàng Công Thương)' },
  { id: 'BIDV', name: 'BIDV (Ngân hàng Đầu tư và Phát triển)' },
  { id: 'ACB', name: 'ACB (Ngân hàng Á Châu)' },
  { id: 'TPB', name: 'TPBank (Ngân hàng Tiên Phong)' },
  { id: 'VPB', name: 'VPBank (Ngân hàng Thịnh Vượng)' },
]

const AdminSettingsPage = () => {
  const [form, setForm] = useState({
    bank_id: '',
    account_number: '',
    account_owner: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBankConfig()
  }, [])

  const loadBankConfig = async () => {
    try {
      const res = await adminApi.getBankConfig()
      if (res.data) {
        setForm({
          bank_id: res.data.bank_id || '',
          account_number: res.data.account_number || '',
          account_owner: res.data.account_owner || '',
        })
      }
    } catch (err) {
      toast.error('Lỗi tải cấu hình ngân hàng')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bank_id) {
      toast.error('Vui lòng chọn ngân hàng')
      return
    }
    if (!form.account_number.trim()) {
      toast.error('Vui lòng nhập số tài khoản')
      return
    }
    if (!/^[A-Za-z0-9]+$/.test(form.account_number)) {
      toast.error('Số tài khoản chỉ được chứa chữ số và chữ cái')
      return
    }
    if (!form.account_owner.trim()) {
      toast.error('Vui lòng nhập tên chủ tài khoản')
      return
    }

    setSaving(true)
    try {
      const res = await adminApi.saveBankConfig({
        bank_id: form.bank_id,
        account_number: form.account_number.trim(),
        account_owner: form.account_owner.trim().toUpperCase(),
      })
      toast.success('Đã lưu cấu hình tài khoản thành công!')
      if (res.data) {
        setForm({
          bank_id: res.data.bank_id || '',
          account_number: res.data.account_number || '',
          account_owner: res.data.account_owner || '',
        })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu cấu hình')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-[5px] border-emerald-50 border-t-emerald-500 rounded-full animate-spin" />
          <Landmark className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 opacity-60 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Cài Đặt Ngân Hàng</h1>
        <p className="text-gray-400 font-medium mt-1 text-base">Thiết lập tài khoản nhận tiền chuyển khoản và tạo mã VietQR động tự động cho khách hàng.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form Settings */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm space-y-8">
          <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Tài khoản nhận tiền</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">VietQR Napas Transfer</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Bank Select */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Lựa chọn Ngân hàng</label>
              <div className="relative">
                <select
                  value={form.bank_id}
                  onChange={(e) => setForm({ ...form, bank_id: e.target.value })}
                  className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none outline-none"
                >
                  <option value="" disabled>Chọn ngân hàng thụ hưởng</option>
                  {POPULAR_BANKS.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Account Number STK */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Số tài khoản (STK)</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/[^A-Za-z0-9]/g, '') })}
                  placeholder="Nhập số tài khoản ngân hàng..."
                  className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all outline-none"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Account Owner Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tên chủ tài khoản (Viết hoa không dấu)</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.account_owner}
                  onChange={(e) => setForm({ ...form, account_owner: e.target.value.toUpperCase() })}
                  placeholder="NGUYEN VAN A"
                  className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-black text-gray-900 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all outline-none"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={loadBankConfig}
                className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                title="Khôi phục ban đầu"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white font-black text-xs uppercase tracking-widest py-4.5 rounded-2xl shadow-lg shadow-gray-200 hover:bg-black transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Lưu cấu hình ngân hàng
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Sidebar */}
        <div className="space-y-6">
          {/* VietQR Status Card */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-[36px] p-8 text-emerald-800 space-y-6 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-emerald-900">Trạng thái VietQR</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-0.5">Dynamic QR Code</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed font-bold">
              {form.bank_id && form.account_number && form.account_owner ? (
                'Hệ thống VietQR đang hoạt động hoàn hảo. Tất cả hóa đơn khi thanh toán qua chuyển khoản sẽ tự động tạo QR chứa đúng STK và số tiền.'
              ) : (
                'VietQR hiện chưa kích hoạt. Vui lòng thiết lập đầy đủ 3 trường thông tin ở bên trái để khách hàng có thể quét mã chuyển khoản.'
              )}
            </p>

            <div className="bg-white/80 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-500">Cổng thanh toán:</span>
              <span className="font-black text-emerald-700 uppercase">VietQR (Miễn phí)</span>
            </div>
          </div>

          {/* Quick Info Checklist Card */}
          <div className="bg-white border border-gray-100 rounded-[36px] p-8 space-y-6 shadow-sm">
            <h4 className="font-black text-sm text-gray-900 uppercase tracking-wider">Lưu ý quan trọng</h4>
            <ul className="space-y-3.5 text-xs text-gray-500 font-medium">
              <li className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong>Tên chủ tài khoản:</strong> Viết hoa không dấu để cổng Napas nhận dạng chính xác nhất (ví dụ: NGUYEN VAN A).</span>
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong>Kiểm tra STK:</strong> Hãy nhập đúng chính xác STK ngân hàng của anh/chị để tránh thất thoát tài chính.</span>
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong>Đối soát thủ công:</strong> Sau khi khách bấm "Tôi đã chuyển khoản", nhân viên cần tự đối soát số dư trên điện thoại trước khi bấm duyệt.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSettingsPage

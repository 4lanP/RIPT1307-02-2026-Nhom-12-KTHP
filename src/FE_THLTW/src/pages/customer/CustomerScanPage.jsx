import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerApi } from '../../lib/api'
import { QrCode, Scan, ArrowRight, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'

const CustomerScanPage = () => {
  const navigate = useNavigate()
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleScan = async (e) => {
    e.preventDefault()
    if (!qrCode.trim()) return
    setLoading(true)
    try {
      const res = await customerApi.scan(qrCode.trim())
      const sessionToken = res.data.session_token
      sessionStorage.setItem('session_token', sessionToken)
      toast.success('Quét QR thành công! Đang tải menu...')
      navigate('/menu')
    } catch (err) {
      const msg = err?.message || 'Mã QR không hợp lệ hoặc bàn đang có khách'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Demo QR codes
  const demoQRs = [
    'QR-Bàn-01-ABC123',
    'QR-Bàn-02-DEF456',
    'QR-Bàn-03-GHI789',
  ]

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 via-transparent to-gray-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-700 rounded-3xl shadow-2xl shadow-orange-500/40 mb-6">
            <UtensilsCrossed className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Nhà Hàng KTHP</h1>
          <p className="text-gray-400">Đặt món nhanh — Tiện lợi — Hiện đại</p>
        </div>

        {/* Scan card */}
        <div className="glass-card p-8">
          {/* QR scan animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 border-4 border-orange-500/30 rounded-2xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-orange-400" />
              </div>
              <div className="absolute inset-0 border-4 border-orange-500 rounded-2xl animate-ping opacity-20" />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-xl" />
            </div>
          </div>

          <h2 className="text-center text-white font-bold text-lg mb-2">Nhập mã QR</h2>
          <p className="text-center text-gray-400 text-sm mb-6">
            Quét mã QR tại bàn hoặc nhập thủ công
          </p>

          <form onSubmit={handleScan} className="space-y-4">
            <input
              type="text"
              value={qrCode}
              onChange={e => setQrCode(e.target.value)}
              placeholder="VD: QR-Bàn-01-ABC123"
              className="input-field text-center text-lg tracking-wider"
              id="qr-input"
            />
            <button
              type="submit"
              disabled={loading || !qrCode.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
              id="qr-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Scan className="w-5 h-5" />
              )}
              {loading ? 'Đang xử lý...' : 'Vào xem menu'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Demo QR codes */}
        <div className="mt-6">
          <p className="text-center text-gray-500 text-xs mb-3">Mã QR demo</p>
          <div className="space-y-2">
            {demoQRs.map(qr => (
              <button
                key={qr}
                onClick={() => setQrCode(qr)}
                className="w-full glass-card p-3 text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition-all text-sm font-mono text-center"
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        {/* Staff link */}
        <div className="mt-6 text-center">
          <a href="/login" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">
            Đăng nhập nhân viên →
          </a>
        </div>
      </div>
    </div>
  )
}

export default CustomerScanPage

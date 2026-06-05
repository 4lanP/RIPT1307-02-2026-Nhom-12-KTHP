import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { customerApi } from '../../lib/api'
import { QrCode, ArrowRight, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'

const CustomerScanPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const qrParam = searchParams.get('qr')
    if (qrParam) {
      const trimmed = qrParam.trim()
      setQrCode(trimmed)
      autoScan(trimmed)
    }
  }, [searchParams])

  const autoScan = async (code) => {
    setLoading(true)
    try {
      const res = await customerApi.scan(code)
      const sessionToken = res.data.session_token
      sessionStorage.setItem('session_token', sessionToken)
      toast.success('Chào mừng bạn đến với 3POS!')
      navigate('/menu')
    } catch (err) {
      toast.error(err?.message || 'Mã QR không hợp lệ hoặc bàn đang có khách')
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async (e) => {
    e.preventDefault()
    if (!qrCode.trim()) return
    await autoScan(qrCode.trim())
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Premium Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#F9FBF9] -z-10" />
      <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-emerald-50 rounded-full blur-[120px] opacity-60" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-mint-50 rounded-full blur-[100px] opacity-40" />

      <div className="relative w-full max-w-sm animate-fade-in text-center">
        {/* Branding */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(16,185,129,0.12)] border border-emerald-50 mb-6 group transition-transform hover:scale-105 duration-500">
            <UtensilsCrossed className="w-10 h-10 text-emerald-500" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">3POS</h1>
          <p className="text-gray-500 font-medium px-4">Trải nghiệm ẩm thực cao cấp tại bàn của bạn</p>
        </div>

        {/* Enter Table Code UI */}
        <div className="bg-white/80 backdrop-blur-2xl border border-gray-100 p-8 rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)]">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-[24px] flex items-center justify-center">
              <QrCode className="w-10 h-10 text-emerald-500" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Nhập mã bàn</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Nhập mã bàn được ghi trên thẻ QR tại bàn của bạn để xem thực đơn và gọi món.
          </p>

          <form onSubmit={handleScan} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={qrCode}
                onChange={e => setQrCode(e.target.value)}
                placeholder="Nhập mã bàn..."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-center text-lg font-bold tracking-[0.2em] text-gray-800 placeholder:text-gray-300 placeholder:font-medium placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                id="qr-input"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !qrCode.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl shadow-[0_12px_24px_-8px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3 group"
              id="qr-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-lg">Tiếp tục</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-12 opacity-40">
          <a href="/login" className="text-gray-900 font-bold text-xs tracking-widest uppercase hover:opacity-100 transition-opacity">
            Nhân viên đăng nhập
          </a>
        </div>
      </div>
    </div>
  )
}

export default CustomerScanPage

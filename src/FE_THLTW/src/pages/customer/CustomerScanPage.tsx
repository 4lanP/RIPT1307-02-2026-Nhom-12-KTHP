import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { customerApi } from '../../lib/api'
import { QrCode, Scan, ArrowRight, UtensilsCrossed } from 'lucide-react'
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

  const demoQRs = [
    'QR-Bàn-01-ABC123',
    'QR-Bàn-02-DEF456',
    'QR-Bàn-03-GHI789',
  ]

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

        {/* Scan UI */}
        <div className="bg-white/80 backdrop-blur-2xl border border-gray-100 p-8 rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)]">
          <div className="flex justify-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-40 h-40 border-2 border-emerald-100 rounded-[32px] flex items-center justify-center bg-emerald-50/30 overflow-hidden">
                <QrCode className="w-20 h-20 text-emerald-500 opacity-80 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent" />
              </div>
              
              {/* Animated Scan Line */}
              <div className="absolute top-4 left-4 right-4 h-[2px] bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-[scan_2s_ease-in-out_infinite] z-10" />
              
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-2xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-2xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-2xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-2xl" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Quét để đặt món</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Quét mã QR dán tại bàn để xem thực đơn và gọi món ngay lập tức.
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
                  <Scan className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  <span className="text-lg">Tiếp tục</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Section */}
        <div className="mt-10">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Trải nghiệm thử</p>
          <div className="flex flex-wrap justify-center gap-2">
            {demoQRs.map(qr => (
              <button
                key={qr}
                onClick={() => setQrCode(qr)}
                className="px-4 py-2 bg-white border border-gray-100 rounded-full text-xs font-bold text-gray-500 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all shadow-sm"
              >
                {qr.split('-')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 opacity-40">
          <a href="/login" className="text-gray-900 font-bold text-xs tracking-widest uppercase hover:opacity-100 transition-opacity">
            Nhân viên đăng nhập
          </a>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0%, 100% { top: 16px; opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { top: calc(100% - 18px); }
        }
      `}</style>
    </div>
  )
}

export default CustomerScanPage

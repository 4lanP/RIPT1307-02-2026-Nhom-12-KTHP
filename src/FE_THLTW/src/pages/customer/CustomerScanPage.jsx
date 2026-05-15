import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerApi } from '../../lib/api'
import { QrCode, Scan, ArrowRight, UtensilsCrossed, Wifi } from 'lucide-react'
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
      toast.success('Chào mừng bạn đến với 3POS!')
      navigate('/menu')
    } catch (err) {
      toast.error(err?.message || 'Mã QR không hợp lệ hoặc bàn đang có khách')
    } finally {
      setLoading(false)
    }
  }

  const demoQRs = [
    'QR-Bàn-01-ABC123',
    'QR-Bàn-02-DEF456',
    'QR-Bàn-03-GHI789',
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans bg-gray-950">
      {/* Premium Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-900/20 via-gray-950 to-gray-950" />
        <div className="absolute top-[15%] left-[5%] w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[130px] animate-float" />
        <div className="absolute bottom-[15%] right-[5%] w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in text-center z-10">
        {/* Branding */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[28px] shadow-2xl shadow-emerald-500/25 mb-6 animate-glow group transition-transform hover:scale-105 duration-500">
            <UtensilsCrossed className="w-11 h-11 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-3">3POS</h1>
          <p className="text-gray-400 font-medium px-4">Trải nghiệm ẩm thực cao cấp tại bàn của bạn</p>
        </div>

        {/* Scan UI */}
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 p-8 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)]">
          <div className="flex justify-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-40 h-40 border-2 border-emerald-500/20 rounded-[28px] flex items-center justify-center bg-emerald-500/5 overflow-hidden">
                <QrCode className="w-20 h-20 text-emerald-400 opacity-80 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent" />
              </div>
              
              {/* Animated Scan Line */}
              <div className="absolute top-4 left-4 right-4 h-[2px] bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] animate-[scan_2s_ease-in-out_infinite] z-10" />
              
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-7 h-7 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-7 h-7 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-xl" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Quét để đặt món</h2>
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
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-6 py-4 text-center text-lg font-bold tracking-[0.15em] text-white placeholder:text-gray-600 placeholder:font-medium placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                id="qr-input"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !qrCode.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-xl shadow-[0_12px_24px_-8px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-3 group"
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
          <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-[0.2em] mb-4">Trải nghiệm thử</p>
          <div className="flex flex-wrap justify-center gap-2">
            {demoQRs.map(qr => (
              <button
                key={qr}
                onClick={() => setQrCode(qr)}
                className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-full text-xs font-bold text-gray-500 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all"
              >
                {qr.split('-')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12">
          <a href="/login" className="text-gray-600 font-medium text-xs tracking-widest uppercase hover:text-emerald-400 transition-colors">
            Nhân viên đăng nhập
          </a>
        </div>
      </div>
    </div>
  )
}

export default CustomerScanPage

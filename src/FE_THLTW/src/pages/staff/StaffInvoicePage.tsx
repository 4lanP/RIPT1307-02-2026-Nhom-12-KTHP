import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { staffApi } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import {
  normalizeInvoicePayload,
  getPaymentStatusLabel,
  getInvoicePrintTitle
} from '../../lib/invoiceData'
import { ArrowLeft, Printer, CheckCircle2, ShieldAlert, Calendar, User, Table, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const StaffInvoicePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isReprintQuery = searchParams.get('reprint') === 'true'

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    loadInvoice()
  }, [id])

  const loadInvoice = async () => {
    setLoading(true)
    try {
      const res = await staffApi.getInvoice(id)
      if (res.data) {
        setData(normalizeInvoicePayload(res.data))
      } else {
        toast.error('Không tìm thấy thông tin hóa đơn')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi tải hóa đơn')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const printType = (data?.invoice?.is_reprint || isReprintQuery) ? 'REPRINT' : 'PRINT'
      await staffApi.recordInvoicePrintEvent(id, printType)
      
      // Update document title for clean browser print file names
      const originalTitle = document.title
      document.title = getInvoicePrintTitle(data?.invoice)
      
      window.print()
      
      // Restore original title
      document.title = originalTitle
      toast.success('Đã lưu lịch sử in hóa đơn!')
    } catch (err) {
      // Still trigger print even if event recording fails
      window.print()
    } finally {
      setPrinting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data || !data.invoice) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Không tìm thấy hóa đơn</h2>
        <button
          onClick={() => navigate('/tables')}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold"
        >
          Quay lại sơ đồ bàn
        </button>
      </div>
    )
  }

  const { invoice, items } = data
  const isReprint = invoice.is_reprint || isReprintQuery

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Action Header - Hidden during print */}
      <div className="flex items-center justify-between no-print bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={() => navigate(`/tables`)}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold uppercase text-[10px] tracking-widest px-4 py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Chi tiết bàn
        </button>
        <button
          onClick={handlePrint}
          disabled={printing}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4" />
          In Hóa Đơn
        </button>
      </div>

      {/* Printable Receipt Area */}
      <div className="bg-white border border-gray-200 rounded-[32px] shadow-sm p-8 md:p-12 relative overflow-hidden printable-invoice font-mono text-gray-800">
        {/* Reprint Header Watermark */}
        {isReprint && (
          <div className="bg-amber-50 text-amber-800 border-b-2 border-dashed border-amber-200 py-3 text-center text-xs font-black uppercase tracking-widest mb-8 no-print-banner">
            ⚠️ BẢN IN LẠI (REPRINT) ⚠️
          </div>
        )}

        {/* Brand/Header */}
        <div className="text-center space-y-2 pb-6 border-b border-dashed border-gray-200">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">3POS RESTAURANT</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Hóa đơn thanh toán</p>
          {isReprint && (
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest print-only-banner hidden">
              *** BẢN IN LẠI (REPRINT) ***
            </p>
          )}
        </div>

        {/* Invoice Metadata */}
        <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold border-b border-dashed border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>Số HĐ: <strong className="text-gray-900">{invoice.invoice_number}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-gray-400" />
              <span>Bàn ăn: <strong className="text-gray-900">{invoice.table_name || `Bàn ${invoice.table_id}`}</strong></span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Ngày tạo: <span className="text-gray-600">{formatDate(invoice.created_at)}</span></span>
            </div>
            {invoice.created_by_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>Thu ngân: <span className="text-gray-600">{invoice.created_by_name}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items Table */}
        <div className="py-6 border-b border-dashed border-gray-200">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 pb-2">
                <th className="pb-3 uppercase tracking-wider">Món ăn</th>
                <th className="pb-3 text-center uppercase tracking-wider w-16">SL</th>
                <th className="pb-3 text-right uppercase tracking-wider w-24">Đơn giá</th>
                <th className="pb-3 text-right uppercase tracking-wider w-24">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item: any, idx: number) => (
                <tr key={idx} className="align-top">
                  <td className="py-3.5 pr-2">
                    <p className="text-gray-900 font-bold">{item.item_name}</p>
                    {item.note && <p className="text-amber-600 text-[10px] italic mt-0.5">Note: {item.note}</p>}
                  </td>
                  <td className="py-3.5 text-center text-gray-900 font-black">{item.quantity}</td>
                  <td className="py-3.5 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3.5 text-right text-gray-900 font-bold">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Totals */}
        <div className="py-6 border-b border-dashed border-gray-200 text-xs font-bold space-y-3.5">
          <div className="flex justify-between items-center text-gray-500">
            <span>Tạm tính</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between items-center text-red-500">
              <span>Giảm giá</span>
              <span>-{formatCurrency(invoice.discount_amount)}</span>
            </div>
          )}
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between items-center text-gray-500">
              <span>Thuế VAT (8%)</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
          )}
          {invoice.rounding_amount !== 0 && (
            <div className="flex justify-between items-center text-gray-500">
              <span>Làm tròn</span>
              <span>{formatCurrency(invoice.rounding_amount)}</span>
            </div>
          )}
          <div className="pt-3.5 border-t border-dashed border-gray-200 flex justify-between items-center text-lg font-black text-gray-900">
            <span>TỔNG CỘNG</span>
            <span className="text-xl text-emerald-600 tracking-tight">{formatCurrency(invoice.final_amount)}</span>
          </div>
        </div>

        {/* Payment Status Footer */}
        <div className="py-6 border-b border-dashed border-gray-200 text-center space-y-1.5">
          <p className="text-xs font-black uppercase tracking-wider text-gray-900">Trạng thái thanh toán</p>
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {getPaymentStatusLabel(invoice.payment_status, invoice.payment_method)}
          </div>
        </div>

        {/* Customer Footer */}
        <div className="pt-8 text-center space-y-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
          <p>Cảm ơn quý khách! Hẹn gặp lại!</p>
          <p className="text-[8px] tracking-normal font-mono normal-case">Powered by 3POS Restaurant Management</p>
        </div>
      </div>

      {/* Global CSS Styles for printing - keeps receipt layout clean and hides chrome */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          body, html, main, #root {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-invoice {
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print-banner {
            display: none !important;
          }
          .print-only-banner {
            display: block !important;
          }
        }
      `}} />
    </div>
  )
}

export default StaffInvoicePage

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Order } from '../types';
import { Printer, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppState } from '../context/AppContext';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, theme } = useAppState();

  if (!order) return null;

  const handlePrint = () => {
    // Elegant receipt printing
    const printContents = printRef.current?.innerHTML;
    const originalContents = document.body.innerHTML;

    if (printContents) {
      const styles = `
        <style>
          * {
            color: #000 !important;
            background: transparent !important;
            border-color: #000 !important;
            box-shadow: none !important;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 20px;
            color: #000 !important;
            background: #fff !important;
          }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border-bottom: 1px dashed #000 !important; padding: 6px 0; text-align: left; font-size: 14px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .double-line { border-bottom: 3px double #000 !important; margin: 10px 0; }
          .dashed-line { border-bottom: 1px dashed #000 !important; margin: 10px 0; }
        </style>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Hoa Don Karaoke - ${order.id}</title>
              ${styles}
            </head>
            <body>
              ${printContents}
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${h}:${m} ${day}/${month}/${year}`;
  };

  const formatTimeOnly = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatDurationHelper = (minutes: number) => {
    if (minutes < 0) return '0p';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) {
      return `${mins}p`;
    }
    if (mins === 0) {
      return `${hrs}h`;
    }
    return `${hrs}h${mins}p`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-slate-900 text-slate-100 border-slate-800 shadow-slate-950/60' 
              : 'bg-white text-slate-900 border-slate-200 shadow-slate-200/50'
          }`}
        >
          {/* Header Action bar */}
          <div className={`px-6 py-4 flex justify-between items-center border-b transition-colors duration-300 ${
            theme === 'dark' 
              ? 'bg-slate-950 border-slate-800 text-slate-100' 
              : 'bg-slate-50 border-slate-100 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2">
              {order.isCancelled ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="font-semibold text-sm text-red-500">Hóa đơn này Đã Hủy</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Thanh toán hoàn tất</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer"
                id="btn-print-receipt"
              >
                <Printer size={16} />
                <span>In hóa đơn</span>
              </button>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition ${
                  theme === 'dark' 
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                }`}
                id="btn-close-receipt"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className={`p-6 overflow-y-auto max-h-[75vh] transition-colors duration-300 ${
            theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-50/20'
          }`}>
            {/* Display receipt for on-screen inspection in standard thermal slip (K80/slip/xhyp) format */}
            <div 
              ref={printRef}
              className={`font-mono p-6 border text-xs shadow-md mx-auto max-w-sm rounded-xl transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-white shadow-slate-950/80'
                  : 'bg-stone-50 border-stone-300 text-black'
              }`}
              style={{ letterSpacing: '0', lineHeight: '1.5' }}
              id="invoice-print-slip"
            >
              {/* Header Info */}
              <div className="text-center font-black text-base tracking-wide uppercase">{settings.shopName}</div>
              <div className="text-center text-[10.5px] font-medium">{settings.address}</div>
              <div className="text-center text-[10.5px] font-medium mb-2.5">SĐT: {settings.phone}</div>
              
              <div className={`text-center text-xs font-black border-y border-dashed py-1.5 my-3 tracking-widest ${
                theme === 'dark' 
                  ? 'border-slate-800 bg-slate-900/60' 
                  : 'border-stone-400 bg-stone-200/55'
              }`}>
                HÓA ĐƠN THANH TOÁN
              </div>

              {order.isCancelled && (
                <div className={`mb-3.5 p-2.5 border rounded text-[10.5px] leading-relaxed ${
                  theme === 'dark'
                    ? 'bg-red-950/30 border-red-900/40'
                    : 'bg-red-50 border-red-350'
                }`}>
                  <div className="font-extrabold text-center uppercase tracking-wider mb-0.5">HÓA ĐƠN ĐÃ HỦY</div>
                  <div><strong>Lý do:</strong> {order.cancelReason || 'Khách đổi ý/Sự cố'}</div>
                  <div className="text-[9.5px] italic text-center mt-1">Không ghi nhận vào doanh thu</div>
                </div>
              )}

              {/* Invoice metadata */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Mã hóa đơn:</span>
                  <span className="font-bold">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phòng hát:</span>
                  <span className="font-extrabold">{order.roomName} ({order.roomType.toUpperCase()})</span>
                </div>
                <div className="flex justify-between">
                  <span>Thu ngân:</span>
                  <span className="font-bold">{order.createdBy}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giờ vào:</span>
                  <span className="font-semibold">{formatDate(order.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giờ ra:</span>
                  <span className="font-semibold">{formatDate(order.endTime)}</span>
                </div>
                <div className={`flex justify-between border-b border-dashed pb-2.5 ${
                  theme === 'dark' ? 'border-slate-800' : 'border-stone-450'
                }`}>
                  <span>Tổng thời gian:</span>
                  <span className="font-extrabold">{formatDurationHelper(order.durationMinutes)}</span>
                </div>
              </div>

              {/* SECTION 1: TIỀN GIỜ PHÒNG */}
              <div className="mt-4">
                <div className="text-[10px] font-black tracking-wider uppercase mb-1.5">1. CHI PHÍ GIỜ HÁT</div>
                <table className="w-full text-left text-[11px] pb-2.5 mb-2.5 table-fixed">
                  <thead>
                    <tr className={`border-b border-dashed text-[10px] font-bold ${
                      theme === 'dark' ? 'border-slate-800' : 'border-stone-400'
                    }`}>
                      <th className="py-1 text-left w-[42%]">Tên dịch vụ</th>
                      <th className="py-1 text-center w-[15%]">Thời gian</th>
                      <th className="py-1 text-right w-[20%]">Đơn giá</th>
                      <th className="py-1 text-right w-[23%]">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`border-b border-dashed last:border-b-0 ${
                      theme === 'dark' ? 'border-slate-900/80' : 'border-stone-200/60'
                    }`}>
                      <td className="py-2 text-left font-bold truncate">Hát giờ {order.roomType.toUpperCase()}</td>
                      <td className="py-2 text-center font-semibold">{formatDurationHelper(order.durationMinutes)}</td>
                      <td className="py-2 text-right font-semibold tracking-tight">{formatVND(order.hourlyPrice)}</td>
                      <td className="py-2 text-right font-black tracking-tight">{formatVND(order.roomCharge)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION 2: DANH SÁCH SẢN PHẨM / DỊCH VỤ DÙNG THÊM */}
              {order.items.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-black tracking-wider uppercase mb-1.5">2. DỊCH VỤ & HÀNG HÓA</div>
                  <table className="w-full text-left text-[11px] pb-2.5 mb-2.5 table-fixed">
                    <thead>
                      <tr className={`border-b border-dashed text-[10px] font-bold ${
                        theme === 'dark' ? 'border-slate-800' : 'border-stone-400'
                      }`}>
                        <th className="py-1 text-left w-[42%]">Tên hàng hóa</th>
                        <th className="py-1 text-center w-[15%]">SL</th>
                        <th className="py-1 text-right w-[20%]">Đơn giá</th>
                        <th className="py-1 text-right w-[23%]">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map(item => (
                        <tr key={item.id} className={`border-b border-dashed last:border-b-0 ${
                          theme === 'dark' ? 'border-slate-900/80' : 'border-stone-200/60'
                        }`}>
                          <td className="py-2">
                            <span className="font-semibold block truncate">{item.name}</span>
                            <span className="text-[9.5px] block">ĐVT: {item.unit || 'phần'}</span>
                          </td>
                          <td className="py-2 text-center font-bold">{item.quantity}</td>
                          <td className="py-2 text-right font-semibold tracking-tight">{formatVND(item.price)}</td>
                          <td className="py-2 text-right font-black tracking-tight">{formatVND(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SECTION 3: DANH SÁCH TIẾP VIÊN / PHỤC VỤ */}
              {order.hostesses.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-black tracking-wider uppercase mb-1.5">3. TIẾP VIÊN PHỤC VỤ</div>
                  <table className="w-full text-left text-[11px] pb-2.5 mb-2.5 table-fixed">
                    <thead>
                      <tr className={`border-b border-dashed text-[10px] font-bold ${
                        theme === 'dark' ? 'border-slate-800' : 'border-stone-400'
                      }`}>
                        <th className="py-1 text-left w-[42%]">Tên bạn phục vụ</th>
                        <th className="py-1 text-center w-[15%]">S.dụng</th>
                        <th className="py-1 text-right w-[20%]">Đơn giá</th>
                        <th className="py-1 text-right w-[23%]">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.hostesses.map(h => {
                        const hiredClean = new Date(h.hiredAt);
                        hiredClean.setSeconds(0, 0);
                        const exitClean = new Date(h.leftAt ? h.leftAt : order.endTime);
                        exitClean.setSeconds(0, 0);
                        
                        const hDurationMinutes = Math.max(0, Math.floor((exitClean.getTime() - hiredClean.getTime()) / 60000));
                        const cost = Math.round((hDurationMinutes / 60) * h.pricePerHour);

                        return (
                          <tr key={h.id} className={`border-b border-dashed last:border-b-0 ${
                            theme === 'dark' ? 'border-slate-900/80' : 'border-stone-200/60'
                          }`}>
                            <td className="py-2">
                              <span className="font-bold block truncate">{h.name}</span>
                              <span className="text-[9px] block font-semibold">
                                {formatTimeOnly(h.hiredAt)}~{h.leftAt ? formatTimeOnly(h.leftAt) : formatTimeOnly(order.endTime)}
                              </span>
                            </td>
                            <td className="py-2 text-center font-semibold">{formatDurationHelper(hDurationMinutes)}</td>
                            <td className="py-2 text-right font-semibold tracking-tight">{formatVND(h.pricePerHour)}/h</td>
                            <td className="py-2 text-right font-black tracking-tight">{formatVND(cost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TOTAL CALCULATION BLOCK */}
              <div className={`border-t border-double pt-3 mt-4 space-y-2 text-[11.5px] ${
                theme === 'dark' ? 'border-slate-800' : 'border-stone-400'
              }`}>
                <div className="flex justify-between">
                  <span className="font-semibold">Tiền giờ hát phòng:</span>
                  <span className="font-bold tracking-tight">{formatVND(order.roomCharge)}</span>
                </div>
                {order.goodsCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="font-semibold">Cộng tiền hàng hóa:</span>
                    <span className="font-bold tracking-tight">{formatVND(order.goodsCharge)}</span>
                  </div>
                )}
                {order.hostessCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="font-semibold">Cộng tiền nhân viên:</span>
                    <span className="font-bold tracking-tight">{formatVND(order.hostessCharge)}</span>
                  </div>
                )}
                
                <div className={`border-b border-dashed my-2 ${
                  theme === 'dark' ? 'border-slate-800' : 'border-stone-350'
                }`}></div>
                
                <div className="flex justify-between text-[12.5px] font-black pt-1">
                  <span className="tracking-wide">TỔNG THANH TOÁN:</span>
                  {order.isCancelled ? (
                    <div className="text-right">
                      <span className="line-through text-xs mr-1">{formatVND(order.totalAmount)}</span>
                      <span className="font-black">0 đ (HỦY)</span>
                    </div>
                  ) : (
                    <span className="font-black text-[13.5px] tracking-tight">{formatVND(order.totalAmount)}</span>
                  )}
                </div>
              </div>

              {/* Bottom footer guidelines */}
              <div className={`border-t border-dashed my-4 pt-3 text-center text-[10px] space-y-1.5 ${
                theme === 'dark' ? 'border-slate-800' : 'border-stone-350'
              }`}>
                <div className="font-black">Cảm ơn quý khách. Hẹn gặp lại!</div>
                <div>Wifi: <span className="font-extrabold">{settings.wifiName}</span> - MK: <span className="font-extrabold">{settings.wifiPassword}</span></div>
                <div className="text-[9px] italic">In tại chỗ lúc: {formatDate(new Date().toISOString())}</div>
              </div>
            </div>
          </div>

          <div className={`px-6 py-4 flex justify-end border-t transition-colors duration-300 ${
            theme === 'dark' 
              ? 'bg-slate-950 border-slate-800' 
              : 'bg-slate-50 border-slate-100'
          }`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              Đóng và Tiếp tục
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

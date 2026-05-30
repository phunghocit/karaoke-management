/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../context/AppContext';
import { Room, Hostess, Goods, Order, RoomStatus, RoomType } from '../types';
import InvoiceModal from './InvoiceModal';
import { TimePicker24h } from './TimePicker24h';
import { 
  Plus, 
  Minus, 
  UserPlus, 
  Trash2, 
  Play, 
  Receipt, 
  Sparkles, 
  Timer as ClockIcon, 
  Search, 
  UtensilsCrossed,
  Filter,
  CheckCircle2,
  Brush,
  ChevronRight,
  User,
  Info,
  RotateCcw,
  Lock,
  XCircle,
  X,
  Pencil,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Room elapsed ticking clock component
function RoomTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calculate = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diffMs = now - start;
      if (diffMs < 0) return '00:00:00';

      const sec = Math.floor((diffMs / 1000) % 60);
      const min = Math.floor((diffMs / (1000 * 60)) % 60);
      const hr = Math.floor(diffMs / (1000 * 60 * 60));

      const hrStr = hr.toString().padStart(2, '0');
      const minStr = min.toString().padStart(2, '0');
      const secStr = sec.toString().padStart(2, '0');

      return `${hrStr}:${minStr}:${secStr}`;
    };

    setElapsed(calculate());
    const interval = setInterval(() => {
      setElapsed(calculate());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center space-x-1 font-mono text-indigo-400 font-bold bg-slate-900/50 px-2.5 py-1 rounded-lg text-sm border border-slate-800">
      <ClockIcon size={14} className="animate-pulse" />
      <span>{elapsed}</span>
    </div>
  );
}

export default function ManagementView() {
  const {
    rooms,
    hostesses,
    goods,
    orders,
    logs,
    currentUser,
    startRoom,
    addGoodsToRoom,
    setGoodsQuantityInRoom,
    addHostessToRoom,
    removeHostessFromRoom,
    resumeHostessSession,
    deleteHostessSession,
    updateHostessSessionTimes,
    updateRoomSessionTimes,
    checkoutRoom,
    cancelRoom,
    reopenOrder,
    deleteOrder,
    completeCleaning,
    updateRoomPrice,
    addRoom,
    updateRoom,
    deleteRoom
  } = useAppState();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCancellingRoom, setIsCancellingRoom] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [activeInvoice, setActiveInvoice] = useState<Order | null>(null);
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState('');
  const [invoiceSortBy, setInvoiceSortBy] = useState<'id' | 'startTime' | 'endTime'>('endTime');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');

  // Custom persistent confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      }
    });
  };

  // Room CRUD states
  const [isRoomCRUDOpen, setIsRoomCRUDOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomFormName, setRoomFormName] = useState('');
  const [roomFormType, setRoomFormType] = useState<'standard' | 'vip'>('standard');
  const [roomFormPrice, setRoomFormPrice] = useState('0');

  const handleSubmitRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomFormName.trim()) {
      alert('Vui lòng nhập tên phòng!');
      return;
    }
    const price = Number(roomFormPrice);
    if (isNaN(price) || price < 0) {
      alert('Giá tiền giờ hát không hợp lệ (phải là số lớn hơn hoặc bằng 0)!');
      return;
    }

    if (editingRoomId) {
      updateRoom(editingRoomId, roomFormName.trim(), roomFormType, price);
    } else {
      addRoom(roomFormName.trim(), roomFormType, price);
    }

    // Reset Form
    setRoomFormName('');
    setRoomFormType('standard');
    setRoomFormPrice('0');
    setEditingRoomId(null);
  };

  const handleEditRoomClick = (room: Room) => {
    setEditingRoomId(room.id);
    setRoomFormName(room.name);
    setRoomFormType(room.type);
    setRoomFormPrice(room.hourlyPrice.toString());
  };

  const handleCancelRoomForm = () => {
    setRoomFormName('');
    setRoomFormType('standard');
    setRoomFormPrice('0');
    setEditingRoomId(null);
  };

  const handleDeleteRoomClick = (room: Room) => {
    if (room.status === 'occupied') {
      alert('Không thể xóa phòng đang có khách hát!');
      return;
    }
    showConfirm(
      'Xóa phòng hát',
      `Bạn chắc chắn muốn xóa phòng hát "${room.name}" khỏi hệ thống sơ đồ?`,
      () => {
        deleteRoom(room.id);
        if (selectedRoomId === room.id) {
          setSelectedRoomId(null);
        }
      }
    );
  };
  
  // Custom checkout 24-hour timing selectors
  const [customCheckoutTimeVal, setCustomCheckoutTimeVal] = useState('');
  const [customCheckoutDateVal, setCustomCheckoutDateVal] = useState('');
  const [editingHostessTimeId, setEditingHostessTimeId] = useState<string | null>(null);

  // Goods quantity editing state
  const [editingGoodsQtyId, setEditingGoodsQtyId] = useState<string | null>(null);
  const [editingGoodsQtyValue, setEditingGoodsQtyValue] = useState<string>('');

  // Real-time tick to update estimated checkout values automatically
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helpers to manipulate 24h custom timings inside ISO Strings safely (keeps initial session day)
  const get24hFromISOString = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const updateTimeInISOString = (isoString: string, time24h: string): string => {
    if (!time24h) return isoString;
    const [hours, minutes] = time24h.split(':').map(Number);
    const date = new Date(isoString);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  };

  const getDateStringFromISO = (isoString: string): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const updateDateInISOString = (isoString: string, dateString: string): string => {
    if (!dateString) return isoString;
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(isoString);
    d.setFullYear(year, month - 1, day);
    return d.toISOString();
  };

  const formatDateTimeFull = (isoString: string): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const day = d.getDate().toString().padStart(2, '0');
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hrs}:${mins} (${day}/${m})`;
  };

  const getDiffMinutesIgnoringSeconds = (start: number | string | Date, end: number | string | Date): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    s.setSeconds(0, 0);
    const e = new Date(end);
    e.setSeconds(0, 0);
    return Math.max(0, Math.floor((e.getTime() - s.getTime()) / 60000));
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

  // Selection drawers lists
  const [showHostessDropdown, setShowHostessDropdown] = useState(false);
  const [goodSearchQuery, setGoodSearchQuery] = useState('');
  const [goodsCategoryFilter, setGoodsCategoryFilter] = useState<'all' | 'drink' | 'food' | 'other'>('all');

  // Multi-tab view on mobile: 'rooms' or 'invoices'
  const [mobileSubTab, setMobileSubTab] = useState<'rooms' | 'invoices'>('rooms');

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Close selections on room change
  useEffect(() => {
    setShowHostessDropdown(false);
    setGoodSearchQuery('');
    setCustomCheckoutTimeVal('');
    setCustomCheckoutDateVal('');
    setIsCancellingRoom(false);
    setCancelReason('');
  }, [selectedRoomId]);

  const handleStartRoom = (roomId: string) => {
    startRoom(roomId);
    setSelectedRoomId(roomId);
  };

  const handleCheckout = (roomId: string) => {
    let finalCheckoutTime: string | undefined = undefined;
    if (customCheckoutTimeVal) {
      // Find starting time of the room to preserve isostring base date safely
      const r = rooms.find(room => room.id === roomId);
      if (r && r.activeSession) {
        const datePart = customCheckoutDateVal || getDateStringFromISO(r.activeSession.startTime);
        const tempISO = updateDateInISOString(r.activeSession.startTime, datePart);
        finalCheckoutTime = updateTimeInISOString(tempISO, customCheckoutTimeVal);
      } else {
        const nowISO = new Date().toISOString();
        const datePart = customCheckoutDateVal || getDateStringFromISO(nowISO);
        const tempISO = updateDateInISOString(nowISO, datePart);
        finalCheckoutTime = updateTimeInISOString(tempISO, customCheckoutTimeVal);
      }
    }
    const order = checkoutRoom(roomId, finalCheckoutTime);
    if (order) {
      setActiveInvoice(order);
    }
  };

  const handleStopRoomTimer = (roomId: string) => {
    const r = rooms.find(room => room.id === roomId);
    if (!r || !r.activeSession) return;

    const nowISO = new Date().toISOString();
    const current24h = get24hFromISOString(nowISO);

    // Kiểm tra nhân viên chưa ra khỏi phòng
    const activeHostessesInRoom = r.activeSession.hostesses.filter(h => !h.leftAt);
    if (activeHostessesInRoom.length > 0) {
      showConfirm(
        "Có tiếp viên chưa ra khỏi phòng",
        "Có tiếp viên chưa ra khỏi phòng, bạn có đồng ý dừng giờ phục vụ cho tất cả tiếp viên này cùng lúc?",
        () => {
          // Dừng giờ cho tất cả tiếp viên chưa ra
          activeHostessesInRoom.forEach(h => {
            removeHostessFromRoom(roomId, h.id, nowISO);
          });
          setCustomCheckoutTimeVal(current24h);
          setCustomCheckoutDateVal(getDateStringFromISO(nowISO));
        }
      );
    } else {
      setCustomCheckoutTimeVal(current24h);
      setCustomCheckoutDateVal(getDateStringFromISO(nowISO));
    }
  };

  const handleCancelRoom = (roomId: string) => {
    if (currentUser.role === 'staff') {
      alert('Tài khoản nhân viên không có quyền hủy phòng!');
      return;
    }
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy phòng!');
      return;
    }
    cancelRoom(roomId, cancelReason.trim());
    setIsCancellingRoom(false);
    setCancelReason('');
  };

  const getFilteredGoods = () => {
    return goods.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(goodSearchQuery.toLowerCase());
      const matchCat = goodsCategoryFilter === 'all' || item.category === goodsCategoryFilter;
      return matchSearch && matchCat;
    });
  };

  const getFilteredOrders = () => {
    let result = [...orders];

    if (searchInvoiceQuery.trim()) {
      const q = searchInvoiceQuery.toLowerCase();
      result = result.filter(o => 
        o.roomName.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }

    // Sort the list based on selection
    result.sort((a, b) => {
      if (invoiceSortBy === 'id') {
        return invoiceSortOrder === 'asc' 
          ? a.id.localeCompare(b.id) 
          : b.id.localeCompare(a.id);
      } else if (invoiceSortBy === 'startTime') {
        const tA = new Date(a.startTime).getTime();
        const tB = new Date(b.startTime).getTime();
        return invoiceSortOrder === 'asc' ? tA - tB : tB - tA;
      } else {
        const tA = new Date(a.endTime).getTime();
        const tB = new Date(b.endTime).getTime();
        return invoiceSortOrder === 'asc' ? tA - tB : tB - tA;
      }
    });

    return result;
  };

  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ';
  };

  // Quick summary states
  const availableCount = rooms.filter(r => r.status === 'available').length;
  const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
  const cleaningCount = rooms.filter(r => r.status === 'cleaning').length;

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* Mobile subtabs selector */}
      <div className="md:hidden flex border-b border-slate-800 bg-slate-900 sticky top-16 z-20">
        <button
          onClick={() => {
            setMobileSubTab('rooms');
            setSelectedRoomId(null);
          }}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 cursor-pointer ${
            mobileSubTab === 'rooms' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400'
          }`}
        >
          Sơ đồ Phòng ({rooms.length})
        </button>
        <button
          onClick={() => setMobileSubTab('invoices')}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 cursor-pointer ${
            mobileSubTab === 'invoices' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400'
          }`}
        >
          Đơn đã chốt ({orders.length})
        </button>
      </div>

      {/* LEFT PANEL: Completed invoices - Split panel */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-900/40 h-full ${
        mobileSubTab === 'invoices' ? 'flex' : 'hidden md:flex'
      }`}>
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex flex-col space-y-2 shrink-0">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-100 tracking-tight flex items-center space-x-1.5 shrink-0">
                <Receipt size={17} className="text-indigo-400" />
                <span className="text-sm font-semibold text-slate-200">Đơn Đã Chốt</span>
              </h2>
              <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                Doanh thu: {formatVND(orders.reduce((acc, o) => o.isCancelled ? acc : acc + o.totalAmount, 0))}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Hôm nay có {orders.length} đơn được thanh toán
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo phòng hoặc mã HĐ..."
              value={searchInvoiceQuery}
              onChange={(e) => setSearchInvoiceQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition"
              id="search-invoices"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 gap-2 px-1">
            <div className="flex items-center space-x-1 min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">Sắp xếp:</span>
              <select
                value={invoiceSortBy}
                onChange={(e) => setInvoiceSortBy(e.target.value as any)}
                className="bg-slate-950/90 border border-slate-800 rounded-lg py-1 px-2 text-[11px] font-semibold text-slate-300 focus:outline-none cursor-pointer flex-1 min-w-0"
              >
                <option value="endTime">Ngày giờ ra</option>
                <option value="startTime">Ngày giờ vào</option>
                <option value="id">Thứ tự HĐ (Mã)</option>
              </select>
            </div>
            
            <button
              type="button"
              onClick={() => setInvoiceSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="bg-slate-950/90 hover:bg-slate-900 border border-slate-800 py-1 px-2 rounded-lg text-[10px] font-bold text-slate-300 transition flex items-center space-x-1 shrink-0 select-none active:scale-95 duration-75"
              title={invoiceSortOrder === 'asc' ? "Tăng dần (Cũ nhất trước)" : "Giảm dần (Mới nhất trước)"}
            >
              <span>{invoiceSortOrder === 'asc' ? 'TĂNG' : 'GIẢM'}</span>
              <span>{invoiceSortOrder === 'asc' ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* Invoice list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950/20">
          <AnimatePresence>
            {getFilteredOrders().length === 0 ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center space-y-2">
                <Receipt size={32} className="text-slate-700" />
                <p className="text-xs">Chưa có hóa đơn nào ghi nhận hôm nay</p>
              </div>
            ) : (
              getFilteredOrders().map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setActiveInvoice(order)}
                  className={`${
                    order.isCancelled 
                      ? 'bg-red-950/10 hover:bg-red-950/15 border-red-900/30 hover:border-red-800/40' 
                      : 'bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80'
                  } p-3.5 rounded-xl cursor-pointer transition flex flex-col space-y-2.5 relative group shadow-xs`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-200 text-sm flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full ${order.isCancelled ? 'bg-red-500' : order.roomType === 'vip' ? 'bg-amber-400' : 'bg-slate-400'}`}></span>
                        <span className={order.isCancelled ? 'line-through text-slate-500' : ''}>{order.roomName}</span>
                        {order.isCancelled && (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider">Đã hủy</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono tracking-wider">{order.id}</span>
                    </div>
                    <div className="text-right">
                      {order.isCancelled ? (
                        <div>
                          <div className="text-[11px] font-extrabold text-red-400/80 line-through">{formatVND(order.totalAmount)}</div>
                          <span className="text-[9.5px] text-red-400 font-bold">0 đ</span>
                        </div>
                      ) : (
                        <div className="text-[13px] font-extrabold text-emerald-400">{formatVND(order.totalAmount)}</div>
                      )}
                    </div>
                  </div>

                  {/* Datetime Timeline: Vào & Ra */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10.5px] bg-slate-950/45 p-2 rounded-lg border border-slate-800/50 font-mono leading-tight">
                    <div className="flex flex-col">
                      <span className="text-[8.5px] text-zinc-500 font-extrabold uppercase tracking-wide">Giờ vào:</span>
                      <span className="text-emerald-400 font-bold">{formatDateTimeFull(order.startTime)}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-800/80 pl-2">
                      <span className="text-[8.5px] text-zinc-500 font-extrabold uppercase tracking-wide">Giờ ra:</span>
                      <span className="text-rose-400 font-bold">{formatDateTimeFull(order.endTime)}</span>
                    </div>
                  </div>

                  {order.isCancelled && order.cancelReason && (
                    <div className="text-[10px] text-red-300 bg-red-950/20 border border-red-500/10 px-2.5 py-1.5 rounded-lg leading-normal">
                      <strong>Lý do hủy:</strong> <span className="italic">{order.cancelReason}</span>
                    </div>
                  )}

                   <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-800/60 text-[10.5px] text-slate-400">
                    <div>
                      <span className="block text-slate-500">Giờ phòng:</span>
                      <span className="font-semibold text-slate-300">{formatVND(order.roomCharge)}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Dịch vụ:</span>
                      <span className="font-semibold text-slate-300">{formatVND(order.goodsCharge)}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Tiếp viên:</span>
                      <span className="font-semibold text-slate-300">{formatVND(order.hostessCharge)}</span>
                    </div>
                  </div>

                  {/* Summary line */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-950/40 px-2 py-1 rounded-md text-slate-400">
                    <span>Thời gian sử dụng: {formatDurationHelper(order.durationMinutes)}</span>
                    <span className="text-[9.5px] font-semibold text-indigo-400 group-hover:underline flex items-center">
                      Xem hóa đơn <ChevronRight size={10} />
                    </span>
                  </div>

                  {(() => {
                    const associatedRoom = rooms.find(r => r.id === order.roomId);
                    const hasReopenButton = associatedRoom && associatedRoom.status !== 'occupied';

                    return (
                      <div className={`grid ${hasReopenButton ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-2`} onClick={(e) => e.stopPropagation()}>
                        {hasReopenButton && (
                          currentUser.role === 'manager' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reopenOrder(order.id);
                              }}
                              className="w-full bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-400 border border-indigo-500/20 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                            >
                              <RotateCcw size={11} />
                              <span>Mở lại phòng</span>
                            </button>
                          ) : (
                            <div
                              className="w-full bg-slate-900/40 text-slate-600 border border-slate-900/40 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 select-none cursor-not-allowed"
                              title="Yêu cầu tài khoản Quản lý để mở lại phòng!"
                            >
                              <Lock size={10.5} className="text-slate-600" />
                              <span>Mở lại phòng</span>
                            </div>
                          )
                        )}

                        {currentUser.role === 'manager' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              showConfirm(
                                'Xóa vĩnh viễn hóa đơn',
                                `Bạn có chắc muốn XÓA VĨNH VIỄN hóa đơn ${order.id} của phòng ${order.roomName} (Giá trị: ${formatVND(order.totalAmount)}) không?\nHành động này không thể hoàn tác!`,
                                () => deleteOrder(order.id)
                              );
                            }}
                            className="w-full bg-rose-600/15 hover:bg-rose-600/30 text-rose-450 border border-rose-500/15 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer text-rose-400"
                          >
                            <Trash2 size={11} />
                            <span>Xóa hóa đơn</span>
                          </button>
                        ) : (
                          <div
                            className="w-full bg-slate-900/45 text-slate-650 border border-slate-900/40 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 select-none cursor-not-allowed"
                            title="Yêu cầu tài khoản Quản lý để xóa hóa đơn!"
                          >
                            <Lock size={10.5} className="text-slate-600" />
                            <span>Xóa hóa đơn</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT PANEL: Room status list & Room detailed controllers */}
      <div className={`fixed md:relative inset-0 md:inset-auto flex-1 flex flex-col h-full bg-slate-950 overflow-hidden z-30 md:z-0 transition-transform ${
        selectedRoomId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      } ${
        mobileSubTab === 'rooms' ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Room selection area */}
        <div className="p-4 border-b border-slate-800 bg-indigo-950/5/30 flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span className="w-1.5 h-3 bg-indigo-500 rounded-xs"></span>
              <span>Sơ đồ phòng Karaoke thời gian thực</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Thời gian thực đồng bộ | Nhấp vào phòng để thêm món ăn, tiếp viên và chốt bill</p>
          </div>

          {/* Setup Button & KPI Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsRoomCRUDOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              id="btn-room-config"
            >
              <Settings size={13.5} className="animate-spin-slow" />
              <span>Thiết lập Phòng ({rooms.length})</span>
            </button>

            <div className="flex items-center space-x-2 text-[11px] font-mono">
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-400">Trống ({availableCount})</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-slate-400">Đang hát ({occupiedCount})</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-slate-400">Dọn dẹp ({cleaningCount})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Room Grid split view */}
        <div className={`flex-1 overflow-hidden flex flex-col lg:flex-row ${selectedRoomId ? 'md:flex hidden' : 'flex'}`}>
          
          {/* Main map Grid */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="grid grid-cols-2 gap-5">
              {rooms.map(room => {
                const isSelected = selectedRoomId === room.id;
                let bgStyle = 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700';
                let stateText = 'Trống';
                let stateColor = 'text-emerald-400';
                let pulseRing = '';

                if (room.status === 'occupied') {
                  bgStyle = 'bg-slate-900 border-indigo-600/40 shadow-inner hover:border-indigo-500/50';
                  stateText = 'Đang hát';
                  stateColor = 'text-indigo-400';
                  pulseRing = 'ring-2 ring-indigo-500/20';
                } else if (room.status === 'cleaning') {
                  bgStyle = 'bg-slate-900/80 border-amber-600/40 bg-radial-cleaning';
                  stateText = 'Đang dọn phòng';
                  stateColor = 'text-amber-400';
                }

                if (isSelected) {
                  bgStyle = 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/40';
                }

                return (
                  <motion.div
                    key={room.id}
                    layoutId={`room-card-${room.id}`}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`rounded-2xl border p-4.5 cursor-pointer transition duration-200 relative overflow-hidden flex flex-col justify-between h-40 select-none ${bgStyle} ${pulseRing}`}
                  >
                    {/* VIP marker */}
                    {room.type === 'vip' && (
                      <span className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-400 text-slate-950 font-mono font-black text-[9px] px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        VIP
                      </span>
                    )}

                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-100 tracking-tight leading-none mb-1.5">{room.name}</h3>
                        <span className="text-[10.5px] text-slate-500 font-mono block">
                          Đơn giá: {room.hourlyPrice.toLocaleString()}đ/h
                        </span>
                      </div>
                    </div>

                    {/* Room center info */}
                    <div className="my-2">
                      {room.status === 'occupied' && room.activeSession && (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-1 mt-1">
                            <RoomTimer startTime={room.activeSession.startTime} />
                          </div>
                          {/* Mini stats counters */}
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                            {room.activeSession.hostesses.length > 0 && (
                              <span className="bg-slate-950/50 border border-slate-800 px-1 py-0.5 rounded flex items-center space-x-0.5">
                                👤 {room.activeSession.hostesses.length}
                              </span>
                            )}
                            {room.activeSession.items.length > 0 && (
                              <span className="bg-slate-950/50 border border-slate-800 px-1 py-0.5 rounded flex items-center space-x-0.5">
                                🍺 {room.activeSession.items.reduce((sum, item) => sum + item.quantity, 0)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer values status */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/45 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          room.status === 'available' ? 'bg-emerald-500' :
                          room.status === 'occupied' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-400'
                        }`}></span>
                        <span className={`font-semibold  text-[11px] uppercase tracking-wider ${stateColor}`}>{stateText}</span>
                      </div>
                      
                      {room.status === 'cleaning' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            completeCleaning(room.id);
                          }}
                          className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-1 rounded-md transition font-medium cursor-pointer"
                        >
                          Xong dọn
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Main selected Room Manager sidebar controller */}
          <div className="w-full lg:w-[480px] xl:w-[540px] border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/35 overflow-y-auto max-h-[70vh] lg:max-h-full flex flex-col">
            {selectedRoom ? (
              <div className="flex flex-col flex-1 p-5 space-y-5">
                {/* Header state inside controller */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-extrabold text-slate-100">{selectedRoom.name}</h2>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border font-mono tracking-wider ${
                        selectedRoom.type === 'vip' 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}>
                        {selectedRoom.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Đơn giá: <strong className="text-indigo-400">{formatVND(selectedRoom.hourlyPrice)}</strong> / Giờ hát
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2.5 py-1 rounded-xl font-bold border font-mono uppercase tracking-wider ${
                      selectedRoom.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      selectedRoom.status === 'occupied' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {selectedRoom.status === 'available' ? 'Trống' : selectedRoom.status === 'occupied' ? 'Đang hát' : 'Dọn dẹp'}
                    </span>
                    <button
                      onClick={() => setSelectedRoomId(null)}
                      className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition"
                      title="Đóng"
                    >
                      <X size={18} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* State: AVAILABLE */}
                {selectedRoom.status === 'available' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800/80 my-4 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200 text-sm">Phòng Sẵn Sàng Đón Khách</h3>
                      <p className="text-xs text-slate-500 mt-1">Hát tính phí tự động làm tròn phút</p>
                    </div>
                    
                    <button
                      onClick={() => handleStartRoom(selectedRoom.id)}
                      className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-semibold transition shadow-lg shadow-indigo-600/15 cursor-pointer"
                    >
                      <Play size={16} fill="white" />
                      <span>BẮT ĐẦU TÍNH GIỜ</span>
                    </button>
                  </div>
                )}

                {/* State: CLEANING */}
                {selectedRoom.status === 'cleaning' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800/80 my-4 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-spin">
                      <Brush size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200 text-sm">Đang dọn phòng & thay cốc nước</h3>
                      <p className="text-xs text-slate-500 mt-1">Khách cũ vừa thanh toán xong hóa đơn</p>
                    </div>
                    <button
                      onClick={() => completeCleaning(selectedRoom.id)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 px-4 rounded-xl font-bold transition duration-150 cursor-pointer"
                    >
                      Xác Nhận Đã Dọn Xong
                    </button>
                  </div>
                )}

                {/* State: OCCUPIED (Detailed Session calculations, Hostesses & Goods managers) */}
                {selectedRoom.status === 'occupied' && selectedRoom.activeSession && (
                  <div className="space-y-5 flex-1 flex flex-col justify-between">
                    
                    {/* Active Timer Block */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <ClockIcon size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block leading-none mb-1">THỜI GIAN SỬ DỤNG</span>
                            <span className="text-[11px] text-slate-300 block">
                              Vào: <strong className="text-emerald-400 font-mono">{formatDateTimeFull(selectedRoom.activeSession.startTime)}</strong>
                            </span>
                            <span className="text-[11px] text-slate-300 block mt-0.5">
                              Ra: <strong className="text-rose-400 font-mono">{customCheckoutTimeVal ? formatDateTimeFull(updateTimeInISOString(updateDateInISOString(selectedRoom.activeSession.startTime, customCheckoutDateVal || getDateStringFromISO(selectedRoom.activeSession.startTime)), customCheckoutTimeVal)) : 'Đang hát'}</strong>
                            </span>
                          </div>
                        </div>
                        <RoomTimer startTime={selectedRoom.activeSession.startTime} />
                      </div>

                      {/* Unified Time Controllers (Giờ Vào & Giờ Ra cùng 1 chỗ, hỗ trợ cả Ngày & Giờ) */}
                      <div className="pt-3 border-t border-slate-900/60 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Cột 1: Sửa giờ vào */}
                        <div className="space-y-1.5 border border-slate-800/30 p-2.5 rounded-xl bg-slate-950/10">
                          <span className="block text-slate-400 text-[10.5px] font-semibold uppercase tracking-wider mb-1">1. Giờ vào phòng</span>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase font-black">Ngày vào</span>
                              <input
                                type="date"
                                value={selectedRoom?.activeSession?.startTime ? getDateStringFromISO(selectedRoom.activeSession.startTime) : ''}
                                onChange={(e) => {
                                  const newD = e.target.value;
                                  if (newD && selectedRoom?.activeSession?.startTime) {
                                    const newISO = updateDateInISOString(selectedRoom.activeSession.startTime, newD);
                                    updateRoomSessionTimes(selectedRoom.id, newISO);
                                  }
                                }}
                                className="bg-slate-950 text-slate-100 rounded-lg p-1 px-2 border border-slate-800 text-[11px] font-mono font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer w-full"
                              />
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase font-black">Giờ vào</span>
                              <TimePicker24h
                                value={selectedRoom?.activeSession?.startTime ? get24hFromISOString(selectedRoom.activeSession.startTime) : ''}
                                onChange={(newVal) => {
                                  if (newVal && selectedRoom?.activeSession?.startTime) {
                                    const newISO = updateTimeInISOString(selectedRoom.activeSession.startTime, newVal);
                                    updateRoomSessionTimes(selectedRoom.id, newISO);
                                  }
                                }}
                                onResetToNow={() => {
                                  if (selectedRoom?.activeSession?.startTime) {
                                    const nowISO = new Date().toISOString();
                                    updateRoomSessionTimes(selectedRoom.id, nowISO);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Cột 2: Sửa giờ ra */}
                        <div className="space-y-1.5 border border-slate-800/30 p-2.5 rounded-xl bg-slate-950/10">
                          <div className="flex items-center justify-between mb-1">
                            <span className="block text-slate-400 text-[10.5px] font-semibold uppercase tracking-wider">2. Giờ ra phòng</span>
                            {!customCheckoutTimeVal && (
                              <span className="text-[9.5px] text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/25 animate-pulse">ĐANG HÁT</span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase font-black">Ngày ra</span>
                              <input
                                type="date"
                                disabled={!customCheckoutTimeVal}
                                value={customCheckoutDateVal || (selectedRoom?.activeSession?.startTime ? getDateStringFromISO(selectedRoom.activeSession.startTime) : '')}
                                onChange={(e) => setCustomCheckoutDateVal(e.target.value)}
                                className={`bg-slate-950 text-slate-100 rounded-lg p-1 px-2 border border-slate-800 text-[11px] font-mono font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer w-full ${!customCheckoutTimeVal ? 'opacity-40 cursor-not-allowed' : ''}`}
                              />
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase font-black">Giờ ra</span>
                              <TimePicker24h
                                value={customCheckoutTimeVal}
                                onChange={(newVal) => {
                                  setCustomCheckoutTimeVal(newVal);
                                  if (newVal && !customCheckoutDateVal && selectedRoom?.activeSession?.startTime) {
                                    setCustomCheckoutDateVal(getDateStringFromISO(selectedRoom.activeSession.startTime));
                                  }
                                }}
                                onResetToNow={() => {
                                  const now = new Date();
                                  setCustomCheckoutTimeVal(get24hFromISOString(now.toISOString()));
                                  setCustomCheckoutDateVal(getDateStringFromISO(now.toISOString()));
                                }}
                              />
                            </div>
                          </div>

                          {!customCheckoutTimeVal && (
                            <button
                              type="button"
                              onClick={() => handleStopRoomTimer(selectedRoom.id)}
                              className="w-full bg-rose-600/10 hover:bg-rose-600 border border-rose-500/25 hover:border-rose-500 text-rose-400 hover:text-white px-2 rounded-xl text-center text-[11px] font-bold h-[30px] flex items-center justify-center space-x-1.5 transition cursor-pointer mt-1"
                              id="btn-stop-timer"
                            >
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                              <span>DỪNG TÍNH GIỜ</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section: Hired Hostesses (Tiếp viên) */}
                    <div className="space-y-3 bg-slate-900/20 border border-slate-800/60 p-4 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <User size={14} className="text-amber-400" />
                          <span>Tiếp Viên Phục Vụ ({selectedRoom.activeSession.hostesses.length})</span>
                        </h4>
                        
                        <div className="relative">
                          <button
                            onClick={() => setShowHostessDropdown(!showHostessDropdown)}
                            className="bg-indigo-600/10 hover:bg-indigo-600/25 border border-indigo-500/25 text-indigo-400 text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition flex items-center space-x-1 cursor-pointer"
                          >
                            <UserPlus size={12} />
                            <span>Điều tiếp viên</span>
                          </button>

                          {/* Float selection list */}
                          <AnimatePresence>
                            {showHostessDropdown && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 overflow-hidden"
                              >
                                <div className="p-2.5 border-b border-slate-800 bg-slate-950 font-semibold text-xs text-slate-400">
                                  Chọn tiếp viên (Không giới hạn phòng):
                                </div>
                                <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                                  {hostesses.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-slate-600">
                                      Danh sách tiếp viên trống
                                    </div>
                                  ) : (
                                    hostesses.map(h => {
                                      const currentServingRoom = rooms.find(r => r.activeSession?.hostesses.some(subH => subH.hostessId === h.id && !subH.leftAt));
                                      const isAlreadyInThisRoom = selectedRoom.activeSession?.hostesses.some(subH => subH.hostessId === h.id && !subH.leftAt);
                                      
                                      return (
                                        <button
                                          key={h.id}
                                          disabled={isAlreadyInThisRoom}
                                          onClick={() => {
                                            addHostessToRoom(selectedRoom.id, h.id);
                                            setShowHostessDropdown(false);
                                          }}
                                          className={`w-full text-left p-2 rounded-lg hover:bg-slate-800 text-xs flex justify-between items-center transition cursor-pointer ${
                                            isAlreadyInThisRoom ? 'opacity-40 cursor-not-allowed' : ''
                                          }`}
                                        >
                                          <div>
                                            <div className="font-semibold text-slate-200">{h.name}</div>
                                            {currentServingRoom && (
                                              <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded font-medium">
                                                Làm {currentServingRoom.name}
                                              </span>
                                            )}
                                          </div>
                                          <div className="font-mono text-indigo-400">{formatVND(h.pricePerHour)}/h</div>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Hired hostesses list */}
                      {selectedRoom.activeSession.hostesses.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">Chưa điều tiếp viên nào vào phòng này</p>
                      ) : (
                        <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                          {selectedRoom.activeSession.hostesses.map(h => {
                            const isStillServing = !h.leftAt;
                            const diffMinutes = getDiffMinutesIgnoringSeconds(h.hiredAt, h.leftAt || currentTime);
                            const hrs = Math.floor(diffMinutes / 60);
                            const mins = diffMinutes % 60;
                            const durationStr = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;

                            return (
                              <div key={h.id} className="bg-slate-950/45 p-2 px-3 rounded-xl border border-slate-800/40 text-xs flex flex-col space-y-1.5 hover:border-slate-700/60 transition" id={`hostess-card-${h.id}`}>
                                {/* Row 1: Status circle + Name + Price & Actions */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1.5 min-w-0">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isStillServing ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                                    <span className="font-semibold text-slate-200 truncate">{h.name}</span>
                                    <span className="text-[10px] text-indigo-400 font-mono shrink-0">({formatVND(h.pricePerHour)}/h)</span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1 shrink-0">
                                    {/* Action Buttons */}
                                    {isStillServing ? (
                                      <button
                                        type="button"
                                        onClick={() => removeHostessFromRoom(selectedRoom.id, h.id)}
                                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[9.5px] px-1.5 py-0.5 rounded transition font-bold cursor-pointer"
                                        title="Bấm để dắt ra khỏi phòng"
                                      >
                                        Cho ra
                                      </button>
                                    ) : (
                                      <div className="flex items-center space-x-1">
                                        <span className="text-[9px] text-zinc-500 bg-zinc-500/15 border border-zinc-500/25 px-1 py-0.2 rounded font-semibold uppercase">Đã ra</span>
                                        {(() => {
                                          const hasActiveSession = selectedRoom.activeSession?.hostesses.some(subH => subH.hostessId === h.hostessId && !subH.leftAt);
                                          if (hasActiveSession) return false;
                                          const newerSessionExists = selectedRoom.activeSession?.hostesses.some(
                                            subH => subH.hostessId === h.hostessId && new Date(subH.hiredAt).getTime() > new Date(h.hiredAt).getTime()
                                          );
                                          return !newerSessionExists;
                                        })() && (
                                          <button
                                            type="button"
                                            onClick={() => resumeHostessSession(selectedRoom.id, h.id)}
                                            className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/20 text-[9.5px] px-1.5 py-0.5 rounded transition font-bold cursor-pointer"
                                            title="Bấm để tiếp viên này quay trở lại chạy tiếp giờ"
                                          >
                                            Chạy tiếp
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Expand/Collapse Edit Timings */}
                                    <button
                                      type="button"
                                      onClick={() => setEditingHostessTimeId(editingHostessTimeId === h.id ? null : h.id)}
                                      className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer ${editingHostessTimeId === h.id ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'}`}
                                      title="Sửa giờ phục vụ của tiếp viên"
                                      id={`edit-hostess-time-${h.id}`}
                                    >
                                      <Pencil size={11} />
                                    </button>

                                    {/* Delete button */}
                                    <button
                                      type="button"
                                      onClick={() => deleteHostessSession(selectedRoom.id, h.id)}
                                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                                      title="Xóa lượt phục vụ này"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>

                                {/* Row 2: Service time logs read-only */}
                                <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
                                  <div className="flex items-center space-x-1">
                                    <span>Vào: <strong className="text-emerald-400/95 font-medium">{formatDateTimeFull(h.hiredAt)}</strong></span>
                                    {h.leftAt && (
                                      <>
                                        <span>→</span>
                                        <span>Ra: <strong className="text-slate-300 font-semibold">{formatDateTimeFull(h.leftAt)}</strong></span>
                                      </>
                                    )}
                                  </div>
                                  <span className="text-[9.5px] bg-slate-900 border border-slate-800/80 px-1 py-0.2 rounded font-bold text-indigo-300">{durationStr}</span>
                                </div>

                                {/* Row 3 (Collapsible Adjusters): Time pickers adjusters */}
                                {editingHostessTimeId === h.id && (
                                  <div className="pt-2 border-t border-slate-900/60 space-y-2 pb-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {/* Sửa giờ vào tiếp viên */}
                                      <div className="space-y-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-900/40">
                                        <span className="block text-slate-400 text-[9.5px] font-bold uppercase tracking-wider mb-1">Giờ vào tiếp viên:</span>
                                        <div className="flex flex-col space-y-1">
                                          <div className="flex flex-col space-y-0.5">
                                            <span className="text-[8.5px] text-zinc-500 uppercase font-black">Ngày vào</span>
                                            <input
                                              type="date"
                                              value={getDateStringFromISO(h.hiredAt)}
                                              onChange={(e) => {
                                                const newD = e.target.value;
                                                if (newD) {
                                                  const newIn = updateDateInISOString(h.hiredAt, newD);
                                                  updateHostessSessionTimes(selectedRoom.id, h.id, newIn, h.leftAt);
                                                }
                                              }}
                                              className="bg-slate-950 text-slate-100 rounded-lg p-1 border border-slate-800 text-[10.5px] font-mono font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer w-full"
                                            />
                                          </div>
                                          <div className="flex flex-col space-y-0.5">
                                            <span className="text-[8.5px] text-zinc-500 uppercase font-black">Giờ vào</span>
                                            <TimePicker24h
                                              value={get24hFromISOString(h.hiredAt)}
                                              onChange={(newVal) => {
                                                if (newVal) {
                                                  const newIn = updateTimeInISOString(h.hiredAt, newVal);
                                                  updateHostessSessionTimes(selectedRoom.id, h.id, newIn, h.leftAt);
                                                }
                                              }}
                                              onResetToNow={() => {
                                                const nowISO = new Date().toISOString();
                                                updateHostessSessionTimes(selectedRoom.id, h.id, nowISO, h.leftAt);
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Sửa giờ ra tiếp viên */}
                                      <div className="space-y-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-900/40">
                                        <span className="block text-slate-400 text-[9.5px] font-bold uppercase tracking-wider mb-1">Giờ ra tiếp viên:</span>
                                        <div className="flex flex-col space-y-1">
                                          <div className="flex flex-col space-y-0.5">
                                            <span className="text-[8.5px] text-zinc-500 uppercase font-black">Ngày ra</span>
                                            <input
                                              type="date"
                                              disabled={!h.leftAt}
                                              value={h.leftAt ? getDateStringFromISO(h.leftAt) : ''}
                                              onChange={(e) => {
                                                const newD = e.target.value;
                                                if (newD && h.leftAt) {
                                                  const newOut = updateDateInISOString(h.leftAt, newD);
                                                  updateHostessSessionTimes(selectedRoom.id, h.id, h.hiredAt, newOut);
                                                }
                                              }}
                                              className={`bg-slate-950 text-slate-100 rounded-lg p-1 border border-slate-800 text-[10.5px] font-mono font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer w-full ${!h.leftAt ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            />
                                          </div>
                                          <div className="flex flex-col space-y-0.5">
                                            <span className="text-[8.5px] text-zinc-500 uppercase font-black">Giờ ra</span>
                                            <TimePicker24h
                                              value={h.leftAt ? get24hFromISOString(h.leftAt) : ''}
                                              onChange={(newVal) => {
                                                const newOut = newVal ? updateTimeInISOString(h.leftAt || h.hiredAt, newVal) : undefined;
                                                updateHostessSessionTimes(selectedRoom.id, h.id, h.hiredAt, newOut);
                                              }}
                                              onResetToNow={() => {
                                                const nowISO = new Date().toISOString();
                                                updateHostessSessionTimes(selectedRoom.id, h.id, h.hiredAt, nowISO);
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setEditingHostessTimeId(null)}
                                      className="w-full bg-slate-900/60 hover:bg-slate-900 py-1 rounded text-[10px] text-indigo-400 border border-slate-805 hover:text-indigo-300 hover:border-slate-800 font-bold transition cursor-pointer text-center"
                                    >
                                      Xong
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section: Goods Selection & Selected items list */}
                    <div className="space-y-3 flex-1 min-h-[160px] flex flex-col justify-start">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <UtensilsCrossed size={14} className="text-amber-400" />
                          <span>Dịch vụ & Đồ dùng ({selectedRoom.activeSession.items.reduce((sum, i) => sum + i.quantity, 0)})</span>
                        </h4>
                      </div>

                      {/* Interactive Add list with search category toggle */}
                      <div className="bg-slate-950/45 border border-slate-800 p-3.5 rounded-2xl flex flex-col space-y-2.5">
                        <div className="flex space-x-1 pb-1">
                          {(['all', 'drink', 'food', 'other'] as const).map(cat => (
                            <button
                              key={cat}
                              onClick={() => setGoodsCategoryFilter(cat)}
                              className={`text-[10.5px] px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                                goodsCategoryFilter === cat 
                                  ? 'bg-indigo-600 font-bold text-white' 
                                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {cat === 'all' ? 'Tất cả' : cat === 'drink' ? 'Đồ uống' : cat === 'food' ? 'Đồ ăn' : 'Khác'}
                            </button>
                          ))}
                        </div>

                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                          <input
                            type="text"
                            placeholder="Tìm đồ ăn, thức uống..."
                            value={goodSearchQuery}
                            onChange={(e) => setGoodSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none border border-slate-800 focus:border-indigo-600/50"
                          />
                        </div>

                        {/* Inventory List selection scrollbar */}
                        <div className="max-h-32 overflow-y-auto border border-slate-800/80 rounded-lg p-1 bg-slate-950/20 divide-y divide-slate-800/40">
                          {getFilteredGoods().map(item => (
                            <div key={item.id} className="flex items-center justify-between p-1.5 text-xs">
                              <div>
                                <span className="font-semibold text-slate-200">{item.name}</span>
                                <span className="text-[10px] text-zinc-500 font-mono block">
                                  {formatVND(item.price)} / {item.unit}
                                </span>
                              </div>
                              <button
                                onClick={() => addGoodsToRoom(selectedRoom.id, item.id, 1)}
                                className="bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white p-1 rounded-md transition cursor-pointer"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Selected Items details inside the Room */}
                      <div className="space-y-1.5 max-h-64 overflow-y-auto w-full">
                        {selectedRoom.activeSession.items.length === 0 ? (
                          <div className="text-center py-6 text-slate-600 text-xs italic bg-slate-900/10 border border-slate-800/20 rounded-xl leading-relaxed">
                            Chưa gọi đồ có sẵn. Sử dụng bảng trên để thêm nhanh đồ uống, trái cây.
                          </div>
                        ) : (
                          selectedRoom.activeSession.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/45 text-xs">
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-200 truncate">{item.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {formatVND(item.price)} / {item.unit}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3 ml-2 shrink-0">
                                <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1">
                                  <button
                                    onClick={() => addGoodsToRoom(selectedRoom.id, item.id, -1)}
                                    className="text-slate-400 hover:text-white p-0.5"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  {editingGoodsQtyId === item.id ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={editingGoodsQtyValue}
                                      onChange={(e) => setEditingGoodsQtyValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const newQty = parseInt(editingGoodsQtyValue, 10);
                                          if (!isNaN(newQty) && newQty > 0) {
                                            setGoodsQuantityInRoom(selectedRoom.id, item.id, newQty);
                                          }
                                          setEditingGoodsQtyId(null);
                                          setEditingGoodsQtyValue('');
                                        }
                                      }}
                                      onBlur={() => {
                                        const newQty = parseInt(editingGoodsQtyValue, 10);
                                        if (!isNaN(newQty) && newQty > 0) {
                                          setGoodsQuantityInRoom(selectedRoom.id, item.id, newQty);
                                        }
                                        setEditingGoodsQtyId(null);
                                        setEditingGoodsQtyValue('');
                                      }}
                                      className="font-mono font-bold text-slate-200 px-1 text-center min-w-[35px] bg-slate-900 border border-indigo-500 rounded outline-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="font-mono font-bold text-slate-200 px-1 text-center min-w-[16px] cursor-pointer hover:text-indigo-400 hover:bg-slate-900/50 rounded px-2 py-0.5 transition"
                                      onClick={() => {
                                        setEditingGoodsQtyId(item.id);
                                        setEditingGoodsQtyValue(item.quantity.toString());
                                      }}
                                      title="Click to edit quantity"
                                    >
                                      {item.quantity}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => addGoodsToRoom(selectedRoom.id, item.id, 1)}
                                    className="text-slate-400 hover:text-white p-0.5"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>

                                <span className="font-mono text-slate-300 font-semibold w-20 text-right">
                                  {formatVND(item.price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Bottom active total & checkout calculation */}
                    <div className="border-t border-slate-800 pt-4 space-y-4">

                      {/* Pricing preview summary list */}
                      <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/30">
                        <div className="flex justify-between">
                          <span>Tiền hàng hóa dịch vụ:</span>
                          <span className="font-mono text-slate-200 font-semibold">
                            {formatVND(selectedRoom.activeSession.items.reduce((sum, i) => sum + i.price * i.quantity, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tiền phục vụ ước tính:</span>
                          <span className="font-mono text-slate-200 font-semibold text-right">
                            {formatVND(selectedRoom.activeSession.hostesses.reduce((sum, h) => {
                              // If custom end is enabled, compute until that time, else now
                              const targetCheckoutTime = customCheckoutTimeVal
                                ? updateTimeInISOString(h.hiredAt, customCheckoutTimeVal)
                                : currentTime;
                                
                              const finalExit = h.leftAt ? h.leftAt : targetCheckoutTime;
                              const diff = getDiffMinutesIgnoringSeconds(h.hiredAt, finalExit);
                              return sum + Math.round((diff / 60) * h.pricePerHour);
                            }, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tiền phòng ước tính:</span>
                          <span className="font-mono text-slate-200 font-semibold">
                            {(() => {
                              const targetCheckoutTime = customCheckoutTimeVal
                                ? updateTimeInISOString(selectedRoom.activeSession.startTime, customCheckoutTimeVal)
                                : currentTime;
                              const diff = getDiffMinutesIgnoringSeconds(selectedRoom.activeSession.startTime, targetCheckoutTime);
                              return formatVND(Math.round((diff / 60) * selectedRoom.hourlyPrice));
                            })()}
                          </span>
                        </div>
                        
                        <div className="border-b border-dashed border-slate-800 my-1"></div>
                        
                        <div className="flex justify-between text-xs font-bold text-slate-200 pt-0.5">
                          <span>TỔNG TIỀN DỰ TÍNH:</span>
                          <span className="text-emerald-400 font-mono text-sm leading-none">
                            {(() => {
                              const targetCheckoutTime = customCheckoutTimeVal
                                ? updateTimeInISOString(selectedRoom.activeSession.startTime, customCheckoutTimeVal)
                                : currentTime;
                              const roomChg = Math.round((getDiffMinutesIgnoringSeconds(selectedRoom.activeSession.startTime, targetCheckoutTime) / 60) * selectedRoom.hourlyPrice);
                              const hItemsChg = selectedRoom.activeSession.items.reduce((s, i) => s + i.price * i.quantity, 0);
                              const hostChg = selectedRoom.activeSession.hostesses.reduce((sum, h) => {
                                const targetHCheckout = customCheckoutTimeVal
                                  ? updateTimeInISOString(h.hiredAt, customCheckoutTimeVal)
                                  : currentTime;
                                const finalExit = h.leftAt ? h.leftAt : targetHCheckout;
                                const hDiff = getDiffMinutesIgnoringSeconds(h.hiredAt, finalExit);
                                return sum + Math.round((hDiff / 60) * h.pricePerHour);
                              }, 0);
                              return formatVND(roomChg + hItemsChg + hostChg);
                            })()}
                          </span>
                        </div>
                      </div>

                      {isCancellingRoom ? (
                        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-500/30 space-y-3 mt-3">
                          <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <XCircle size={14} />
                            <span>XÁC NHẬN HỦY PHÒNG HÁT</span>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                              Lý do hủy phòng:
                            </label>
                            <input
                              type="text"
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              placeholder="Ví dụ: Khách đổi ý không hát nữa..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-rose-500 transition font-sans placeholder:text-slate-600"
                              id="input-cancel-reason"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setIsCancellingRoom(false);
                                setCancelReason('');
                              }}
                              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                              id="btn-cancel-abort"
                            >
                              Quay lại
                            </button>
                            <button
                              onClick={() => handleCancelRoom(selectedRoom.id)}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                              id="btn-cancel-confirm"
                            >
                              Hủy phòng
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-3">
                          {/* Main Checkout and Invoice trigger */}
                          <button
                            onClick={() => handleCheckout(selectedRoom.id)}
                            className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-rose-600/15 cursor-pointer"
                            id="btn-checkout-room"
                          >
                            <Receipt size={18} />
                            <span>THANH TOÁN &amp; XUẤT HÓA ĐƠN</span>
                          </button>

                          {/* Cancellation Button */}
                          {currentUser.role === 'manager' ? (
                            <button
                              onClick={() => setIsCancellingRoom(true)}
                              className="w-full flex items-center justify-center space-x-1.5 bg-slate-900/60 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 py-2 rounded-xl transition cursor-pointer font-bold text-xs"
                              id="btn-cancel-trigger"
                            >
                              <XCircle size={14} />
                              <span>HỦY PHÒNG HÁT SỐ GIỜ</span>
                            </button>
                          ) : (
                            <div 
                              className="w-full flex items-center justify-center space-x-1.5 bg-slate-950/40 text-slate-600 border border-slate-900 py-2 rounded-xl font-bold text-xs cursor-not-allowed select-none" 
                              title="Chỉ tài khoản Quản lý mới được hủy phòng"
                              id="btn-cancel-locked"
                            >
                              <Lock size={12} className="text-slate-600" />
                              <span>HỦY PHÒNG HÁT (CẦN QUẢN LÝ)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            ) : (
              // Empty selection state
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 my-16 space-y-3">
                <div className="w-12 h-12 rounded-full border border-dashed border-slate-800 flex items-center justify-center">
                  <Info size={20} className="text-slate-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Thông Tin Phòng</h3>
                  <p className="text-xs text-slate-600 max-w-[210px] mx-auto mt-1 leading-relaxed">
                    Nhấp chọn bất kỳ phòng hát nào từ danh sơ đồ để truy cập menu gọi nước hoặc lập thanh toán hóa đơn.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Invoice Modal for Automatic Print break details */}
      <InvoiceModal 
        order={activeInvoice} 
        onClose={() => setActiveInvoice(null)} 
      />

      {/* Room CRUD Administrative Modal */}
      <AnimatePresence>
        {isRoomCRUDOpen && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden"
            >
              {/* Header Box */}
              <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                    <Settings size={16} className="text-indigo-400" />
                    <span>Thiết lập Danh Sách Phòng Hát và Phòng Chờ</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tạo mới, sửa tên, chỉnh giá hoặc xóa phòng hát karaoke khỏi hệ thống sơ đồ</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRoomCRUDOpen(false);
                    handleCancelRoomForm();
                  }}
                  className="text-slate-400 hover:text-slate-200 bg-slate-800/40 p-1.5 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Box - Grid layout */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[70vh] overflow-y-auto">
                
                {/* Form column (5 units in grid) */}
                <form onSubmit={handleSubmitRoom} className="md:col-span-5 bg-slate-950/30 p-4.5 rounded-xl border border-slate-800/80 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                      {editingRoomId ? 'Cập Nhật Phòng' : 'Thêm Phòng Mới'}
                    </h4>

                    {/* Room Name */}
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">
                        Tên phòng:
                      </label>
                      <input
                        type="text"
                        required
                        value={roomFormName}
                        onChange={(e) => setRoomFormName(e.target.value)}
                        placeholder="Ví dụ: Phòng 101, Phòng Chờ 1"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition font-sans"
                      />
                    </div>

                    {/* Room Type */}
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                        Loại phòng:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRoomFormType('standard')}
                          className={`py-2 px-3 border rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                            roomFormType === 'standard'
                              ? 'bg-slate-800 border-indigo-500 text-slate-100'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Phòng Thường</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoomFormType('vip')}
                          className={`py-2 px-3 border rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                            roomFormType === 'vip'
                              ? 'bg-slate-800 border-amber-500 text-amber-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          <span>Phòng VIP</span>
                        </button>
                      </div>
                    </div>

                    {/* Room Hourly Price */}
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">
                        Giá tiền một giờ (đ/h):
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={roomFormPrice}
                        onChange={(e) => setRoomFormPrice(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition font-mono mb-1"
                      />
                      <span className="text-[10px] text-amber-400 italic block leading-normal mt-1">
                        * Có thể điền 0đ cho phòng chờ / khách vãng lai chỉ mua đồ lẻ.
                      </span>
                    </div>
                  </div>

                  {/* Buttons line */}
                  <div className="flex space-x-2 pt-4">
                    {editingRoomId && (
                      <button
                        type="button"
                        onClick={handleCancelRoomForm}
                        className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-indigo-600/15"
                    >
                      {editingRoomId ? 'Lưu lại' : 'Tạo Phòng'}
                    </button>
                  </div>
                </form>

                {/* Rooms List column (7 units in grid) */}
                <div className="md:col-span-7 flex flex-col space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                    Danh Sách Phòng Hiện Tại ({rooms.length})
                  </h4>

                  <div className="overflow-y-auto space-y-2 max-h-[45vh] pr-1.5">
                    {rooms.map(room => (
                      <div
                        key={room.id}
                        className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between hover:border-slate-800 transition shadow-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-200">{room.name}</span>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none ${
                              room.type === 'vip' 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                            }`}>
                              {room.type}
                            </span>
                            
                            {/* Current Room Status Label */}
                            <span className={`text-[8.5px] px-1 rounded-sm ${
                              room.status === 'occupied' 
                                ? 'bg-indigo-500/20 text-indigo-400' 
                                : room.status === 'cleaning'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {room.status === 'occupied' ? 'Bận dọn' : room.status === 'cleaning' ? 'Dọn' : 'Trống'}
                            </span>
                          </div>
                          
                          <span className="text-[10.5px] text-slate-500 mt-1 font-mono block">
                            Đơn giá: <strong className="text-indigo-450">{room.hourlyPrice === 0 ? '0 đ/h (Phòng chờ)' : `${room.hourlyPrice.toLocaleString()} đ/h`}</strong>
                          </span>
                        </div>

                        {/* Edit and Delete Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditRoomClick(room)}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 p-2 rounded-lg transition cursor-pointer"
                            title="Sửa phòng"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoomClick(room)}
                            className={`bg-slate-900 border p-2 rounded-lg transition cursor-pointer ${
                              room.status === 'occupied'
                                ? 'border-slate-900 text-slate-550 opacity-40 cursor-not-allowed'
                                : 'hover:bg-red-950/20 border-slate-800 hover:border-red-500/30 text-rose-400 hover:text-rose-300'
                            }`}
                            disabled={room.status === 'occupied'}
                            title={room.status === 'occupied' ? 'Không thể xóa phòng đang có khách hát' : 'Xóa phòng'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              
               {/* Footer */}
              <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoomCRUDOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Beautiful High-Contrast Custom confirmation dialog */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-[100] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold">!</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">{confirmState.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{confirmState.message}</p>
                </div>
              </div>
              <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmState(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold hover:scale-[1.02] transition cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={confirmState.onConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                >
                  Đồng ý
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

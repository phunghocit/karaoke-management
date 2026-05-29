/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useAppState } from '../context/AppContext';
import { Order } from '../types';
import InvoiceModal from './InvoiceModal';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Users, 
  Filter, 
  BarChart, 
  HelpCircle, 
  ShoppingBag, 
  ChevronRight, 
  TrendingUp, 
  Moon,
  Trophy,
  Award,
  Sparkles
} from 'lucide-react';

export default function ReportView() {
  const { orders } = useAppState();

  // Custom datetime range selectors (Defaulting to past 7 days)
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0); // start of day
    // Local ISO string formatter for datetime-local
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }, []);

  const defaultEndDate = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999); // end of day
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }, []);

  const [startTime, setStartTime] = useState(defaultStartDate);
  const [endTime, setEndTime] = useState(defaultEndDate);
  const [hostessSortKey, setHostessSortKey] = useState<'minutes' | 'earnings'>('minutes');
  const [activeInvoice, setActiveInvoice] = useState<Order | null>(null);

  // Quick Preset Filters (Today, This Week, This Month)
  const handlePresetFilter = (preset: 'today' | 'week' | 'month') => {
    const start = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    const startStr = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const endStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStartTime(startStr);
    setEndTime(endStr);
  };

  // Filter orders by active datetime limit range
  const filteredOrders = useMemo(() => {
    const rangeStart = new Date(startTime).getTime();
    const rangeEnd = new Date(endTime).getTime();

    return orders.filter(o => {
      const created = new Date(o.createdAt).getTime();
      return created >= rangeStart && created <= rangeEnd;
    });
  }, [orders, startTime, endTime]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalRoom = 0;
    let totalGoods = 0;
    let totalHostess = 0;
    let totalMinutes = 0;
    let cancelledCount = 0;

    filteredOrders.forEach(o => {
      if (o.isCancelled) {
        cancelledCount += 1;
        return;
      }
      totalRevenue += o.totalAmount;
      totalRoom += o.roomCharge;
      totalGoods += o.goodsCharge;
      totalHostess += o.hostessCharge;
      totalMinutes += o.durationMinutes;
    });

    return {
      totalRevenue,
      totalRoom,
      totalGoods,
      totalHostess,
      totalMinutes,
      orderCount: filteredOrders.length - cancelledCount,
      cancelledCount
    };
  }, [filteredOrders]);

  // Chart aggregation: Group by Date
  const chartData = useMemo(() => {
    const map: { [dateStr: string]: number } = {};
    
    // Seed dates inside active range first to show gaps
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const diffDays = Math.min(30, Math.ceil((endMs - startMs) / (1000 * 3600 * 24))); // Cap to 30 days for design spacing
    
    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(startMs + i * 24 * 3600 * 1000);
      const label = d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' });
      map[label] = 0;
    }

    filteredOrders.forEach(o => {
      if (o.isCancelled) return;
      const label = new Date(o.createdAt).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' });
      if (map[label] !== undefined) {
        map[label] += o.totalAmount;
      } else {
        map[label] = o.totalAmount;
      }
    });

    return Object.entries(map).map(([key, val]) => ({
      date: key,
      amount: val
    })).slice(-15); // Show last 15 days max for spacing balance
  }, [filteredOrders, startTime, endTime]);

  const maxChartVal = useMemo(() => {
    const vals = chartData.map(d => d.amount);
    return Math.max(...vals, 100000); // minimum scale limit
  }, [chartData]);

  // Goods sold quantity statistics
  const goodsStats = useMemo(() => {
    const map: { [goodsName: string]: { name: string; quantity: number; revenue: number; unit: string } } = {};
    filteredOrders.forEach(o => {
      if (o.isCancelled) return;
      o.items.forEach(item => {
        const key = item.name;
        if (!map[key]) {
          map[key] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            unit: item.unit || 'phần'
          };
        }
        map[key].quantity += item.quantity;
        map[key].revenue += item.price * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [filteredOrders]);

  // Hostess session service statistics
  const hostessStats = useMemo(() => {
    const map: { [hostessId: string]: { id: string; name: string; totalMinutes: number; totalEarnings: number } } = {};
    filteredOrders.forEach(o => {
      if (o.isCancelled) return;
      o.hostesses.forEach(h => {
        const id = h.hostessId;
        const hiredClean = new Date(h.hiredAt);
        hiredClean.setSeconds(0, 0);
        const exitClean = new Date(h.leftAt ? h.leftAt : o.endTime);
        exitClean.setSeconds(0, 0);
        
        const durationMinutes = Math.max(0, Math.floor((exitClean.getTime() - hiredClean.getTime()) / 60000));
        const earnings = Math.round((durationMinutes / 60) * h.pricePerHour);

        if (!id) return; // guard safety

        if (!map[id]) {
          map[id] = {
            id,
            name: h.name,
            totalMinutes: 0,
            totalEarnings: 0
          };
        }
        map[id].totalMinutes += durationMinutes;
        map[id].totalEarnings += earnings;
      });
    });
    return Object.values(map);
  }, [filteredOrders]);

  const sortedHostessStats = useMemo(() => {
    return [...hostessStats].sort((a, b) => {
      if (hostessSortKey === 'minutes') {
        return b.totalMinutes - a.totalMinutes;
      } else {
        return b.totalEarnings - a.totalEarnings;
      }
    });
  }, [hostessStats, hostessSortKey]);

  const maxGoodsQuantity = useMemo(() => {
    const vals = goodsStats.map(g => g.quantity);
    return Math.max(...vals, 1);
  }, [goodsStats]);

  const maxHostessVal = useMemo(() => {
    const vals = sortedHostessStats.map(h => hostessSortKey === 'minutes' ? h.totalMinutes : h.totalEarnings);
    return Math.max(...vals, 1);
  }, [sortedHostessStats, hostessSortKey]);

  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ';
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
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header section */}
        <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-indigo-500 rounded-xs"></span>
              <span>Báo Cáo Thống Kê Doanh Thu</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Phân tích doanh thu, giờ hát kĩ càng dựa trên khoảng thời gian lọc tự động hoặc tùy chọn giờ giấc
            </p>
          </div>
          
          {/* Quick presets */}
          <div className="flex items-center space-x-1 border border-slate-800 bg-slate-900/50 p-1.5 rounded-xl text-xs">
            <button
              onClick={() => handlePresetFilter('today')}
              className="px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition text-slate-400 cursor-pointer font-medium"
            >
              Hôm nay
            </button>
            <button
              onClick={() => handlePresetFilter('week')}
              className="px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition text-slate-400 cursor-pointer font-medium"
            >
              Tuần này
            </button>
            <button
              onClick={() => handlePresetFilter('month')}
              className="px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition text-slate-400 cursor-pointer font-medium"
            >
              Tháng này
            </button>
          </div>
        </div>

        {/* TIME HOUR COMPREHENSIVE FILTER ENGINE (Từ giờ của ngày này đến giờ của ngày kia) */}
        <div className="bg-slate-900/60 border border-slate-900 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-end">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full text-xs">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10.5px] text-slate-400 font-mono flex items-center mb-1">
                <Calendar size={12} className="mr-1.5 text-indigo-400" />
                <span>TỪ GIỜ CỦA NGÀY (Start date & hour):</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 font-mono cursor-pointer"
                id="filter-start-time"
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-[10.5px] text-slate-400 font-mono flex items-center mb-1">
                <Calendar size={12} className="mr-1.5 text-indigo-400" />
                <span>ĐẾN GIỜ CỦA NGÀY (End date & hour):</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 font-mono cursor-pointer"
                id="filter-end-time"
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex justify-end">
            <span className="text-[10px] text-zinc-500 font-mono bg-slate-950/40 border border-slate-800 py-1.5 px-3 rounded-lg flex items-center space-x-1.5 w-full md:w-auto text-center justify-center select-none">
              <Filter size={11} className="text-zinc-400" />
              <span>Đang áp dụng khoảng thời gian</span>
            </span>
          </div>
        </div>

        {/* METRICS DASHBOARD CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 transition shadow-inner">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10.5px] text-slate-400 font-mono uppercase tracking-wider block">Tổng doanh thu</span>
                <span className="text-xl font-black text-emerald-400 block tracking-tight">{formatVND(stats.totalRevenue)}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800 font-mono">
              Doanh số chốt từ hóa đơn thanh toán
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 transition shadow-inner">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10.5px] text-slate-400 font-mono uppercase tracking-wider block">Tiền hát Karaoke</span>
                <span className="text-xl font-black text-slate-200 block tracking-tight">{formatVND(stats.totalRoom)}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-505/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Moon size={16} />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800 font-mono">
              Chiếm {stats.totalRevenue > 0 ? Math.round((stats.totalRoom / stats.totalRevenue) * 100) : 0}% tổng doanh thu
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 transition shadow-inner">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10.5px] text-slate-400 font-mono uppercase tracking-wider block">Tiền ăn uống/đồ dùng</span>
                <span className="text-xl font-black text-slate-200 block tracking-tight">{formatVND(stats.totalGoods)}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-orange-505/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <ShoppingBag size={16} />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800 font-mono">
              Chiếm {stats.totalRevenue > 0 ? Math.round((stats.totalGoods / stats.totalRevenue) * 100) : 0}% tổng doanh thu
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 transition shadow-inner">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10.5px] text-slate-400 font-mono uppercase tracking-wider block">Số lượt checkout</span>
                <span className="text-xl font-black text-slate-200 block tracking-tight">{stats.orderCount} hoá đơn</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-indigo-450">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800 font-mono">
              Tổng giờ hát: {Math.round(stats.totalMinutes / 6) / 10} Giờ
            </div>
          </div>

        </div>

        {/* CUSTOM METRIC BAR GRAPH PLOTTED VIA SVG (High stability) */}
        <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart size={18} className="text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">DOANH THU THEO TỪNG NGÀY TRONG KHOẢNG</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">Cập nhật mỗi khi chốt hóa đơn</span>
          </div>

          <div className="pt-3">
            {chartData.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-xs">Chưa có đủ dữ liệu hóa đơn giao dịch để dựng biểu đồ</div>
            ) : (
              <div className="space-y-6">
                {/* Plotted vector grid */}
                <div className="h-48 md:h-64 flex items-end space-x-3 md:space-x-4 border-b border-l border-slate-800 px-4 pb-1">
                  {chartData.map((d, index) => {
                    const percent = (d.amount / maxChartVal) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group cursor-help relative md:py-2">
                        {/* Interactive Tooltip showing real VND hover */}
                        <div className="absolute pb-1 bottom-full opacity-0 group-hover:opacity-100 bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold text-[10px] p-1.5 rounded-lg whitespace-nowrap z-10 transition duration-100 pointer-events-none shadow-2xl">
                          {formatVND(d.amount)}
                        </div>

                        {/* Solid Bar graphic style */}
                        <div 
                          style={{ height: `${Math.max(4, percent)}%` }} 
                          className={`w-full max-w-[24px] rounded-t-md transition-all duration-300 ${
                            d.amount > 0 
                              ? 'bg-indigo-600 group-hover:bg-emerald-400 shadow-md shadow-indigo-600/10 hover:shadow-emerald-400/10' 
                              : 'bg-slate-800/30'
                          }`}
                        ></div>

                        {/* Date label */}
                        <span className="text-[9.5px] text-zinc-500 font-mono mt-2 origin-center -rotate-12 whitespace-nowrap md:rotate-0 pt-1">
                          {d.date}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend indicator */}
                <div className="flex justify-center items-center space-x-4 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-600"></span>
                    <span>Hóa đơn phát sinh doanh số</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-slate-800"></span>
                    <span>Không phát sinh doanh số</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GOODS AND STAFF STATISTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Goods sales stats */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag size={18} className="text-orange-400" />
                <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">HÀNG HÓA BÁN CHẠY NHẤT</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Xếp theo số lượng</span>
            </div>

            <div className="overflow-y-auto max-h-[350px] pr-1.5 space-y-3">
              {goodsStats.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Không có dữ liệu hàng hóa bán ra trong khoảng thời gian này.
                </div>
              ) : (
                goodsStats.map((item, idx) => {
                  const widthPercent = (item.quantity / maxGoodsQuantity) * 100;
                  return (
                    <div key={item.name} className="bg-slate-950/40 border border-slate-800/40 p-3 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-[10px] font-mono text-slate-400 font-extrabold shadow-sm">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-200">{item.name}</span>
                        </div>
                        <div className="text-right font-mono text-slate-400">
                          <span className="text-slate-200 font-extrabold">{item.quantity}</span> {item.unit}
                        </div>
                      </div>

                      {/* Micro bar and revenue details */}
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${widthPercent}%` }} 
                            className="bg-orange-500/80 rounded-full h-full"
                          ></div>
                        </div>
                        <span className="text-[10.5px] font-mono text-emerald-400 font-bold w-24 text-right">
                          {formatVND(item.revenue)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Hostess Leaderboard Rankings */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Trophy size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">XẾP HẠNG TIẾP VIÊN</h3>
              </div>
              
              {/* Toggle switch */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHostessSortKey('minutes')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                    hostessSortKey === 'minutes'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Theo Phút Làm
                </button>
                <button
                  type="button"
                  onClick={() => setHostessSortKey('earnings')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                    hostessSortKey === 'earnings'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Theo Tiền Kiếm
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[350px] pr-1.5 space-y-3">
              {sortedHostessStats.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Không có dữ liệu tiếp viên phục vụ trong khoảng thời gian này.
                </div>
              ) : (
                sortedHostessStats.map((hostess, idx) => {
                  const rawVal = hostessSortKey === 'minutes' ? hostess.totalMinutes : hostess.totalEarnings;
                  const displayVal = hostessSortKey === 'minutes' 
                    ? formatDurationHelper(hostess.totalMinutes) 
                    : formatVND(hostess.totalEarnings);
                  const barPercent = (rawVal / maxHostessVal) * 100;

                  return (
                    <div 
                      key={hostess.id} 
                      className={`border p-3 rounded-xl space-y-2 transition relative overflow-hidden ${
                        idx === 0 
                          ? 'bg-amber-950/10 border-amber-500/20 hover:border-amber-500/35' 
                          : idx === 1
                          ? 'bg-slate-900/40 border-slate-700/50 hover:border-slate-700'
                          : idx === 2
                          ? 'bg-amber-905/5 border-amber-900/15 hover:border-amber-800/25'
                          : 'bg-slate-950/40 border-slate-800/40 hover:border-slate-850'
                      }`}
                    >
                      {/* Decorative elements for leader */}
                      {idx === 0 && (
                        <div className="absolute right-3 top-3 opacity-25">
                          <Sparkles size={36} className="text-amber-500 animate-pulse" />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs relative z-10">
                        <div className="flex items-center space-x-2.5">
                          {idx === 0 ? (
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px] shadow-sm" title="Vô địch">
                              👑
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-300 text-slate-950 font-extrabold text-[10px] shadow-sm" title="Á quân 1">
                              🥈
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-700 text-slate-100 font-extrabold text-[10px] shadow-sm" title="Á quân 2">
                              🥉
                            </span>
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-850 text-slate-500 text-[10px] font-mono font-extrabold">
                              {idx + 1}
                            </span>
                          )}
                          <span className="font-bold text-slate-200">{hostess.name}</span>
                        </div>
                        <span className="font-mono font-extrabold text-slate-200 pl-2">
                          {displayVal}
                        </span>
                      </div>

                      {/* Visual gauge ratio */}
                      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden relative z-10 w-full">
                        <div 
                          style={{ width: `${barPercent}%` }} 
                          className={`rounded-full h-full ${
                            idx === 0 
                              ? 'bg-amber-400' 
                              : idx === 1 
                              ? 'bg-slate-300' 
                              : idx === 2 
                              ? 'bg-amber-700' 
                              : 'bg-indigo-500/80'
                          }`}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* DETAILS OF INVOICES INSIDE SELECTION */}
        <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">HÓA ĐƠN CHI TIẾT TRONG KHOẢNG LỌC ({filteredOrders.length})</h3>
          
          <div className="overflow-x-auto rounded-xl">
            {filteredOrders.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-xs">Không có hóa đơn phát sinh trong khung giờ đã lập.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[10px] uppercase font-mono tracking-wider">
                    <th className="p-3">Mã HĐ</th>
                    <th className="p-3">Phòng</th>
                    <th className="p-3">Thu ngân</th>
                    <th className="p-3">Thời gian hát</th>
                    <th className="p-3">Tiền dịch vụ</th>
                    <th className="p-3 text-right">Tổng thanh toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {filteredOrders.map(o => (
                    <tr 
                      key={o.id} 
                      onClick={() => setActiveInvoice(o)}
                      className={`hover:bg-indigo-950/30 cursor-pointer transition-colors ${o.isCancelled ? 'bg-red-950/5 text-slate-405 border-l-2 border-l-red-500' : ''}`}
                      title="Nhấp để xem chi tiết hóa đơn"
                    >
                      <td className="p-3 font-mono text-indigo-400 font-semibold">
                        {o.id}
                      </td>
                      <td className="p-3 font-bold">
                        {o.roomName}
                        {o.isCancelled && (
                          <div className="text-[10px] font-normal text-red-400 mt-0.5">
                            Hủy: {o.cancelReason}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">{o.createdBy}</td>
                      <td className={`p-3 ${o.isCancelled ? 'line-through text-slate-500' : ''}`}>{formatDurationHelper(o.durationMinutes)}</td>
                      <td className={`p-3 font-mono text-slate-400 ${o.isCancelled ? 'line-through text-slate-500' : ''}`}>
                        {formatVND(o.goodsCharge + o.hostessCharge)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {o.isCancelled ? (
                          <span className="text-red-400 font-bold">0 đ (Hủy)</span>
                        ) : (
                          <span className="font-bold text-emerald-400">{formatVND(o.totalAmount)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Reusable invoice details popup */}
      <InvoiceModal 
        order={activeInvoice} 
        onClose={() => setActiveInvoice(null)} 
      />
    </div>
  );
}

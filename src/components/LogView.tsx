/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { History, Search, Trash2, Calendar, User, Layers } from 'lucide-react';
import { motion } from 'motion/react';

export default function LogView() {
  const { logs, clearAllData, currentUser } = useAppState();
  const [query, setQuery] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchUser = log.user.toLowerCase().includes(query.toLowerCase());
    const matchAction = log.action.toLowerCase().includes(query.toLowerCase());
    const matchDetails = log.details.toLowerCase().includes(query.toLowerCase());
    return matchUser || matchAction || matchDetails;
  });

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${h}:${m}:${s} ${day}/${month}/${year}`;
  };

  const handleClearSystem = () => {
    if (window.confirm('CẢNH BÁO: Thao tác này sẽ xóa sạch toàn bộ lịch sử giao dịch, hóa đơn, thông tin phòng đang hát và tiếp viên, khôi phục về trạng thái xuất xưởng ban đầu. Bạn có đồng ý?')) {
      clearAllData();
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-indigo-500 rounded-xs"></span>
              <span>Lịch Sử Hoạt Động Hệ Thống</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ghi nhận vết kiểm toán và hóa đơn thanh toán tự động thời gian thực
            </p>
          </div>

          {currentUser.role === 'manager' && (
            <button
              onClick={handleClearSystem}
              className="flex items-center space-x-1 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs px-3.5 py-2.5 rounded-xl font-semibold transition cursor-pointer"
              id="btn-clear-database"
            >
              <Trash2 size={13} />
              <span>Khôi phục cài đặt gốc</span>
            </button>
          )}
        </div>

        {/* Searching bar */}
        <div className="relative max-w-md bg-slate-900/30">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo thao tác, nhân viên, thông tin..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 outline-none focus:border-indigo-500"
            id="search-audit-logs"
          />
        </div>

        {/* Audit timeline table */}
        <div className="bg-slate-900/50 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 select-none text-xs">
                  <th className="p-4 font-mono font-semibold">Thời gian</th>
                  <th className="p-4 font-semibold">Người thao tác</th>
                  <th className="p-4 font-semibold">Hành động</th>
                  <th className="p-4 font-semibold">Chi tiết sự kiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-600 font-medium">
                      Không tìm thấy lịch sử hoạt động nào khớp với nội dung tìm kiếm
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${log.role === 'manager' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                          <span className="font-semibold text-slate-200">{log.user}</span>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-indigo-400 font-bold">
                        {log.action}
                      </td>
                      <td className="p-4 text-slate-400 leading-relaxed font-sans max-w-xs md:max-w-lg truncate hover:whitespace-normal">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

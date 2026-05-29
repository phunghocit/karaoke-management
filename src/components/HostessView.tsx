/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { Hostess } from '../types';
import { UserPlus, Edit2, Trash2, X, Check, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function HostessView() {
  const { hostesses, addHostess, updateHostess, deleteHostess, currentUser } = useAppState();
  
  // States
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form values
  const [name, setName] = useState('');
  const [pricePerHour, setPricePerHour] = useState<number>(150000);

  // Edit form values
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(150000);

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pricePerHour <= 0) return;

    addHostess({
      id: `HST_${Date.now()}`,
      name: name.trim(),
      pricePerHour: Number(pricePerHour)
    });

    setName('');
    setPricePerHour(150000);
    setIsAdding(false);
  };

  const startEdit = (hostess: Hostess) => {
    setEditingId(hostess.id);
    setEditName(hostess.name);
    setEditPrice(hostess.pricePerHour);
  };

  const handleSaveEdit = (hostess: Hostess) => {
    if (!editName.trim() || editPrice <= 0) return;
    updateHostess({
      ...hostess,
      name: editName.trim(),
      pricePerHour: Number(editPrice)
    });
    setEditingId(null);
  };

  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-indigo-500 rounded-xs"></span>
              <span>Mục Tiếp Viên Phục Vụ</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Thêm, sửa, xóa danh mục tiếp viên và biểu phí tính giờ hát tương ứng
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-indigo-600/10"
            id="btn-trigger-add-hostess"
          >
            {isAdding ? <X size={16} /> : <UserPlus size={16} />}
            <span>{isAdding ? 'Hủy bỏ' : 'Thêm tiếp viên'}</span>
          </button>
        </div>

        {/* Add/Form Dialog */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl max-w-xl"
            >
              <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider mb-4">Nhập tiếp viên phục vụ mới</h3>
              <form onSubmit={handleSubmitAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs text-slate-400 font-mono">Họ tên tiếp tiếp viên:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Trúc Chi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    id="add-hostess-name"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs text-slate-400 font-mono">Giá tính phí (VND / Giờ):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                    id="add-hostess-price"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                    id="btn-add-hostess-submit"
                  >
                    Lưu thông tin
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Directory grid listing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostesses.map((hostess) => {
            const isEditing = editingId === hostess.id;
            return (
              <motion.div
                key={hostess.id}
                layout
                className={`bg-slate-900/60 border rounded-2xl p-5 hover:border-slate-800 transition duration-150 flex flex-col justify-between ${
                  isEditing ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-900'
                }`}
              >
                {isEditing ? (
                  // Edit form inside card
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-mono uppercase">Tên tiếp viên:</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 rounded-lg text-xs outline-none border border-slate-800 focus:border-indigo-500"
                        id="edit-hostess-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-mono uppercase">Giá tính theo giờ (đ/h):</label>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 rounded-lg text-xs outline-none border border-slate-800 focus:border-indigo-500 font-mono"
                        id="edit-hostess-price"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-1.5 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10.5px] font-semibold rounded-lg transition"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleSaveEdit(hostess)}
                        className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                        id="btn-save-hostess-edit"
                      >
                        <Save size={11} />
                        <span>Lưu</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Pure detail info card
                  <div className="flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-100 text-base">{hostess.name}</h4>
                        <span className="text-[10.5px] text-zinc-500 font-mono mt-0.5 block">{hostess.id}</span>
                      </div>
                      
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase font-mono tracking-wider border ${
                        hostess.status === 'available'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse'
                      }`}>
                        {hostess.status === 'available' ? 'Rảnh rỗi' : 'Đang bận'}
                      </span>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/35 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Báo giá phục vụ:</span>
                      <strong className="text-indigo-400 font-mono font-bold">{formatVND(hostess.pricePerHour)} / Giờ</strong>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                      <span className="text-[11px] text-slate-500">
                        {hostess.status === 'busy' ? 'Ngồi phòng khác' : 'Sẵn sàng xếp tour'}
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => startEdit(hostess)}
                          className="p-1.5 bg-slate-800/80 hover:bg-slate-800 hover:text-indigo-400 text-slate-400 rounded-lg transition"
                          title="Sửa thông tin"
                          id={`btn-edit-hostess-${hostess.id}`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => deleteHostess(hostess.id)}
                          className="p-1.5 bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded-lg transition"
                          title="Xóa tiếp viên"
                          id={`btn-delete-hostess-${hostess.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

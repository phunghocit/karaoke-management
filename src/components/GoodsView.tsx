/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { Goods, GoodsCategory } from '../types';
import { PlusCircle, Edit, Trash2, X, Sparkles, Filter, Search, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GoodsView() {
  const { goods, addGoods, updateGoods, deleteGoods } = useAppState();

  // Dialog triggers
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | GoodsCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoodsCategory>('drink');
  const [price, setPrice] = useState<number>(25000);
  const [unit, setUnit] = useState('Lon');

  // Edit Form states
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<GoodsCategory>('drink');
  const [editPrice, setEditPrice] = useState<number>(25000);
  const [editUnit, setEditUnit] = useState('Lon');

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price < 0 || !unit.trim()) return;

    addGoods({
      name: name.trim(),
      category,
      price: Number(price),
      unit: unit.trim()
    });

    setName('');
    setPrice(25000);
    setUnit('Lon');
    setIsAdding(false);
  };

  const startEdit = (item: Goods) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditPrice(item.price);
    setEditUnit(item.unit);
  };

  const handleSaveEdit = (item: Goods) => {
    if (!editName.trim() || editPrice < 0 || !editUnit.trim()) return;

    updateGoods({
      id: item.id,
      name: editName.trim(),
      category: editCategory,
      price: Number(editPrice),
      unit: editUnit.trim()
    });

    setEditingId(null);
  };

  const getFilteredGoods = () => {
    return goods.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTab = activeTab === 'all' || item.category === activeTab;
      return matchSearch && matchTab;
    });
  };

  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-indigo-500 rounded-xs"></span>
              <span>Hàng Hóa &amp; Thực Đơn</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Thêm mới đồ uống, món ăn kèm và thiết lập giá cố định công khai
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-indigo-600/15"
            id="btn-trigger-add-goods"
          >
            {isAdding ? <X size={16} /> : <PlusCircle size={16} />}
            <span>{isAdding ? 'Hủy bỏ' : 'Thêm hàng hóa'}</span>
          </button>
        </div>

        {/* Add Goods Block */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl max-w-2xl"
            >
              <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider mb-4">Khai báo mặt hàng mới</h3>
              <form onSubmit={handleSubmitAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-slate-400 font-mono">Tên hàng hóa:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Đĩa trái cây VIP"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    id="add-goods-name"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs text-slate-400 font-mono">Phân loại:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GoodsCategory)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3.2 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                    id="add-goods-category"
                  >
                    <option value="drink">Đồ uống (Soda, Bia)</option>
                    <option value="food">Đồ ăn (Mực khô, Hạt dưa)</option>
                    <option value="other">Dịch vụ khác / Khăn lạnh</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs text-slate-400 font-mono">Đơn vị tính:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Lon, Đĩa, Cái"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    id="add-goods-unit"
                  />
                </div>

                <div className="flex flex-col space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-slate-400 font-mono">Giá bán niêm yết (VND):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500}
                    placeholder="Ví dụ: 35000"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                    id="add-goods-price"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 pt-2 flex justify-end space-x-2">
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
                    id="btn-add-goods-submit"
                  >
                    Thêm của dịch vụ
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Searching & Filter categories controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-slate-900/30 p-4 border border-slate-900 rounded-2xl">
          <div className="flex space-x-1">
            {([
              { id: 'all', label: 'Tất cả' },
              { id: 'drink', label: '🍺 Đồ uống' },
              { id: 'food', label: '🍟 Thức ăn' },
              { id: 'other', label: '✨ Khác' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer duration-100 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-950/40 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm tên hàng hóa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
              id="search-goods"
            />
          </div>
        </div>

        {/* Goods catalog list */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {getFilteredGoods().map(item => {
              const isEditing = editingId === item.id;
              
              let badgeColor = 'bg-slate-400/10 text-slate-400 border-slate-400/20';
              if (item.category === 'drink') badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
              else if (item.category === 'food') badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

              return (
                <motion.div
                  key={item.id}
                  layout
                  className={`bg-slate-900/60 border rounded-2xl p-4 flex flex-col justify-between hover:border-slate-800 transition duration-150 ${
                    isEditing ? 'border-indigo-500 ring-2 ring-indigo-500/15' : 'border-slate-900'
                  }`}
                >
                  {isEditing ? (
                    // In-card editable state
                    <div className="space-y-3 flex-1 text-xs">
                      <div>
                        <label className="text-[9.5px] text-slate-500 font-mono uppercase">Tên hàng hóa:</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 px-2 py-1 rounded-lg outline-none border border-slate-800"
                          id="edit-goods-name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9.5px] text-slate-500 font-mono uppercase">Đơn vị:</label>
                          <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="w-full bg-slate-950 text-slate-200 px-2 py-1 rounded-lg outline-none border border-slate-800"
                            id="edit-goods-unit"
                          />
                        </div>
                        <div>
                          <label className="text-[9.5px] text-slate-500 font-mono uppercase font-semibold">Phân loại:</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as GoodsCategory)}
                            className="w-full bg-slate-950 text-slate-200 px-1 py-1 rounded-lg outline-none border border-slate-800 cursor-pointer"
                            id="edit-goods-category"
                          >
                            <option value="drink">Đồ uống</option>
                            <option value="food">Món ăn</option>
                            <option value="other">Khác</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9.5px] text-slate-500 font-mono uppercase">Giá tiền:</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 px-2 py-1 rounded-lg outline-none border border-slate-800 font-mono"
                          id="edit-goods-price"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-1 pt-1">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md text-[10px]"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSaveEdit(item)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                          id="btn-goods-save-edit"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Regular Display card
                    <div className="flex flex-col justify-between h-full space-y-3">
                      <div className="flex items-start justify-between min-w-0">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-100 text-sm truncate">{item.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Đơn vị: {item.unit}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border font-mono tracking-wider shrink-0 ${badgeColor}`}>
                          {item.category === 'drink' ? 'Nước' : item.category === 'food' ? 'Đồ ăn' : 'Khác'}
                        </span>
                      </div>

                      <div className="bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/40 font-mono text-center">
                        <span className="text-emerald-400 font-bold text-sm">{formatVND(item.price)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/45 text-[10px]">
                        <span className="text-slate-500">{item.id.substring(0, 10)}</span>
                        <div className="flex space-x-0.5">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1 px-1.5 bg-slate-800/60 hover:bg-slate-800 hover:text-indigo-400 text-slate-400 rounded-md transition"
                            title="Chỉnh sửa"
                            id={`btn-edit-goods-${item.id}`}
                          >
                            <Edit size={11} />
                          </button>
                          <button
                            onClick={() => deleteGoods(item.id)}
                            className="p-1 px-1.5 bg-slate-800/60 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded-md transition"
                            title="Xóa món"
                            id={`btn-delete-goods-${item.id}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

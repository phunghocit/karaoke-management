/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { UserRole, UserAccount } from '../types';
import { Shield, ShieldAlert, User, ShieldCheck, HelpCircle, ArrowRightLeft, Users, AlertOctagon, Trash2, Plus, Mail, Key } from 'lucide-react';
import { motion } from 'motion/react';

export default function AccountView() {
  const { users, currentUser, setCurrentUser, updateUserRole, addUserAccount, deleteUserAccount } = useAppState();

  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentShopId = currentUser?.shopId || 'default_shop';
  // Filter list to only show users who belong to the same shop
  const shopUsers = users.filter(u => u.shopId === currentShopId);

  const handleToggleRole = (user: UserAccount) => {
    const newRole: UserRole = user.role === 'manager' ? 'staff' : 'manager';
    updateUserRole(user.id, newRole);
    
    // If updating currently logged in user role, update current user reference
    if (user.id === currentUser?.id) {
      setCurrentUser({
        ...user,
        role: newRole
      });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ họ tên, tài khoản đăng nhập (Email/SĐT) và mật khẩu!');
      return;
    }

    const emailNormalized = newEmail.trim().toLowerCase();
    // Validate if email or phone already exists globally
    const isExist = users.some(u => {
      const uEmail = (u.email || '').trim().toLowerCase();
      const uPhone = (u.phone || '').trim().toLowerCase();
      return uEmail === emailNormalized || uPhone === emailNormalized;
    });
    if (isExist) {
      setErrorMsg('Email hoặc Số điện thoại đăng nhập này đã tồn tại trên hệ thống!');
      return;
    }

    try {
      await addUserAccount(newFullName.trim(), emailNormalized, newRole, newPassword.trim());
      setSuccessMsg(`Đã tạo thành công tài khoản cho ${newFullName}!`);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('staff');
    } catch (err) {
      setErrorMsg('Có lỗi xảy ra trong quá trình tạo tài khoản.');
    }
  };

  const isManager = currentUser?.role === 'manager';

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header section */}
        <div className="border-b border-slate-800 pb-5">
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
            <span className="w-1.5 h-3.5 bg-indigo-500 rounded-xs"></span>
            <span>Tài Khoản &amp; Phân Quyền</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Thiết lập vai trò bảo mật cho Quản lý và Nhân viên thu ngân trong hệ thống Karaoke
          </p>
        </div>

        {/* Informative Security Panel explanation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-sm">Quyền Quản Lý (Manager)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                Được phép truy cập toàn quyền hệ thống: Sơ đồ phòng hát, Tiếp viên, Hàng hóa, Thống kê doanh thu, Lịch sử hệ thống, và thiết lập cấu hình.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-sm">Quyền Nhân Viên (Staff)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                Chỉ được xem Sơ đồ phòng, đặt giờ hát, gọi hàng uống hoa, điều tiếp viên và lập thanh toán in hóa đơn. Bị chặn truy cập Báo cáo và Lịch sử hệ thống.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-sm">Tính Năng Khách Thể</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                Hệ thống hỗ trợ cơ chế chuyển đổi tài khoản tức thì ở thanh điều hướng bên trái để kiểm thử nhanh trải nghiệm phân quyền quản lý hoàn chỉnh.
              </p>
            </div>
          </div>

        </div>

        {/* Manager Creation Form */}
        {isManager && (
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Plus size={16} className="text-emerald-400" />
              <span>Thêm Tài Khoản Nhân Sự Cho Quán</span>
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Chỉ chủ quán mới có quyền tạo thêm tài khoản cho nhân viên thu ngân hoặc quản lý bổ nhiệm. Tài khoản được tạo sẽ tự động liên kết với thực thể dữ liệu riêng của quán này.
            </p>

            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Họ và tên nhân sự</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2.5 pl-10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Tài khoản (Email hoặc Số điện thoại)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Mail size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nhanvien@domain.com hoặc SĐT"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2.5 pl-10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Mật khẩu khởi tạo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Key size={14} />
                  </span>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2.5 pl-10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row items-center sm:justify-between gap-4 pt-2">
                <div className="flex items-center space-x-6 w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Vai trò:</span>
                  <label className="inline-flex items-center space-x-2 text-xs text-slate-300 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="newRole"
                      checked={newRole === 'staff'}
                      onChange={() => setNewRole('staff')}
                      className="text-indigo-505 bg-slate-955 border-slate-800 focus:ring-indigo-505"
                    />
                    <span>Nhân Viên Thu Ngân</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 text-xs text-slate-300 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="newRole"
                      checked={newRole === 'manager'}
                      onChange={() => setNewRole('manager')}
                      className="text-indigo-505 bg-slate-955 border-slate-800 focus:ring-indigo-505"
                    />
                    <span>Đồng Quản Lý</span>
                  </label>
                </div>
                
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 w-full sm:w-auto justify-center"
                >
                  <Plus size={14} />
                  <span>Kích Hoạt Tài Khoản</span>
                </button>
              </div>

              {errorMsg && (
                <div className="col-span-1 md:col-span-2 text-rose-450 font-medium text-xs bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="col-span-1 md:col-span-2 text-emerald-400 font-medium text-xs bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl">
                  {successMsg}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Main account lists cards */}
        <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <User size={16} className="text-indigo-400" />
              <span>Danh Sách Nhân Sự Đăng Nhập Quán Này</span>
            </h3>
            <span className="text-slate-500 text-xs font-mono">Tổng: {shopUsers.length} tài khoản</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {shopUsers.map((user) => {
              const isActive = currentUser?.id === user.id;
              return (
                <div 
                  key={user.id} 
                  className={`py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition duration-150 ${
                    isActive ? 'bg-slate-900/100 -mx-4 px-4 rounded-xl' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-sans ${
                      isActive 
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                        : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200 text-sm truncate">
                          {user.displayName}
                        </span>
                        {isActive && (
                          <span className="bg-indigo-500/15 text-indigo-450 text-[9px] px-2 py-0.2 rounded-full font-mono border border-indigo-500/25 uppercase">
                            Hiện tại
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono block mt-0.5">{user.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    
                    {/* Role Pill */}
                    <div className="flex items-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold border font-mono uppercase tracking-wider ${
                        user.role === 'manager'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                      </span>
                    </div>

                    {/* Change rights button (only for managers changing others) */}
                    {isManager && (
                      <button
                        onClick={() => handleToggleRole(user)}
                        className="flex items-center space-x-1 border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-indigo-400 text-xs px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
                        title="Chuyển đổi vai trò khẩn cấp"
                        id={`btn-toggle-role-${user.id}`}
                      >
                        <ArrowRightLeft size={12} />
                        <span>Đổi Quyền</span>
                      </button>
                    )}

                    {/* Delete button (only for other users) */}
                    {!isActive && isManager && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn xóa vĩnh viễn tài khoản "${user.displayName}"?`)) {
                            deleteUserAccount(user.id);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-450 p-1.5 rounded-lg border border-slate-800 hover:border-slate-705 transition cursor-pointer"
                        id={`btn-delete-${user.id}`}
                        title="Xóa tài khoản nhân viên"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}


                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning card details */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start space-x-3.5">
          <AlertOctagon size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300/90 leading-relaxed">
            <h4 className="font-bold text-amber-300">Tính năng bảo mật đa phân quyền hoạt động trực tiếp!</h4>
            <p className="mt-1">
              Khi đăng nhập tài khoản <strong>Nhân viên thu ngân (Staff)</strong>, các tab như 'Thống kê', 'Lịch sử' và cài đặt phân quyền này sẽ bị ẩn khỏi menu hệ thống nhằm tránh rò rỉ bảo mật tài chính. Hãy sử dụng chức năng "Đăng nhập" ở bảng trên để thử nghiệm các phân quyền này.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

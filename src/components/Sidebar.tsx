/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/AppContext';
import { UserRole } from '../types';
import { 
  Tv, 
  Users, 
  Package, 
  CheckSquare, 
  History, 
  BarChart3, 
  ShieldAlert, 
  Menu, 
  X, 
  UserCircle,
  Settings,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export default function Sidebar({ currentTab, setTab }: SidebarProps) {
  const { users, currentUser, setCurrentUser, logout, theme, toggleTheme, settings } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  };

  const menuItems = [
    { id: 'management', label: 'Quản lý phòng', icon: Tv, roles: ['manager', 'staff'] },
    { id: 'hostesses', label: 'Danh sách tiếp viên', icon: Users, roles: ['manager', 'staff'] },
    { id: 'goods', label: 'Quản lý hàng hóa', icon: Package, roles: ['manager', 'staff'] },
    { id: 'accounts', label: 'Tài khoản & Phân quyền', icon: ShieldAlert, roles: ['manager'] },
    { id: 'logs', label: 'Lịch sử hoạt động', icon: History, roles: ['manager'] },
    { id: 'reports', label: 'Thống kê doanh thu', icon: BarChart3, roles: ['manager'] },
    { id: 'settings', label: 'Cấu hình quán', icon: Settings, roles: ['manager', 'staff'] },
  ];

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUser = users.find(u => u.id === e.target.value);
    if (selectedUser) {
      setCurrentUser(selectedUser);
    }
  };

  const shopUsers = users.filter(u => (u.shopId || 'default_shop') === (currentUser?.shopId || 'default_shop'));

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(currentUser.role)
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 h-16 px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {settings?.logoUrl ? (
            <img 
              id="mobile-logo-img"
              src={settings.logoUrl} 
              alt="Logo" 
              className="w-8 h-8 rounded-lg object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span className="font-bold text-slate-100 text-base tracking-tight truncate">
            {((settings && settings.shopName) || 'Karaoke Hub')}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            title={theme === 'light' ? 'Chuyển sang Giao diện tối' : 'Chuyển sang Giao diện sáng'}
          >
            {theme === 'light' ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-400" />}
          </button>

          {/* Current User Display Name */}
          <span className="bg-slate-800 text-slate-200 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700 font-bold max-w-[110px] truncate" title={currentUser.displayName}>
            {currentUser.displayName}
          </span>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            id="btn-toggle-mobile-menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-40 md:hidden flex flex-col pt-20 animate-slide-in">
          <nav className="flex-1 p-3 space-y-1">
            {filteredMenuItems.map(item => {
              const IconComp = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition duration-150 cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                  id={`mobile-nav-${item.id}`}
                >
                  <IconComp size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500 flex flex-col items-center space-y-3">
            <span className="text-center">Vai trò: <strong className="text-zinc-300 uppercase">{currentUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</strong></span>
            <button
              onClick={() => { logout(); setMobileMenuOpen(false); }}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-2 rounded-xl border border-rose-500/20 flex items-center justify-center space-x-1.5 transition text-xs font-bold cursor-pointer"
              id="mobile-logout-btn"
            >
              <LogOut size={14} />
              <span>Đăng xuất (Rời quán)</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 min-h-screen text-slate-200 sticky top-0">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3 min-w-0">
          {settings?.logoUrl ? (
            <img 
              id="sidebar-logo-img"
              src={settings.logoUrl} 
              alt="Logo" 
              className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-md shadow-indigo-600/10 animate-fade-in"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            {settings && settings.slogan ? (
              <>
                <h1 className="font-bold text-slate-100 leading-none tracking-tight truncate mb-1" title={settings.shopName || 'Karaoke Hub'}>
                  {settings.shopName || 'Karaoke Hub'}
                </h1>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider block truncate text-left" title={settings.slogan}>
                  {settings.slogan}
                </span>
              </>
            ) : (
              <h1 className="font-extrabold text-slate-100 leading-none tracking-tight text-base truncate" title={settings?.shopName || 'Karaoke Hub'}>
                {settings?.shopName || 'Karaoke Hub'}
              </h1>
            )}
          </div>
        </div>

        {/* User Info / Quick Role Switch */}
        <div className="p-4 mx-3 my-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <UserCircle size={36} className="text-indigo-400" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-slate-200 truncate leading-none mb-1">{currentUser.displayName.split(' - ')[0].trim()}</div>
              <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold ${
                currentUser.role === 'manager' 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {currentUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
              </span>
            </div>
          </div>
          
          <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800/60 pt-2.5">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold">Nhân viên trực:</span>
            <span className="font-bold text-slate-200">{currentUser.displayName.split(' - ')[0].trim()}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1">
          {filteredMenuItems.map(item => {
            const IconComp = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition cursor-pointer duration-150 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                id={`desktop-nav-${item.id}`}
              >
                <IconComp size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Foot information & Logout Button */}
        <div className="p-4 border-t border-slate-800 space-y-3.5">
          {/* Theme Toggle Button Desktop */}
          <button
            onClick={toggleTheme}
            type="button"
            className="w-full bg-slate-800/40 hover:bg-slate-800 border border-slate-850 text-slate-300 hover:text-slate-100 py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2.5 transition text-xs font-semibold cursor-pointer"
            id="desktop-theme-toggle-btn"
          >
            {theme === 'light' ? (
              <>
                <Moon size={14} className="text-indigo-400" />
                <span>Giao diện tối (Dark Mode)</span>
              </>
            ) : (
              <>
                <Sun size={14} className="text-amber-400" />
                <span>Giao diện sáng (Light Mode)</span>
              </>
            )}
          </button>

          <button
            onClick={() => logout()}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 py-2 px-3 rounded-xl flex items-center justify-center space-x-2 transition text-xs font-bold cursor-pointer"
            id="desktop-logout-btn"
          >
            <LogOut size={14} />
            <span>Đăng xuất (Rời quán)</span>
          </button>
          
          <div className="text-center text-xs text-slate-500 space-y-1">
            <p className="font-mono text-[10px] uppercase">Giờ hệ thống (Local UTC):</p>
            <p className="text-[10px] font-mono text-indigo-400 font-extrabold tracking-wider">{formatDateTime(now)}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

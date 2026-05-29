/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { Mail, Lock, Store, Phone, User, CheckCircle2, ChevronRight, AlertCircle, ShieldCheck, ShieldAlert, Send, Eye, EyeOff, LayoutGrid, Sparkles, Copy, Check, Sun, Moon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAccount } from '../types';

export default function AuthView() {
  const { users, registrations, submitRegistration, approveRegistration, rejectRegistration, deleteRegistration, clearAllRegistrations, setCurrentUser, theme, toggleTheme } = useAppState();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'admin'>('login');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [lastRegisteredShop, setLastRegisteredShop] = useState('');
  const [lastRegDetails, setLastRegDetails] = useState<{ fullName: string; email: string; shopName: string; phone: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper to construct mail content safely
  const getMailtoData = () => {
    if (!lastRegDetails) {
      return {
        email: 'phunghoc57@gmail.com',
        subject: '',
        body: '',
        url: 'mailto:phungdai.hoc@gmail.com'
      };
    }
    const subject = `[Karaoke Hub] Có người đăng ký mới: ${lastRegDetails.shopName.toUpperCase()}`;
    const body = `Chào Admin Phùng Học,\n\nHệ thống Karaoke Hub vừa nhận được yêu cầu đăng ký mở quán mới:\n` +
      `- Chủ quán: ${lastRegDetails.fullName}\n` +
      `- Tên quán: ${lastRegDetails.shopName.toUpperCase()}\n` +
      `- Điện thoại Zalo: ${lastRegDetails.phone}\n` +
      `- Email đăng nhập: ${lastRegDetails.email}\n\n` +
      `Vui lòng truy cập trang Quản Trị Hệ Thống (Mục Duyệt Cấp) để phê duyệt hoạt động.`;
    
    return {
      email: 'phunghoc57@gmail.com',
      subject,
      body,
      url: `mailto:phungdai.hoc@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Admin Access State
  const [adminCode, setAdminCode] = useState('');
  const [adminAccessGranted, setAdminAccessGranted] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const identifier = loginEmail.trim().toLowerCase();
    const cleanIdentifier = identifier.replace(/[\s.-]/g, '');

    // Search the active approved users database by email or phone
    const matchedUser = users.find(u => {
      const uEmail = u.email ? u.email.toLowerCase() : '';
      const uPhone = u.phone ? u.phone.replace(/[\s.-]/g, '') : '';
      const emailMatches = uEmail === identifier;
      const phoneMatches = uPhone && uPhone === cleanIdentifier;
      
      const pwdMatches = u.password === loginPassword || (!u.password && loginPassword === '123456');
      return (emailMatches || phoneMatches) && pwdMatches;
    });

    if (matchedUser) {
      setCurrentUser(matchedUser);
    } else {
      // Check if they are in approved registrations but user record wasn't created yet (or was deleted/not synced from Firestore)
      const matchedReg = registrations.find(r => {
        const rEmail = r.email ? r.email.toLowerCase() : '';
        const rPhone = r.phone ? r.phone.replace(/[\s.-]/g, '') : '';
        const emailMatches = rEmail === identifier;
        const phoneMatches = rPhone && rPhone === cleanIdentifier;
        const pwdMatches = r.password === loginPassword || (!r.password && loginPassword === '123456');
        return (emailMatches || phoneMatches) && pwdMatches && r.status === 'approved';
      });

      if (matchedReg) {
        const newUser: UserAccount = {
          id: `U_${matchedReg.id}`,
          email: matchedReg.email,
          phone: matchedReg.phone,
          displayName: matchedReg.fullName,
          role: 'manager',
          password: matchedReg.password || '123456',
          shopId: matchedReg.shopId
        };
        setCurrentUser(newUser);
      } else {
        // Check if they are actually in pending registrations by email or phone to provide sweet UX context
        const isPending = registrations.some(r => {
          const rEmail = r.email ? r.email.toLowerCase() : '';
          const rPhone = r.phone ? r.phone.replace(/[\s.-]/g, '') : '';
          return (rEmail === identifier || (rPhone && rPhone === cleanIdentifier)) && r.status === 'pending';
        });
        if (isPending) {
          setLoginError('Tài khoản này đang chờ duyệt. Vui lòng liên hệ Admin qua số điện thoại/Zalo 0987.050.701 hoặc Email phungdai.hoc@gmail.com để được kích hoạt nhanh nhất!');
        } else {
          setLoginError('Tài khoản (Email/SĐT) hoặc mật khẩu không chính xác. Hãy đăng ký mở quán mới nếu chưa có tài khoản!');
        }
      }
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regEmail || !regShopName || !regPhone || !regPassword) {
      alert('Vui lòng nhập đầy đủ tất cả các trường thông tin!');
      return;
    }

    // Submit registration request
    submitRegistration(
      regFullName.trim(),
      regEmail.trim(),
      regShopName.trim(),
      regPhone.trim(),
      regPassword
    );

    setLastRegDetails({
      fullName: regFullName.trim(),
      email: regEmail.trim(),
      shopName: regShopName.trim(),
      phone: regPhone.trim()
    });

    setLastRegisteredShop(regShopName);
    setRegSuccess(true);
    
    // Clear inputs
    setRegFullName('');
    setRegEmail('');
    setRegShopName('');
    setRegPhone('');
    setRegPassword('');
  };

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (adminCode.trim() === '703500' || adminCode.trim() === '05061998') {
      setAdminAccessGranted(true);
    } else {
      setAdminError('Mã xác thực quản lý hệ thống không chính xác!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-y-auto relative selection:bg-indigo-500 selection:text-white">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 backdrop-blur-md shadow-lg transition cursor-pointer flex items-center space-x-2 text-xs font-semibold"
          id="auth-theme-toggle"
        >
          {theme === 'light' ? (
            <>
              <Moon size={14} className="text-indigo-400" />
              <span className="hidden sm:inline">Giao diện Tối</span>
            </>
          ) : (
            <>
              <Sun size={14} className="text-amber-400" />
              <span className="hidden sm:inline">Giao diện Sáng</span>
            </>
          )}
        </button>
      </div>

      {/* Absolute Decorative Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg z-10 my-8">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 backdrop-blur-md mb-4 text-xs font-mono font-medium text-slate-300">
            <Sparkles size={13} className="text-indigo-400 animate-pulse" />
            <span>KARAOKE HUB MULTI-TENANT v3.0</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Karaoke Hub Enterprise
          </h1>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Hệ thống quản lý phòng hát, danh mục thu ngân & tiếp viên Karaoke đồng bộ đám mây thời gian thực.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex mb-6 shadow-xl relative z-20">
          <button
            onClick={() => { setActiveTab('login'); setRegSuccess(false); }}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold tracking-wide transition duration-150 uppercase cursor-pointer ${
              activeTab === 'login'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold tracking-wide transition duration-150 uppercase cursor-pointer ${
              activeTab === 'register'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Đăng Ký Quán Mới
          </button>
          <button
            onClick={() => { setActiveTab('admin'); setAdminAccessGranted(false); setAdminCode(''); setAdminError(''); }}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold tracking-wide transition duration-150 uppercase cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Duyệt Cấp</span>
            {registrations.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono animate-bounce">
                {registrations.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Dynamic Inner Cards */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-2xl relative">
          
          <AnimatePresence mode="wait">
            {/* 1. LOGIN SUITE */}
            {activeTab === 'login' && (
              <motion.div
                key="tab-login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-200">Đăng Nhập Hệ Thống</h3>
                  <p className="text-xs text-slate-400 mt-1">Sử dụng tài khoản Quản lý hoặc Nhân viên để bắt đầu làm việc</p>
                </div>

                {loginError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start space-x-2 text-left leading-relaxed">
                    <AlertCircle className="shrink-0 mt-0.5" size={16} />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase block" htmlFor="login-email">
                      Tài khoản (Email hoặc Số điện thoại)
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 text-slate-500" size={16} />
                      <input
                        id="login-email"
                        type="text"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="tenquan@gmail.com hoặc SĐT"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase block" htmlFor="login-password">
                      Mật khẩu bảo mật
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 text-slate-500" size={16} />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 outline-none transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 cursor-pointer mt-2 transition duration-150"
                    id="btn-login-submit"
                  >
                    <span>Truy cập cửa hàng</span>
                    <ChevronRight size={16} />
                  </button>
                </form>

                {/* Free Sandbox Info Access */}
                <div className="border-t border-slate-800/80 pt-4 mt-4 text-center">
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold mb-2">Thông tin tài khoản kiểm thử có sẵn:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    <button
                      onClick={() => { setLoginEmail('quanly@karaoke.com'); setLoginPassword('123456'); }}
                      className="p-2.5 bg-slate-950/60 hover:bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] transition text-left flex items-start space-x-2 block cursor-pointer group"
                    >
                      <ShieldCheck size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-slate-300 group-hover:text-indigo-300 block">Quản lý Mẫu</strong>
                        <span className="text-slate-500 font-mono">quanly@karaoke.com</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => { setLoginEmail('nhanvien@karaoke.com'); setLoginPassword('123456'); }}
                      className="p-2.5 bg-slate-950/60 hover:bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] transition text-left flex items-start space-x-2 block cursor-pointer group"
                    >
                      <User size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-slate-300 group-hover:text-indigo-300 block">Nhân viên Mẫu</strong>
                        <span className="text-slate-500 font-mono">nhanvien@karaoke.com</span>
                      </div>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-600 italic block mt-3">
                    *Mật khẩu kiểm thử chung mặc định là: <strong className="font-mono text-slate-500">123456</strong>
                  </span>
                </div>
              </motion.div>
            )}

            {/* 2. REGISTRATION */}
            {activeTab === 'register' && (
              <motion.div
                key="tab-register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {!regSuccess ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-200">Đăng Ký Mở Quán Mới</h3>
                      <p className="text-xs text-slate-400 mt-1">Thông tin sẽ được gửi tới Admin xử lý, duyệt cấp và kích hoạt sạch cơ sở dữ liệu</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-3.5">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold tracking-wide uppercase block" htmlFor="reg-fullname">
                          Họ và tên chủ quán
                        </label>
                        <div className="relative flex items-center">
                          <User className="absolute left-3 text-slate-500" size={15} />
                          <input
                            id="reg-fullname"
                            type="text"
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            placeholder="Nguyễn Văn A"
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-200 outline-none transition"
                            required
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold tracking-wide uppercase block" htmlFor="reg-email">
                          Email Đăng Ký (Email đăng nhập)
                        </label>
                        <div className="relative flex items-center">
                          <Mail className="absolute left-3 text-slate-500" size={15} />
                          <input
                            id="reg-email"
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="chuquan@karaoke.com"
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-200 outline-none transition"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Shop Name */}
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-semibold tracking-wide uppercase block" htmlFor="reg-shopname">
                            Tên quán của bạn
                          </label>
                          <div className="relative flex items-center">
                            <Store className="absolute left-3 text-slate-500" size={15} />
                            <input
                              id="reg-shopname"
                              type="text"
                              value={regShopName}
                              onChange={(e) => setRegShopName(e.target.value)}
                              placeholder="KARAOKE LUXURY"
                              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-200 outline-none transition"
                              required
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-semibold tracking-wide uppercase block" htmlFor="reg-phone">
                            Số điện thoại chủ hộ
                          </label>
                          <div className="relative flex items-center">
                            <Phone className="absolute left-3 text-slate-500" size={15} />
                            <input
                              id="reg-phone"
                              type="text"
                              value={regPhone}
                              onChange={(e) => setRegPhone(e.target.value)}
                              placeholder="09xx.xxx.xxx"
                              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-200 outline-none transition"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold tracking-wide uppercase block" htmlFor="reg-password">
                          Thiết lập Mật khẩu đăng nhập
                        </label>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-3 text-slate-500" size={15} />
                          <input
                            id="reg-password"
                            type="password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Tối thiểu 6 ký tự..."
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-200 outline-none transition"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 cursor-pointer mt-4 transition duration-150"
                        id="btn-register-submit"
                      >
                        <Send size={15} />
                        <span>Đăng Ký Quán Mới &amp; Chờ Duyệt</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Success Frame */
                  <div className="text-center py-5 space-y-3.5 animate-fade-in text-left">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                      <CheckCircle2 size={32} className="text-emerald-400 animate-pulse" />
                    </div>
                    
                    <div className="text-center space-y-1">
                      <h3 className="font-extrabold text-slate-100 text-base">Đăng Ký Thành Công!</h3>
                      <p className="text-[11px] text-slate-400">Yêu cầu tạo quán hát <strong className="text-indigo-400">"{lastRegisteredShop.toUpperCase()}"</strong> đã được tiếp nhận và lưu trên hệ thống.</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-[11px] text-slate-300 space-y-2">
                      <div className="space-y-1.5">
                        <strong className="text-[10px] text-indigo-400 block font-mono uppercase">Thông tin liên hệ Admin:</strong>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Hệ thống đang chờ kiểm duyệt. Vui lòng nhắn tin trực tiếp qua <strong className="text-indigo-300 font-semibold">Zalo: 0987.050.701</strong> hoặc gửi thông tin đến <strong className="text-indigo-300 font-semibold">Gmail: phungdai.hoc@gmail.com</strong> để Admin duyệt mở quán cho bạn nhanh nhất!
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 pt-1">
                      <a
                        href="https://zalo.me/0987050701"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-2.5 px-4 rounded-xl transition cursor-pointer text-center flex items-center justify-center space-x-1.5"
                        id="btn-goto-zalo"
                      >
                        <span>Nhắn Zalo Admin kích hoạt</span>
                      </a>

                      <button
                        onClick={() => { setActiveTab('login'); setRegSuccess(false); }}
                        className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 text-[11px] font-bold py-2.5 px-4 rounded-xl transition cursor-pointer text-center"
                        id="btn-go-to-login"
                      >
                        Quay lại Đăng nhập
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. ADMIN PORTAL APPROVAL */}
            {activeTab === 'admin' && (
              <motion.div
                key="tab-admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {!adminAccessGranted ? (
                  /* Verify admin pass code */
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-200">Xác Thực Quản Trị Hệ Thống</h3>
                    </div>

                    {adminError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                        <AlertCircle size={15} />
                        <span>{adminError}</span>
                      </div>
                    )}

                    <form onSubmit={handleAdminVerify} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 font-semibold uppercase block" htmlFor="input-admin-code">
                          Nhập Mã Xác Thực Admin
                        </label>
                        <input
                          id="input-admin-code"
                          type="password"
                          value={adminCode}
                          onChange={(e) => setAdminCode(e.target.value)}
                          placeholder="Nhập mã xác thực..."
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg transition duration-150 cursor-pointer"
                        id="btn-admin-verify-code"
                      >
                        Xác nhận mã bảo mật
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Inside Admin Panel Request Grid! */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                      <div>
                        <h3 className="font-extrabold text-slate-200 text-sm tracking-wide uppercase flex items-center gap-1.5">
                          <LayoutGrid size={15} className="text-indigo-400" />
                          <span>Danh Sách Chờ Duyệt Cấp</span>
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Duyệt kích hoạt phân tách database riêng tư cho từng chủ quán</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {registrations.length > 0 && (
                          <button
                            onClick={() => {
                              if (window.confirm("BẠN CÓ CHẮC MUỐN XÓA HOÀN TOÀN BỘ DANH SÁCH ĐĂNG KÝ? Hành động này dọn sạch lưu trữ và không thể hoàn tác.")) {
                                clearAllRegistrations();
                              }
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-bold hover:underline transition cursor-pointer px-1 py-0.5 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800"
                          >
                            Xóa hết
                          </button>
                        )}
                        <span className="text-[10px] text-indigo-400 font-mono">Tổng: {registrations.length}</span>
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 divide-y divide-slate-850">
                      {registrations.length === 0 ? (
                        <div className="text-center py-10 text-slate-600 text-xs font-mono">
                          Không có yêu cầu đăng ký mở quán nào được ghi nhận.
                        </div>
                      ) : (
                        registrations.map(reg => (
                          <div key={reg.id} className="pt-3 first:pt-0 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-xs text-slate-200 block truncate max-w-[200px]">{reg.shopName.toUpperCase()}</span>
                                <span className="text-[10.5px] text-slate-400 block mt-0.5">{reg.fullName} • {reg.phone}</span>
                                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{reg.email}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase shrink-0 ${
                                  reg.status === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : reg.status === 'rejected'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                }`}>
                                  {reg.status === 'approved' ? 'Đã duyệt' : reg.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                                </span>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Xác nhận xóa yêu cầu đăng ký của quán "${reg.shopName}"?`)) {
                                      deleteRegistration(reg.id);
                                    }
                                  }}
                                  className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-1 rounded hover:bg-slate-900 border border-transparent hover:border-slate-850"
                                  title="Xóa yêu cầu"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {reg.status === 'pending' && (
                              <div className="flex space-x-2.5">
                                <button
                                  onClick={() => rejectRegistration(reg.id)}
                                  className="flex-1 bg-slate-950 hover:bg-slate-900 text-rose-400 border border-slate-800 text-[10px] font-bold py-1.5 rounded-lg transition cursor-pointer"
                                  id={`btn-reject-${reg.id}`}
                                >
                                  Từ chối
                                </button>
                                
                                <button
                                  onClick={() => approveRegistration(reg.id)}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold py-1.5 rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer"
                                  id={`btn-approve-${reg.id}`}
                                >
                                  <ShieldCheck size={12} />
                                  <span>Duyệt Kích Hoạt</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => setAdminAccessGranted(false)}
                      className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs py-2 rounded-xl transition cursor-pointer mt-2"
                      id="btn-admin-logout"
                    >
                      Thoát phiên Admin
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

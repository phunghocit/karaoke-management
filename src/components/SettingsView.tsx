/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/AppContext';
import { Settings, Save, Wifi, Phone, MapPin, Store, HelpCircle, CheckCircle2, AlertTriangle, RefreshCw, Upload, Image, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SettingsView() {
  const { settings, updateShopSettings, currentUser } = useAppState();

  // Local state for the editable fields
  const [shopName, setShopName] = useState(settings.shopName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [wifiName, setWifiName] = useState(settings.wifiName);
  const [wifiPassword, setWifiPassword] = useState(settings.wifiPassword);
  const [slogan, setSlogan] = useState(settings.slogan || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [isDragging, setIsDragging] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  // Sync state if settings are updated in another tab
  useEffect(() => {
    setShopName(settings.shopName);
    setAddress(settings.address);
    setPhone(settings.phone);
    setWifiName(settings.wifiName);
    setWifiPassword(settings.wifiPassword);
    setSlogan(settings.slogan || '');
    setLogoUrl(settings.logoUrl || '');
  }, [settings]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chỉ chọn tệp tin hình ảnh!');
      return;
    }
    // Limit to under 1MB for optimal Firestore performance
    if (file.size > 1 * 1024 * 1024) {
      alert('Tệp tin quá lớn! Vui lòng chọn ảnh dưới 1MB để đảm bảo hiệu suất lưu trữ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setLogoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isEditable) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isEditable) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'manager') return;

    setSaveStatus('saving');
    
    // Slight artificial delay for sweet UX feedback feel
    setTimeout(() => {
      updateShopSettings({
        shopName: shopName.trim() || 'KARAOKE ULTRA',
        address: address.trim() || 'N/A',
        phone: phone.trim() || 'N/A',
        wifiName: wifiName.trim() || 'Free Wifi',
        wifiPassword: wifiPassword.trim() || '12345678',
        slogan: slogan.trim(),
        logoUrl: logoUrl.trim() || undefined
      });
      setSaveStatus('success');
      
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }, 600);
  };

  const isEditable = currentUser.role === 'manager';

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-indigo-500 rounded-xs"></span>
              <span>Cấu Hình Thông Tin Quán Hát</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Quản lý thương hiệu, địa chỉ, số điện thoại và thông tin kết nối WiFi xuất hóa đơn
            </p>
          </div>
        </div>

        {/* Info panel for staff */}
        {!isEditable && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl flex items-start space-x-3 text-sm">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <div>
              <span className="font-bold">Chế độ xem thông tin:</span> Bạn đang đăng nhập bằng tài khoản <strong className="underline">{currentUser.displayName.split(' - ')[0].trim()}</strong> với quyền <strong className="uppercase">{currentUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</strong>. Chỉ tài khoản Quản lý mới có quyền chỉnh sửa và lưu trữ lại thông số cấu hình của quán hát.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings form column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="border-b border-slate-800 pb-3 mb-4">
                  <h3 className="font-bold text-slate-200 text-sm tracking-wide uppercase flex items-center gap-2">
                    <Store size={16} className="text-indigo-400" />
                    <span>Chi Tiết Quán Hát</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Logo Upload Section */}
                  <div className="space-y-1.5 mb-2">
                    <label className="text-xs font-semibold text-slate-400 block">
                      Ảnh Logo của quán
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-2">
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                            isDragging
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
                          } ${!isEditable ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (isEditable) {
                              document.getElementById('logo-file-picker')?.click();
                            }
                          }}
                        >
                          <input
                            id="logo-file-picker"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={!isEditable}
                            className="hidden"
                          />
                          <Upload className="mx-auto text-slate-500 mb-2 shrink-0 animate-pulse" size={20} />
                          <p className="text-xs font-medium text-slate-300">
                            Kéo thả ảnh logo vào đây hoặc <span className="text-indigo-400 font-semibold underline">bấm để chọn</span>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Hỗ trợ PNG, JPG, WEBP. Dung lượng tối đa 1MB
                          </p>
                        </div>
                      </div>
                      
                      {/* Logo Preview & Actions */}
                      <div className="flex flex-col items-center justify-center border border-slate-800 bg-slate-950/20 rounded-xl p-4 h-full min-h-[110px]">
                        {logoUrl ? (
                          <div className="text-center space-y-2">
                            <img
                              src={logoUrl}
                              alt="Shop logo preview"
                              className="w-14 h-14 rounded-xl object-cover mx-auto border border-slate-705 shadow-md shadow-indigo-950/50"
                              referrerPolicy="no-referrer"
                            />
                            {isEditable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLogoUrl('');
                                }}
                                className="text-[10px] text-rose-450 hover:text-rose-400 flex items-center gap-1 mx-auto transition cursor-pointer font-bold uppercase tracking-wider"
                              >
                                <Trash2 size={11} />
                                <span>Xóa logo</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center space-y-2">
                            <div className="w-14 h-14 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                              <Image size={20} />
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">Chưa có logo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shop Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 block" htmlFor="input-shop-name">
                      Tên Quán Hát (Tên hiển thị hóa đơn)
                    </label>
                    <div className="relative">
                      <input
                        id="input-shop-name"
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        disabled={!isEditable}
                        className="w-full bg-slate-950 text-slate-200 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 placeholder-slate-600 text-sm outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="KARAOKE ..."
                        required
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 block" htmlFor="input-address">
                      Địa Chỉ Quán
                    </label>
                    <div className="relative">
                      <input
                        id="input-address"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={!isEditable}
                        className="w-full bg-slate-950 text-slate-200 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 placeholder-slate-600 text-sm outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Nhập địa chỉ..."
                        required
                      />
                    </div>
                  </div>

                  {/* Phone & Slogan Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 block" htmlFor="input-phone">
                        Số điện thoại liên hệ
                      </label>
                      <input
                        id="input-phone"
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!isEditable}
                        className="w-full bg-slate-950 text-slate-200 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 placeholder-slate-600 text-sm outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Số điện thoại..."
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 block" htmlFor="input-slogan">
                        Slogan / Mô tả phụ bên dưới logo
                      </label>
                      <input
                        id="input-slogan"
                        type="text"
                        value={slogan}
                        onChange={(e) => setSlogan(e.target.value)}
                        disabled={!isEditable}
                        className="w-full bg-slate-950 text-slate-200 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 placeholder-slate-600 text-sm outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Mặc định: ĐỒNG BỘ THỜI GIAN THỰC"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-800 pt-6 pb-3 mb-4">
                  <h3 className="font-bold text-slate-200 text-sm tracking-wide uppercase flex items-center gap-2">
                    <Wifi size={16} className="text-indigo-400" />
                    <span>Cấu hình WiFi của quán</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wifi Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 block" htmlFor="input-wifi-name">
                      Tên WiFi (SSID)
                    </label>
                    <input
                      id="input-wifi-name"
                      type="text"
                      value={wifiName}
                      onChange={(e) => setWifiName(e.target.value)}
                      disabled={!isEditable}
                      className="w-full bg-slate-950 text-slate-200 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 placeholder-slate-600 text-sm outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Wifi Name..."
                      required
                    />
                  </div>

                  {/* Wifi Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 block" htmlFor="input-wifi-pass">
                      Mật khẩu WiFi
                    </label>
                    <input
                      id="input-wifi-pass"
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      disabled={!isEditable}
                      className="w-full bg-slate-950 text-slate-200 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 placeholder-slate-600 text-sm outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Wifi password..."
                      required
                    />
                  </div>
                </div>

                {/* Form Action */}
                {isEditable && (
                  <div className="pt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={saveStatus === 'saving'}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold shadow-md cursor-pointer transition min-w-[150px] justify-center ${
                        saveStatus === 'success'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'
                      }`}
                      id="btn-save-shop-settings"
                    >
                      {saveStatus === 'saving' && (
                        <RefreshCw size={16} className="animate-spin" />
                      )}
                      {saveStatus === 'success' && (
                        <CheckCircle2 size={16} className="text-emerald-200" />
                      )}
                      {saveStatus === 'idle' && (
                        <Save size={16} />
                      )}
                      <span>
                        {saveStatus === 'saving' ? 'Đang lưu...' : saveStatus === 'success' ? 'Đã lưu cài đặt!' : 'Lưu Cài Đặt'}
                      </span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Receipt preview column */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col h-full justify-between">
              <div>
                <h3 className="font-bold text-slate-300 text-sm tracking-wide uppercase flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                  <HelpCircle size={16} className="text-indigo-400" />
                  <span>XEM TRƯỚC HÓA ĐƠN</span>
                </h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Trực quan hóa sự thay đổi nội dung thông tin thương hiệu hiển thị trên phiếu tạm tính / hóa đơn in nhiệt K80 ra cho khách hàng.
                </p>

                {/* Thermal Ticket Replica */}
                <div 
                  className="bg-amber-50/15 p-4 text-slate-900 font-mono text-[10px] rounded-xl border border-slate-700 shadow-inner select-none"
                  style={{ letterSpacing: '-0.02em', lineHeight: '1.4' }}
                >
                  {logoUrl && (
                    <div className="flex justify-center mb-2">
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="w-8 h-8 rounded-lg object-cover border border-slate-400"
                        referrerPolicy="no-referrer animate-fade-in"
                      />
                    </div>
                  )}
                  <div className="text-center font-extrabold text-xs uppercase tracking-wider block truncate max-w-full">
                    {shopName || 'KARAOKE ULTRA'}
                  </div>
                  <div className="text-center text-[8.5px] text-slate-500 truncate max-w-full">
                    {address || 'Địa chỉ chưa cập nhật'}
                  </div>
                  <div className="text-center text-[8.5px] text-slate-500 mb-2 truncate max-w-full">
                    SĐT: {phone || 'N/A'}
                  </div>

                  <div className="text-center font-bold border-y border-dashed border-slate-400 py-1.5 my-2 tracking-widest bg-slate-100/30 text-[9.5px]">
                    HÓA ĐƠN THANH TOÁN
                  </div>

                  <table className="w-full my-2 text-[8.5px]">
                    <thead>
                      <tr className="border-b border-dashed border-slate-300">
                        <th className="text-left py-1 text-slate-600 font-normal">SẢN PHẨM</th>
                        <th className="text-center py-1 text-slate-600 font-normal">SL</th>
                        <th className="text-right py-1 text-slate-600 font-normal">T.TIỀN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1">Hát giờ VIP</td>
                        <td className="text-center py-1">2h</td>
                        <td className="text-right py-1 font-bold">500.000 đ</td>
                      </tr>
                      <tr>
                        <td className="py-1">Tiger Beer (Lon)</td>
                        <td className="text-center py-1">6</td>
                        <td className="text-right py-1 font-bold">150.000 đ</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="border-t border-double border-slate-300 pt-2 mt-2 font-bold flex justify-between text-[10.5px]">
                    <span>TỔNG CỘNG:</span>
                    <span className="text-indigo-800">650.000 đ</span>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-3 pt-2 text-center text-[8.5px] text-slate-400 space-y-0.5">
                    <div className="font-extrabold text-slate-700">Cảm ơn quý khách. Hẹn gặp lại!</div>
                    <div className="text-slate-600">Wifi: <span className="font-bold">{wifiName || 'N/A'}</span></div>
                    <div className="text-slate-600">MK WiFi: <span className="font-bold">{wifiPassword || 'N/A'}</span></div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic mt-6 border-t border-slate-800/60 pt-4">
                * Toàn bộ mẫu hóa đơn và vé tạm tính in nhiệt sẽ đồng bộ các chi tiết cấu hình trên.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

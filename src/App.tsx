/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppProvider, useAppState } from './context/AppContext';
import Sidebar from './components/Sidebar';
import ManagementView from './components/ManagementView';
import HostessView from './components/HostessView';
import GoodsView from './components/GoodsView';
import AccountView from './components/AccountView';
import LogView from './components/LogView';
import ReportView from './components/ReportView';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';

function PrivateAppLayout() {
  const { currentUser } = useAppState();
  const [currentTab, setTab] = useState<string>('management');

  // Strict role security gate path verification:
  // If currentUser is standard staff, lock them out of admin screens
  useEffect(() => {
    if (!currentUser) return;
    const adminTabs = ['accounts', 'logs', 'reports'];
    if (currentUser.role === 'staff' && adminTabs.includes(currentTab)) {
      setTab('management');
    }
  }, [currentUser, currentTab]);

  if (!currentUser) return null;

  const renderView = () => {
    switch (currentTab) {
      case 'management':
        return <ManagementView />;
      case 'hostesses':
        return <HostessView />;
      case 'goods':
        return <GoodsView />;
      case 'accounts':
        return <AccountView />;
      case 'logs':
        return <LogView />;
      case 'reports':
        return <ReportView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ManagementView />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden h-screen">
      {/* Sidebar navigation */}
      <Sidebar currentTab={currentTab} setTab={setTab} />
      
      {/* Primary view viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden relative">
        {renderView()}
      </main>
    </div>
  );
}

function AppContentSelector() {
  const { currentUser, isLoading } = useAppState();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-t-indigo-500 border-r-transparent border-slate-800 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest text-center px-4">Đồng bộ dữ liệu Karaoke Hub...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }

  return <PrivateAppLayout />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContentSelector />
      <SpeedInsights />
    </AppProvider>
  );
}

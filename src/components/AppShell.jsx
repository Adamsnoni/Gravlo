// src/components/AppShell.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Building2, Bell, CreditCard, Settings, LogOut, Menu, X, KeyRound, ChevronRight, Crown, User, AlertTriangle, Archive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { db, subscribeUnreadNotificationsCount, subscribePendingUnitsCount } from '../services/firebase';
import { getFlag } from '../utils/countries';
import toast from 'react-hot-toast';
import { PLANS } from '../services/subscription';

const LANDLORD_NAV = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { to: '/notifications', icon: Bell, label: 'Activity' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/archive', icon: Archive, label: 'Archive' },
  { to: '/reminders', icon: AlertTriangle, label: 'Reminders' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/subscription', icon: Crown, label: 'Subscription' },
];

const TENANT_NAV = [
  { to: '/tenant', icon: LayoutGrid, label: 'My Homes' },
  { to: '/tenant/reminders', icon: Bell, label: 'Reminders' },
  { to: '/tenant/payments', icon: CreditCard, label: 'Payments' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppShell() {
  const { user, profile, logout } = useAuth();
  const { country, currencySymbol } = useLocale();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const role = profile?.role || 'landlord';
  const isTenant = role === 'tenant';
  const NAV = isTenant ? TENANT_NAV : LANDLORD_NAV;
  const userPlan = PLANS[profile?.subscription?.planId || 'free'] || PLANS.free;

  const location = useLocation();
  const [activeTab, setActiveTab] = useState(isTenant ? '/tenant' : '/dashboard');

  useEffect(() => {
    // Keep it synced with the actual URL if navigation happens outside sidebar clicks
    // but default to exact match to prevent dual highlights
    setActiveTab(location.pathname);
  }, [location.pathname]);

  // Real-time listener for pending unit join requests & notifications (landlords only)
  useEffect(() => {
    if (isTenant || !user?.uid) return;

    // Joint request badge (on Properties)
    const unsubUnits = subscribePendingUnitsCount(user.uid, setPendingCount);

    // Unread notifications badge (on Dashboard)
    const unsubNotifs = subscribeUnreadNotificationsCount(user.uid, setUnreadNotificationsCount);

    return () => { unsubUnits(); unsubNotifs(); };
  }, [user?.uid, isTenant]);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const initials = (profile?.fullName || user?.displayName || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#1e2a2e]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a3c2e] to-[#52b788] flex items-center justify-center shadow-sm">
            <KeyRound size={17} className="text-white opacity-90" />
          </div>
          <div>
            <div className="font-display font-bold text-[#e8e4de] text-lg leading-none tracking-tight">Gravlo</div>
            <div className="text-[10px] text-[#4a5568] font-body mt-1 uppercase tracking-widest font-bold">Property Manager</div>
          </div>
        </div>
        {/* Country pill */}
        {country && (
          <div className="mt-4 flex items-center gap-1.5 px-2 py-1 bg-[#141b1e] rounded-lg border border-[#1e2a2e] w-fit">
            <span className="text-sm">{getFlag(country.code)}</span>
            <span className="font-body text-[10px] text-[#4a5568] font-bold uppercase tracking-wider">{country.currency} ({currencySymbol})</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => {
          const isActive = activeTab === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => {
                setActiveTab(to);
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-[#1a3c2e] text-[#52b788]'
                  : 'text-[#4a5568] hover:bg-[#141b1e] hover:text-[#8a9ba8]'
                }`}
            >
              <Icon size={17} className={isActive ? 'text-[#52b788]' : 'text-[#4a5568] group-hover:text-[#8a9ba8]'} />
              <span className={`font-body text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              {label === 'Dashboard' && unreadNotificationsCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#e74c3c] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
              {label === 'Properties' && pendingCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#e74c3c] text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[#1e2a2e]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#141b1e] transition-colors cursor-pointer group"
          onClick={() => navigate('/profile')}>
          <div className="w-8 h-8 rounded-full bg-[#1a3c2e] border border-[#2d6a4f] flex items-center justify-center flex-shrink-0">
            <span className="font-body font-bold text-[#52b788] text-[10px]">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-body font-semibold text-[#e8e4de] text-sm truncate">
              {profile?.fullName || user?.displayName || 'User'}
            </div>
            <div className="font-body text-[11px] text-[#4a5568] truncate">{user?.email}</div>
          </div>
          <ChevronRight size={14} className="text-[#1e2a2e] group-hover:text-[#4a5568] transition-colors" />
        </div>
        {!isTenant && (
          <div className="px-3 mb-2 mt-1">
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${userPlan.badgeColor.replace('bg-', 'bg-').replace('text-', 'text-')}`}>
              <Crown size={10} />
              {userPlan.badge}
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[#6b6460] hover:bg-[#2d1a1a] hover:text-[#e74c3c] transition-all duration-200">
          <LogOut size={16} />
          <span className="font-body text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0a0f12]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0d1215] border-r border-[#1e2a2e] fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#0d1215] z-50 shadow-deep lg:hidden border-r border-[#1e2a2e]">
              <div className="flex items-center justify-between px-5 pt-5 pb-0">
                <div />
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-400">
                  <X size={18} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0d1215] border-b border-[#1e2a2e] sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-[#141b1e] text-[#4a5568] transition-colors">
            <Menu size={20} />
          </button>
          <div className="font-display font-bold text-[#e8e4de] text-lg tracking-tight">Gravlo</div>
          {country && (
            <span className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-[#141b1e] rounded-lg border border-[#1e2a2e] font-body text-[10px] text-[#4a5568] font-bold uppercase tracking-wider">
              {getFlag(country.code)} {country.currency}
            </span>
          )}
        </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

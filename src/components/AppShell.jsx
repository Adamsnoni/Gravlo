// src/components/AppShell.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Building2, Bell, CreditCard, Settings, LogOut, Menu, X, KeyRound, ChevronRight, Crown, User, AlertTriangle, Archive, Zap, Sparkles } from 'lucide-react';
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
  { to: '/tenant/maintenance', icon: Zap, label: 'Maintenance' },
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
    setActiveTab(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (isTenant || !user?.uid) return;
    const unsubUnits = subscribePendingUnitsCount(user.uid, setPendingCount);
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
    <div className="flex flex-col h-full bg-[#0d1215]">
      {/* Brand Header */}
      <div className="px-6 py-10 border-b border-[#1e2a2e]/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center shadow-lg shadow-[#1a3c2e]/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <KeyRound size={18} className="text-[#e8e4de] relative z-10" />
          </div>
          <div>
            <div className="font-display font-bold text-[#e8e4de] text-xl leading-none tracking-tight">LeaseEase</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-1 h-1 rounded-full bg-[#52b788] animate-pulse" />
              <span className="text-[9px] text-[#4a5568] font-black uppercase tracking-[0.2em]">Platform Core</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Matrix */}
      <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto no-scrollbar">
        <p className="px-3 mb-4 font-body text-[9px] font-bold text-[#4a5568] uppercase tracking-[0.3em]">Operational Menu</p>
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
              className={`flex items-center gap-4 px-4 py-3.5 rounded-[1.25rem] transition-all duration-300 group relative ${isActive
                ? 'bg-[#1a3c2e]/20 text-[#52b788] shadow-sm'
                : 'text-[#4a5568] hover:bg-[#141b1e] hover:text-[#8a9ba8]'
                }`}
            >
              {isActive && (
                <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-[#52b788] rounded-r-full" />
              )}
              <Icon size={18} className={`${isActive ? 'text-[#52b788]' : 'text-[#4a5568] group-hover:text-[#8a9ba8]'} transition-colors`} />
              <span className={`font-body text-sm tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>

              {label === 'Activity' && unreadNotificationsCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-[#e74c3c] text-white text-[9px] font-bold flex items-center justify-center animate-bounce shadow-lg shadow-[#e74c3c]/20">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
              {label === 'Properties' && pendingCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-[#f0c040] text-[#1a1614] text-[9px] font-black flex items-center justify-center shadow-lg shadow-[#f0c040]/20">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Identity Sphere */}
      <div className="p-6 border-t border-[#1e2a2e]/50">
        <div
          className="flex items-center gap-4 p-4 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] hover:border-[#1a3c2e] transition-all cursor-pointer group mb-4"
          onClick={() => navigate('/profile')}
        >
          <div className="w-10 h-10 rounded-[1rem] bg-[#1a3c2e] border border-[#2d6a4f]/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="font-display font-bold text-[#52b788] text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-body font-bold text-[#e8e4de] text-sm truncate tracking-tight">
              {profile?.fullName || user?.displayName || 'User Entity'}
            </div>
            {!isTenant ? (
              <div className={`inline-flex items-center gap-1 mt-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${userPlan.badgeColor.replace('bg-', 'text-')}`}>
                <Crown size={8} /> {userPlan.badge}
              </div>
            ) : (
              <div className="text-[8px] font-black uppercase tracking-[0.1em] text-[#52b788]">Verified Resident</div>
            )}
          </div>
        </div>

        <button onClick={handleLogout} className="flex items-center justify-center gap-3 w-full h-12 rounded-xl text-[#4a5568] hover:bg-[#2d1a1a]/20 hover:text-[#e74c3c] transition-all duration-300 font-body text-[10px] font-bold uppercase tracking-widest border border-transparent hover:border-[#3d2020]/20">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#070b0d]">
      <aside className="hidden lg:flex flex-col w-72 bg-[#0d1215] border-r border-[#1e2a2e] fixed inset-y-0 left-0 z-40 transition-all duration-500">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#070b0d]/80 backdrop-blur-xl z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-[#0d1215] z-50 shadow-2xl lg:hidden border-r border-[#1e2a2e]">
              <div className="flex items-center justify-end p-6">
                <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-72 flex flex-col min-h-screen relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#52b788]/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#1a3c2e]/5 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />

        <div className="lg:hidden flex items-center gap-4 px-6 py-4 bg-[#0d1215]/80 backdrop-blur-md border-b border-[#1e2a2e] sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] flex items-center justify-center">
            <Menu size={20} />
          </button>
          <div className="font-display font-bold text-[#e8e4de] text-xl tracking-tight">LeaseEase</div>
        </div>

        <div className="flex-1 p-6 sm:p-8 lg:p-12 max-w-[1400px] w-full mx-auto relative z-10 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

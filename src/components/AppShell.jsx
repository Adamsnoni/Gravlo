// src/components/AppShell.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Bell, Building2, Archive, AlertTriangle, CreditCard, User, Settings, Crown, KeyRound, ChevronRight, LogOut, Menu, X, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeUnreadNotificationsCount, subscribePendingUnitsCount } from '../services/firebase';
import { getFlag } from '../utils/countries';
import toast from 'react-hot-toast';
import { PLANS } from '../services/subscription';

const LANDLORD_NAV = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/archive', icon: Archive, label: 'Archive' },
  { to: '/reminders', icon: AlertTriangle, label: 'Reminders' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/subscription', icon: Crown, label: 'Subscription' },
];

const TENANT_NAV = [
  { to: '/tenant', icon: LayoutGrid, label: 'My Home' },
  { to: '/tenant/reminders', icon: Bell, label: 'Reminders' },
  { to: '/tenant/payments', icon: CreditCard, label: 'Payments' },
  { to: '/tenant/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppShell({ children }) {
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
  const [activeTab, setActiveTab] = useState(location.pathname);

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
    toast.success('Signed out');
    navigate('/login');
  };

  const initials = (profile?.fullName || user?.displayName || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="px-6 py-8 border-b border-[#f0f7f2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center shadow-lg transform -rotate-3">
            <KeyRound size={20} className="text-white opacity-95" />
          </div>
          <div>
            <div className="font-fraunces font-extrabold text-[#1a2e22] text-xl leading-none tracking-tight">Gravlo</div>
            <div className="text-[10px] text-[#6b8a7a] font-bold mt-1.5 uppercase tracking-widest">Lease Simplified</div>
          </div>
        </div>

        {country && (
          <div className="mt-6 flex items-center gap-2 px-2.5 py-1.5 bg-[#f4fbf7] rounded-lg border border-[#ddf0e6] w-fit">
            <span className="text-sm leading-none">{getFlag(country.code)}</span>
            <span className="text-[11px] text-[#1a6a3c] font-extrabold tracking-wide uppercase">{country.currency}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => {
          // Use strict matching for the base tenant route to prevent overlap with sub-routes
          const isActive = to === '/tenant'
            ? location.pathname === '/tenant'
            : activeTab === to || activeTab.startsWith(to + '/');

          return (
            <Link
              key={to}
              to={to}
              onClick={() => {
                setActiveTab(to);
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-[#e8f5ee] text-[#1a6a3c] shadow-sm'
                : 'text-[#6b8a7a] hover:bg-[#f4fbf7] hover:text-[#1a6a3c]'
                }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white shadow-xs' : 'bg-transparent'}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#1a6a3c]' : 'text-[#94a3a8] group-hover:text-[#1a6a3c]'} />
              </div>
              <span className={`text-sm tracking-tight ${isActive ? 'font-bold' : 'font-semibold'}`}>{label}</span>

              {(label === 'Activity' || label === 'Dashboard') && unreadNotificationsCount > 0 && (
                <span className="ml-auto min-w-[20px] h-[20px] px-1 rounded-full bg-[#e74c3c] text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse border-2 border-white shadow-sm">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
              {label === 'Properties' && pendingCount > 0 && (
                <span className="ml-auto min-w-[20px] h-[20px] px-1 rounded-full bg-[#1a6a3c] text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-sm">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-[#f0f7f2] bg-[#fcfdfc]">
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f4fbf7] transition-all cursor-pointer group border border-transparent hover:border-[#ddf0e6]"
          onClick={() => navigate('/profile')}>
          <div className="w-10 h-10 rounded-full bg-[#1a3c2e] flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-emerald-50">
            <span className="font-bold text-[#52b788] text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[#1a2e22] text-sm truncate">
              {profile?.fullName || user?.displayName || 'User'}
            </div>
            <div className="text-[11px] text-[#94a3a8] truncate font-medium">{user?.email}</div>
          </div>
          <ChevronRight size={14} className="text-[#cce8d8] group-hover:text-[#1a6a3c] transition-colors" />
        </div>

        {!isTenant && (
          <div className="px-2.5 mt-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest shadow-xs ${userPlan.badgeColor} ${userPlan.badgeColor.replace('bg-', 'text-').replace('-100', '-700')}`}>
              <Crown size={11} strokeWidth={3} />
              {userPlan.badge}
            </div>
          </div>
        )}

        <button onClick={handleLogout} className="flex items-center gap-3 w-full mt-4 px-4 py-3 rounded-xl text-[#94a3a8] hover:bg-[#fff5f5] hover:text-[#e74c3c] transition-all duration-300 group">
          <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
          <span className="text-sm font-bold">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f4fbf7]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#ddf0e6] fixed inset-y-0 left-0 z-40 shadow-[4px_0_24px_rgba(26,60,46,0.03)]">
        <SidebarContent />
      </aside>

      {/* Mobile Wrapper */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen relative overflow-hidden">
        {/* Leaf Background Decorator */}
        <div className="absolute top-[-50px] right-[-50px] opacity-[0.03] pointer-events-none rotate-45 transform">
          <svg width="400" height="400" viewBox="0 0 100 100" fill="#1a3c2e"><path d="M50 0C50 0 20 20 20 50C20 80 50 100 50 100C50 100 80 80 80 50C80 20 50 0 50 0Z" /></svg>
        </div>

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-[#ddf0e6] sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2.5 rounded-xl bg-[#f4fbf7] text-[#1a6a3c] hover:bg-[#e8f5ee] transition-all">
              <Menu size={22} />
            </button>
            <div className="font-fraunces font-extrabold text-[#1a2e22] text-xl tracking-tight">Gravlo</div>
          </div>
          {country && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#f4fbf7] rounded-lg border border-[#ddf0e6]">
              <span className="text-sm">{getFlag(country.code)}</span>
              <span className="text-[10px] text-[#1a6a3c] font-extrabold uppercase">{country.currency}</span>
            </div>
          )}
        </header>

        {/* Page Content */}
        <div className="flex-1 px-4 py-6 sm:px-8 sm:py-10 max-w-7xl w-full mx-auto relative z-10">
          {children || <Outlet />}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#1a3c2e]/40 backdrop-blur-md z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white z-50 shadow-2xl lg:hidden ring-1 ring-black/5"
            >
              <div className="flex items-center justify-end px-4 pt-4">
                <button onClick={() => setSidebarOpen(false)} className="p-2.5 rounded-xl bg-[#f4fbf7] text-[#1a6a3c] hover:bg-[#e8f5ee] transition-all">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

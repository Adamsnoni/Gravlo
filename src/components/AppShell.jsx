// src/components/AppShell.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
      <div className="px-5 py-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center shadow-sm">
            <KeyRound size={17} className="text-cream" />
          </div>
          <div>
            <div className="font-display font-semibold text-ink text-lg leading-none">LeaseEase</div>
            <div className="text-xs text-stone-400 font-body mt-0.5 tracking-wide">Property Manager</div>
          </div>
        </div>
        {/* Country pill */}
        {country && (
          <div className="mt-3 flex items-center gap-1.5 px-2 py-1 bg-stone-50 rounded-lg border border-stone-100 w-fit">
            <span className="text-sm">{getFlag(country.code)}</span>
            <span className="font-body text-xs text-stone-400">{country.currency} ({currencySymbol})</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={17} />
            <span>{label}</span>
            {label === 'Dashboard' && unreadNotificationsCount > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-sage text-cream text-[10px] font-body font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
            {label === 'Properties' && pendingCount > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-rust text-cream text-[10px] font-body font-bold flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-stone-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer group"
          onClick={() => navigate('/profile')}>
          <div className="w-8 h-8 rounded-full bg-sage/15 border border-sage/30 flex items-center justify-center flex-shrink-0">
            <span className="font-body font-semibold text-sage text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-body font-medium text-ink text-sm truncate">
              {profile?.fullName || user?.displayName || 'User'}
            </div>
            <div className="font-body text-xs text-stone-400 truncate">{user?.email}</div>
          </div>
          <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-400 transition-colors" />
        </div>
        {!isTenant && (
          <div className="px-3 mb-1">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-body font-semibold ${userPlan.badgeColor}`}>
              <Crown size={10} />
              {userPlan.badge}
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="nav-item w-full mt-1 text-rust hover:bg-rust/8 hover:text-rust">
          <LogOut size={16} /><span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-stone-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-stone-100 fixed inset-y-0 left-0 z-40">
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
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-deep lg:hidden">
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
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-stone-100 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors">
            <Menu size={20} />
          </button>
          <div className="font-display font-semibold text-ink text-lg">LeaseEase</div>
          {country && (
            <span className="ml-auto text-sm flex items-center gap-1 font-body text-xs text-stone-400">
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

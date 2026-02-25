// src/pages/TenantDashboardPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CreditCard, ArrowRight, Bell, Hash, PartyPopper, Sparkles, Building2, MapPin, Mail, CheckCircle2, X, ArrowUpRight, Clock, Star } from 'lucide-react';
import { format, isAfter, subHours } from 'date-fns';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenantPayments, subscribeReminders } from '../services/firebase';
import { subscribeTenantTenancies } from '../services/tenancy';
import { formatUnitDisplay, getShortUnitId } from '../utils/unitDisplay';

export default function TenantDashboardPage() {
  const { user, profile } = useAuth();
  const { fmt, fmtRent, country, currencySymbol } = useLocale();

  const [units, setUnits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const u1 = subscribeTenantTenancies(user.uid, (list) => {
      setUnits(list.map(t => ({ ...t, id: t.unitId || t.id, type: 'unit' })));
    });
    const u2 = subscribeTenantPayments(user.uid, setPayments);
    return () => { u1?.(); u2?.(); };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const u = subscribeReminders(user.uid, (list) => {
      setReminders(list.filter((r) => r.createdBy === 'tenant' && r.status !== 'paid'));
    });
    return () => u?.();
  }, [user?.uid]);

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const firstName = (profile?.fullName || user?.displayName || 'there').split(' ')[0];
  const activeHomes = units.filter(h => h.status === 'active');
  const pastHomes = units.filter(h => h.status === 'former');
  const yearlyRent = activeHomes.reduce((s, h) => s + (h.rentAmount || 0), 0) * 12;

  const [dismissedWelcome, setDismissedWelcome] = useState(() => {
    if (!user?.uid) return false;
    return localStorage.getItem(`gravlo_welcome_dismissed_${user.uid}`) === 'true';
  });

  const handleDismissWelcome = () => {
    setDismissedWelcome(true);
    if (user?.uid) {
      localStorage.setItem(`gravlo_welcome_dismissed_${user.uid}`, 'true');
    }
  };

  const canvasRef = useRef(null);

  const newApprovals = activeHomes.filter(h => {
    if (!h.welcomeMessageSent) return false;
    const welcomeDate = h.welcomeMessageDate?.toDate?.() || new Date(h.welcomeMessageDate);
    return isAfter(welcomeDate, subHours(new Date(), 48));
  });

  useEffect(() => {
    if (newApprovals.length > 0 && !dismissedWelcome) {
      let interval;
      let myConfetti;
      const timer = setTimeout(() => {
        if (!canvasRef.current) return;
        myConfetti = confetti.create(canvasRef.current, { resize: true, useWorker: true });
        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;
        interval = setInterval(function () {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          const particleCount = 50 * (timeLeft / duration);
          myConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          myConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }, 50);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
        if (myConfetti) myConfetti.reset();
      };
    }
  }, [newApprovals.length, dismissedWelcome]);

  return (
    <div className="space-y-10 py-2 animate-in fade-in duration-500">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tight">
            Welcome, <span className="text-[#52b788]">{firstName}</span>
          </h1>
          <p className="font-body text-[#4a5568] text-sm mt-1 uppercase tracking-widest font-bold">
            {activeHomes.length === 0 ? 'Portal initialized · Standby mode' : 'Active Residency Portfolio'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-2 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#52b788] animate-pulse" />
            Portal Linked
          </div>
        </div>
      </motion.div>

      {/* Primary Stats Grid */}
      <div className="grid sm:grid-cols-3 gap-6">
        <StatCard
          icon={Home}
          label="Active Homes"
          value={activeHomes.length}
          delay={0.05}
          color="text-[#52b788]"
          bg="bg-[#1a3c2e]/10"
          border="border-[#2d6a4f]/20"
        />
        <StatCard
          icon={Clock}
          label="Next Billing (Total)"
          value={fmt(yearlyRent / 12)}
          delay={0.1}
          color="text-[#f0c040]"
          bg="bg-[#2d2510]/10"
          border="border-[#3d3215]/20"
        />
        <StatCard
          icon={CreditCard}
          label="Total Fulfilled"
          value={fmt(totalPaid)}
          delay={0.15}
          color="text-[#e8e4de]"
          bg="bg-[#141b1e]"
          border="border-[#1e2a2e]"
          showTrend
        />
      </div>

      <div className="grid xl:grid-cols-2 gap-8">
        {/* Active Homes Section */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="font-display text-[#e8e4de] text-xl font-bold tracking-tight">My Residences</h2>
              <p className="font-body text-[10px] text-[#4a5568] font-bold uppercase tracking-widest mt-1">Managed Property Details</p>
            </div>
            <Link to="/tenant/payments" className="btn-secondary text-[10px] font-bold uppercase tracking-widest py-2 px-4 group">
              Financials <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-4">
            {activeHomes.length === 0 ? (
              <div className="card p-12 text-center bg-[#0d1215] border-2 border-dashed border-[#1e2a2e]">
                <Home size={32} className="text-[#1e2a2e] mx-auto mb-4" />
                <p className="font-body font-medium text-[#4a5568]">No active residences detected.</p>
              </div>
            ) : (
              activeHomes.map(h => (
                <div key={h.id} className="card p-6 bg-[#0d1215] border-[#1e2a2e] hover:border-[#1a3c2e] transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#52b788]/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-[#52b788]/10 transition-colors" />
                  <div className="flex items-center justify-between gap-6 relative">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#52b788] group-hover:scale-105 transition-transform">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <p className="font-body font-bold text-[#e8e4de] text-base tracking-tight leading-tight">{h.unitName || h.propertyName}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 font-body text-[10px] text-[#52b788] font-bold bg-[#1a3c2e]/20 border border-[#2d6a4f]/20 px-2 py-0.5 rounded-md">
                            <Hash size={10} /> {h.unitNumber || 'UNIT'}
                          </span>
                          <span className="font-body text-[10px] text-[#4a5568] uppercase font-bold tracking-widest">
                            {h.address || 'Verified Residency'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-display text-[#e8e4de] font-bold text-lg tracking-tight">
                        {fmtRent(h.monthlyRent || h.rentAmount || 0, h.rentType || h.billingCycle || 'monthly')}
                      </p>
                      <span className="badge-sage mt-2">Active Lease</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Reminders & Alerts */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="font-display text-[#e8e4de] text-xl font-bold tracking-tight">Alert Protocol</h2>
              <p className="font-body text-[10px] text-[#4a5568] font-bold uppercase tracking-widest mt-1">Pending Signatures & Payments</p>
            </div>
          </div>

          <div className="card p-4 bg-[#0d1215] border-[#1e2a2e] space-y-2">
            {reminders.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={24} className="text-[#1e2a2e] mx-auto mb-3" />
                <p className="font-body text-xs text-[#4a5568] font-bold uppercase tracking-widest">No active alerts</p>
              </div>
            ) : (
              reminders.slice(0, 4).map(r => {
                const due = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-4 p-4 rounded-xl hover:bg-[#141b1e]/50 border border-transparent hover:border-[#1e2a2e] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#2d2510]/10 border border-[#3d3215]/30 flex items-center justify-center text-[#f0c040]">
                        <Bell size={18} />
                      </div>
                      <div>
                        <p className="font-body text-sm font-bold text-[#e8e4de] tracking-tight">{r.propertyName || 'Financial Fulfillment'}</p>
                        <p className="font-body text-[10px] text-[#4a5568] font-bold uppercase tracking-widest mt-0.5">Deadline: {format(due, 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-[#e8e4de] text-sm tracking-tight">{fmt(r.amount || 0)}</p>
                      <Link to="/tenant/payments" className="text-[9px] text-[#52b788] font-bold uppercase tracking-widest hover:underline">Fulfill Now</Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ledger Summary */}
          <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#1a3c2e]/10 to-[#0d1215] border border-[#2d6a4f]/20 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#52b788]/5 rounded-full blur-[60px] -mr-24 -mt-24 group-hover:bg-[#52b788]/10 transition-colors" />
            <div className="relative flex items-center justify-between gap-6">
              <div>
                <h3 className="font-display text-[#e8e4de] text-lg font-bold mb-1">Financial Integrity</h3>
                <p className="font-body text-[11px] text-[#52b788] font-bold uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={12} /> Account in Good Standing
                </p>
              </div>
              <Link to="/tenant/payments" className="btn-primary py-3 px-6 shadow-xl shadow-[#1a3c2e]/20 text-[10px] font-bold uppercase tracking-widest">
                Access Ledger
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {activeHomes.length === 0 && pastHomes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[32px] bg-[#2d1a1a]/5 border border-[#3d2020]/20 flex items-start gap-5">
          <div className="w-12 h-12 rounded-2xl bg-[#0d1215] border border-[#3d2020] flex items-center justify-center text-[#e74c3c] flex-shrink-0">
            <ShieldOff size={24} />
          </div>
          <div>
            <p className="font-display text-[#e8e4de] font-bold text-lg mb-1 tracking-tight">Post-Residency Access</p>
            <p className="font-body text-sm text-[#4a5568] font-medium leading-relaxed max-w-2xl">
              No active leases detected. Your account remains active in a read-only capacity allowing you to download past fulfillment receipts and maintenance records.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Approved Tenant Celebration Overlay Modal ──────────────────────── */}
      <AnimatePresence>
        {newApprovals.length > 0 && !dismissedWelcome && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#070b0d]/80 backdrop-blur-xl pointer-events-auto"
              onClick={handleDismissWelcome} />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.6, type: 'spring', damping: 25 }}
              className="relative w-full max-w-3xl bg-[#0d1215] rounded-[48px] border border-[#1e2a2e] shadow-2xl flex flex-col pointer-events-auto z-10 overflow-hidden"
              style={{ maxHeight: '90vh' }}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1a3c2e] via-[#52b788] to-[#1a3c2e]" />
              <button onClick={handleDismissWelcome} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-2xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de] transition-all z-20"><X size={20} /></button>

              <div className="p-10 md:p-14 overflow-y-auto no-scrollbar">
                {newApprovals.map((prop, idx) => (
                  <div key={prop.id} className={idx > 0 ? "mt-12 pt-12 border-t border-[#1e2a2e]" : ""}>
                    <div className="flex flex-col lg:flex-row gap-12 items-start">
                      {/* Left Header */}
                      <div className="lg:w-1/3 space-y-6 text-center lg:text-left">
                        <div className="relative inline-block">
                          <div className="w-24 h-24 md:w-28 md:h-28 rounded-[2.5rem] bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center shadow-2xl shadow-[#1a3c2e]/40 relative transform rotate-3 transition-transform hover:rotate-0 duration-700">
                            <CheckCircle2 size={40} className="text-[#e8e4de]" />
                            <div className="absolute -top-4 -right-4 text-[#f0c040] animate-bounce"><Star size={24} fill="currentColor" /></div>
                          </div>
                        </div>
                        <div>
                          <h2 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tighter leading-none mb-3">Welcome Home.</h2>
                          <div className="flex items-center justify-center lg:justify-start gap-2 text-[#52b788]">
                            <PartyPopper size={18} />
                            <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em]">Application Successful</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Detail */}
                      <div className="flex-1 space-y-8">
                        <div className="p-8 rounded-3xl bg-[#141b1e]/50 border border-[#1e2a2e] space-y-6">
                          <div className="flex items-start gap-5">
                            <div className="w-12 h-12 rounded-xl bg-[#0d1215] border border-[#1e2a2e] flex items-center justify-center text-[#52b788] flex-shrink-0">
                              <Building2 size={24} />
                            </div>
                            <div>
                              <p className="font-body text-[10px] text-[#4a5568] uppercase tracking-widest font-bold mb-1">Registered Address</p>
                              <p className="font-display text-[#e8e4de] text-xl font-bold tracking-tight">{prop.buildingName || prop.propertyName}</p>
                              <p className="font-body text-[#8a9ba8] text-sm mt-1 font-medium">{prop.address}</p>
                              {prop.unitNumber && (
                                <span className="inline-flex mt-3 px-3 py-1 rounded-lg bg-[#1a3c2e]/20 border border-[#2d6a4f]/20 text-[#52b788] text-[10px] font-bold uppercase tracking-widest">
                                  Unit {prop.unitNumber}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="h-px bg-[#1e2a2e]/50 w-full" />

                          <div className="flex items-start gap-5">
                            <div className="w-12 h-12 rounded-xl bg-[#0d1215] border border-[#1e2a2e] flex items-center justify-center text-[#f0c040] flex-shrink-0">
                              <Mail size={24} />
                            </div>
                            <div>
                              <p className="font-body text-[10px] text-[#4a5568] uppercase tracking-widest font-bold mb-1">Manager Note</p>
                              <p className="font-body text-[#8a9ba8] text-sm italic leading-relaxed">
                                "We are thrilled to have you at {prop.name}. Your access is now live. Please review the digital handbook attached to your portal."
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                          <Link to="/tenant/payments" onClick={handleDismissWelcome} className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#1a3c2e] to-[#2d6a4f] text-[#e8e4de] flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-[#1a3c2e]/30 hover:scale-[1.02] transition-transform">
                            <CreditCard size={18} /> Initialize Payout
                          </Link>
                          <a href={`mailto:${prop.landlordEmail || ''}`} onClick={handleDismissWelcome} className="flex-1 h-14 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] text-[#e8e4de] flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a3c2e]/20 transition-all">
                            <Mail size={18} /> Contact Admin
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delay, color, bg, border, showTrend }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className={`stat-card p-6 bg-[#0d1215] border-l-4 ${border} relative overflow-hidden group`} style={{ borderLeftColor: color === 'text-[#52b788]' ? '#52b788' : color === 'text-[#f0c040]' ? '#f0c040' : '#1a3c2e' }}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[40px] -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center text-current`}>
          <Icon size={18} className={color} />
        </div>
        {showTrend && <ArrowUpRight size={16} className="text-[#4a5568]" />}
      </div>
      <div>
        <p className={`font-display text-2xl font-bold tracking-tight ${color}`}>{value}</p>
        <p className="font-body text-[10px] text-[#4a5568] mt-1 uppercase tracking-widest font-bold">{label}</p>
      </div>
    </motion.div>
  );
}

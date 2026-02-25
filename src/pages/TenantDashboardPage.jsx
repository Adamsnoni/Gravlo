// src/pages/TenantDashboardPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, CreditCard, ArrowRight, Bell, Hash, PartyPopper,
  Sparkles, Building2, MapPin, Mail, CheckCircle2, X,
  ArrowUpRight, Clock, Star, Wrench, Phone, ShieldCheck,
  ChevronRight, HardDrive, Zap
} from 'lucide-react';
import { format, isAfter, subHours, differenceInDays } from 'date-fns';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenantPayments, subscribeReminders, subscribeTenantMaintenance } from '../services/firebase';
import { subscribeTenantTenancies } from '../services/tenancy';
import { formatUnitDisplay, getShortUnitId } from '../utils/unitDisplay';

export default function TenantDashboardPage() {
  const { user, profile } = useAuth();
  const { fmt, fmtRent } = useLocale();

  const [units, setUnits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const u1 = subscribeTenantTenancies(user.uid, (list) => {
      setUnits(list.map(t => ({ ...t, id: t.unitId || t.id, type: 'unit' })));
    });
    const u2 = subscribeTenantPayments(user.uid, setPayments);
    const u3 = subscribeTenantMaintenance(user.uid, setMaintenance);
    return () => { u1?.(); u2?.(); u3?.(); };
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

  const firstName = (profile?.fullName || user?.displayName || 'Resident').split(' ')[0];
  const activeHomes = units.filter(h => h.status === 'active');

  // Rent Status Logic
  const nextReminder = reminders[0]; // Assuming sorted by dueDate in service
  const rentStatus = nextReminder ? {
    amount: nextReminder.amount,
    dueDate: nextReminder.dueDate?.toDate?.() ?? new Date(nextReminder.dueDate),
    status: isAfter(new Date(), nextReminder.dueDate?.toDate?.() ?? new Date(nextReminder.dueDate)) ? 'overdue' : 'due',
    daysUntil: differenceInDays(nextReminder.dueDate?.toDate?.() ?? new Date(nextReminder.dueDate), new Date())
  } : null;

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
      {/* Editorial Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-body text-[#4a5568] text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-center sm:text-left">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
          <h1 className="font-display text-[#e8e4de] text-5xl font-bold tracking-tighter text-center sm:text-left">
            Hey, <span className="text-[#52b788]">{firstName}</span> <span className="inline-block animate-bounce">👋</span>
          </h1>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="px-5 py-2.5 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] text-[9px] font-black uppercase tracking-[0.25em] flex items-center gap-3 shadow-xl">
            <div className="w-2 h-2 rounded-full bg-[#52b788] animate-pulse shadow-[0_0_10px_rgba(82,183,136,0.5)]" />
            Synchronized
          </div>
        </div>
      </motion.div>

      {/* Rent Status Hero */}
      <RentStatusHero status={rentStatus} tenancy={activeHomes[0]} fmt={fmt} />

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat
          icon={HardDrive}
          label="Financials"
          value={fmt(totalPaid)}
          accent="text-[#52b788]"
          bg="bg-[#1a3c2e]/10"
          delay={0.1}
        />
        <QuickStat
          icon={ShieldCheck}
          label="Lease Status"
          value="Active"
          accent="text-[#52b788]"
          bg="bg-[#1a3c2e]/10"
          delay={0.15}
        />
        <QuickStat
          icon={Wrench}
          label="Services"
          value={`${maintenance.filter(m => m.status !== 'resolved').length} Open`}
          accent="text-[#f0c040]"
          bg="bg-[#2d2510]/10"
          delay={0.2}
        />
        <QuickStat
          icon={CreditCard}
          label="Sync Health"
          value="Primary"
          accent="text-[#8a9ba8]"
          bg="bg-[#141b1e]"
          delay={0.25}
        />
      </div>

      <div className="grid xl:grid-cols-2 gap-8">
        {/* Active Residences */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="font-display text-[#e8e4de] text-2xl font-bold tracking-tight">Active Residencies</h2>
              <p className="font-body text-[9px] text-[#4a5568] font-black uppercase tracking-[0.2em] mt-1.5 leading-none">Registered Property Assets</p>
            </div>
          </div>

          <div className="space-y-4">
            {activeHomes.length === 0 ? (
              <div className="card p-16 text-center border-2 border-dashed border-[#1e2a2e] opacity-50">
                <Home size={32} className="mx-auto mb-4 text-[#1e2a2e]" />
                <p className="font-body text-xs font-bold uppercase tracking-widest text-[#4a5568]">No Active Leases</p>
              </div>
            ) : (
              activeHomes.map((h, i) => (
                <div key={h.id} className="card p-8 bg-[#0d1215] border-[#1e2a2e] hover:border-[#52b788]/30 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#52b788]/5 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none" />

                  <div className="flex items-start justify-between gap-6 relative">
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#52b788] group-hover:scale-105 transition-transform duration-500 shadow-inner">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-[#e8e4de] text-xl tracking-tight uppercase leading-none">{h.propertyName}</h3>
                        <p className="font-body text-[10px] text-[#4a5568] font-black uppercase tracking-[0.2em] mt-3">
                          {h.unitName} · {h.address}
                        </p>

                        {/* Lease Progress */}
                        <div className="mt-8 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-body text-[9px] text-[#4a5568] font-black uppercase tracking-[0.2em]">Lease Cycle</span>
                            <span className="font-body text-[9px] text-[#52b788] font-black uppercase tracking-[0.2em]">Synchronized</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#141b1e] rounded-full overflow-hidden border border-[#1e2a2e]/50">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '65%' }} // Mock progress for visual impact
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-[#1a3c2e] to-[#52b788] rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Maintenance & Management */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="font-display text-[#e8e4de] text-2xl font-bold tracking-tight">Support Infrastructure</h2>
              <p className="font-body text-[9px] text-[#4a5568] font-black uppercase tracking-[0.2em] mt-1.5 leading-none">Management & Maintenance</p>
            </div>
            <Link to="/tenant/maintenance" className="h-10 px-6 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de] hover:border-[#52b788]/30 transition-all text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              Service Portal <ChevronRight size={12} />
            </Link>
          </div>

          <div className="space-y-4">
            {/* Maintenance Highlight */}
            <div className="card p-8 bg-[#0d1215] border-[#1e2a2e] relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#2d2510]/10 border border-[#3d3215]/30 flex items-center justify-center text-[#f0c040]">
                  <Wrench size={22} />
                </div>
                <span className="font-body text-[9px] text-[#f0c040] font-black uppercase tracking-[0.3em]">Active Tickets</span>
              </div>

              {maintenance.filter(m => m.status !== 'resolved').length === 0 ? (
                <p className="font-body text-sm text-[#8a9ba8] font-medium leading-relaxed">
                  No active maintenance tickets. Your infrastructure is currently optimal.
                </p>
              ) : (
                <div className="space-y-4">
                  {maintenance.filter(m => m.status !== 'resolved').slice(0, 2).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-[#141b1e]/50 border border-[#1e2a2e]">
                      <span className="font-body text-xs font-bold text-[#e8e4de] uppercase tracking-tight">{m.title}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#f0c040] py-1 px-2 bg-[#2d2510]/30 rounded-md border border-[#3d3215]/30">{m.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Landlord Contact */}
            <div className="card p-8 bg-[#0d1215] border-[#1e2a2e] group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-[#1a3c2e] to-[#0d1215] border border-[#1e2a2e] flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500">
                  <span className="font-display font-bold text-[#52b788] text-xl">
                    {activeHomes[0]?.landlordName?.slice(0, 1) || 'L'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-body text-[9px] text-[#4a5568] font-black uppercase tracking-[0.25em] mb-2 leading-none">Property Manager</p>
                  <h3 className="font-display font-bold text-[#e8e4de] text-xl tracking-tight uppercase leading-none">{activeHomes[0]?.landlordName || 'Administrative Entity'}</h3>
                  <div className="flex gap-4 mt-6">
                    <button className="flex-1 h-11 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de] hover:border-[#4a5568]/30 transition-all flex items-center justify-center gap-2">
                      <Phone size={14} />
                    </button>
                    <button className="flex-1 h-11 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de] hover:border-[#4a5568]/30 transition-all flex items-center justify-center gap-2">
                      <Mail size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {newApprovals.length > 0 && !dismissedWelcome && (
          <CelebrationModal approvals={newApprovals} onDismiss={handleDismissWelcome} canvasRef={canvasRef} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RentStatusHero({ status, tenancy, fmt }) {
  if (!status) return (
    <div className="p-12 rounded-[40px] bg-gradient-to-br from-[#141b1e] to-[#0d1215] border border-[#1e2a2e] flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-3xl bg-[#0d1215] border border-[#1e2a2e] flex items-center justify-center text-[#4a5568] mb-6">
        <Sparkles size={32} />
      </div>
      <h2 className="font-display text-[#e8e4de] text-2xl font-bold tracking-tight mb-2 uppercase">Account Fully Balanced</h2>
      <p className="font-body text-[#4a5568] text-sm font-medium uppercase tracking-widest">No pending financial obligations detected</p>
    </div>
  );

  const isOverdue = status.status === 'overdue';
  const color = isOverdue ? '#e74c3c' : '#52b788';
  const bgGradient = isOverdue
    ? 'linear-gradient(135deg, #2d1a1a 0%, #0d1215 100%)'
    : 'linear-gradient(135deg, #1a3c2e 0%, #0d1215 100%)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-10 md:p-14 rounded-[3rem] border shadow-2xl relative overflow-hidden group"
      style={{ background: bgGradient, borderColor: `${color}30` }}
    >
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none -mr-48 -mt-48 opacity-20" style={{ backgroundColor: color }} />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-[#0d1215]/50 backdrop-blur-md" style={{ borderColor: `${color}40` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: color }} />
            <span className="font-body text-[10px] font-black uppercase tracking-[0.2em]" style={{ color }}>
              {isOverdue ? `${Math.abs(status.daysUntil)} Days Overdue` : `Due in ${status.daysUntil} Days`}
            </span>
          </div>

          <div>
            <p className="font-body text-[#4a5568] text-[11px] font-black uppercase tracking-[0.3em] mb-4">Current Liability Summary</p>
            <h2 className="font-display text-white text-7xl font-bold tracking-tighter leading-none mb-4">
              {fmt(status.amount)}
            </h2>
            <p className="font-body text-[#8a9ba8] text-base font-medium uppercase tracking-widest">
              {tenancy?.unitName || 'Primary Unit'} · {tenancy?.propertyName || 'Strategic Asset'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-4 min-w-[240px]">
          <Link to="/tenant/payments" className="h-16 px-10 rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:scale-[1.03] active:scale-[0.98] shadow-2xl"
            style={{ backgroundColor: color, color: '#0d1215' }}>
            Initialize Payout <ArrowRight size={18} strokeWidth={3} />
          </Link>
          <button className="h-16 px-10 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] text-[#e8e4de] hover:bg-[#1e2a2e] transition-all text-[11px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3">
            Review Breakdown
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function QuickStat({ icon: Icon, label, value, accent, bg, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-6 rounded-[2rem] bg-[#0d1215] border border-[#1e2a2e] hover:border-[#1a3c2e] transition-all group overflow-hidden relative"
    >
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-5 border border-transparent group-hover:border-current transition-all ${accent}`}>
        <Icon size={18} />
      </div>
      <p className="font-body text-[9px] text-[#4a5568] font-black uppercase tracking-[0.25em] mb-1.5">{label}</p>
      <p className={`font-display text-lg font-bold tracking-tight ${accent}`}>{value}</p>
    </motion.div>
  );
}

function CelebrationModal({ approvals, onDismiss, canvasRef }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#070b0d]/90 backdrop-blur-2xl pointer-events-auto"
        onClick={onDismiss} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.6, type: 'spring', damping: 25 }}
        className="relative w-full max-w-4xl bg-[#0d1215] rounded-[4rem] border border-[#1e2a2e] shadow-2xl flex flex-col pointer-events-auto z-10 overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1a3c2e] via-[#52b788] to-[#1a3c2e]" />
        <button onClick={onDismiss} className="absolute top-8 right-8 w-14 h-14 flex items-center justify-center rounded-[1.5rem] bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de] transition-all z-20 shadow-xl overflow-hidden group">
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <X size={24} className="relative z-10" />
        </button>

        <div className="p-12 md:p-20 overflow-y-auto no-scrollbar">
          {approvals.map((prop, idx) => (
            <div key={prop.id} className={idx > 0 ? "mt-16 pt-16 border-t border-[#1e2a2e]/50" : ""}>
              <div className="flex flex-col lg:flex-row gap-16 items-start">
                <div className="lg:w-1/3 space-y-10 text-center lg:text-left">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 md:w-36 md:h-36 rounded-[3.5rem] bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center shadow-2xl shadow-[#1a3c2e]/40 relative transform rotate-6 transition-transform hover:rotate-0 duration-700">
                      <CheckCircle2 size={56} className="text-[#e8e4de]" />
                      <div className="absolute -top-6 -right-6 text-[#f0c040] animate-bounce drop-shadow-[0_0_10px_rgba(240,192,64,0.5)]">
                        <Star size={32} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="font-display text-[#e8e4de] text-5xl md:text-6xl font-bold tracking-tighter leading-none mb-6">Welcome <br />Home.</h2>
                    <div className="flex items-center justify-center lg:justify-start gap-3 text-[#52b788]">
                      <PartyPopper size={20} />
                      <span className="font-body text-xs font-black uppercase tracking-[0.3em]">Credentials Verified</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-12">
                  <div className="p-10 rounded-[2.5rem] bg-[#141b1e]/50 border border-[#1e2a2e] space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#52b788]/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                    <div className="flex items-start gap-8 relative">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-[#0d1215] border border-[#1e2a2e] flex items-center justify-center text-[#52b788] flex-shrink-0 shadow-inner">
                        <Building2 size={32} />
                      </div>
                      <div>
                        <p className="font-body text-[10px] text-[#4a5568] font-black uppercase tracking-[0.3em] mb-3">Permanent Residency Address</p>
                        <p className="font-display text-[#e8e4de] text-2xl font-bold tracking-tight uppercase leading-none">{prop.propertyName}</p>
                        <p className="font-body text-[#8a9ba8] text-base mt-2 font-medium">{prop.address}</p>
                        <div className="flex items-center gap-3 mt-6">
                          <span className="px-5 py-2 rounded-xl bg-[#1a3c2e] border border-[#2d6a4f]/30 text-[#52b788] text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">
                            Unit {prop.unitNumber}
                          </span>
                          <span className="px-5 py-2 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#8a9ba8] text-[9px] font-black uppercase tracking-[0.2em]">
                            Secured
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-[#1e2a2e] via-[#1e2a2e]/20 to-transparent w-full" />

                    <div className="flex items-start gap-8 relative">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-[#0d1215] border border-[#1e2a2e] flex items-center justify-center text-[#f0c040] flex-shrink-0 shadow-inner">
                        <Mail size={32} />
                      </div>
                      <div>
                        <p className="font-body text-[10px] text-[#4a5568] font-black uppercase tracking-[0.3em] mb-3">Management Directive</p>
                        <p className="font-body text-[#8a9ba8] text-sm italic leading-relaxed opacity-80">
                          "Your tenure at {prop.propertyName} has been officially authorized. Key credentials and digital infrastructure access are now provisioned. We look forward to your residency."
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    <Link to="/tenant/payments" onClick={onDismiss} className="flex-1 h-16 rounded-2xl bg-[#52b788] text-[#0d1215] flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.25em] shadow-2xl shadow-[#52b788]/20 hover:scale-[1.02] transition-transform">
                      <CreditCard size={20} /> Initialize Financials
                    </Link>
                    <button onClick={onDismiss} className="flex-1 h-16 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] text-[#e8e4de] flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#1a3c2e]/30 hover:border-[#52b788]/30 transition-all">
                      <Zap size={20} /> Access Portal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

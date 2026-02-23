// src/pages/TenantDashboardPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CreditCard, ArrowRight, Bell, Hash, PartyPopper, Sparkles, Building2, MapPin, Mail, CheckCircle2, X } from 'lucide-react';
import { format, isAfter, subHours } from 'date-fns';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenantPayments, subscribeReminders } from '../services/firebase';
import { subscribeTenantTenancies } from '../services/tenancy';
import { formatUnitDisplay, getShortUnitId } from '../utils/unitDisplay';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35 },
});

export default function TenantDashboardPage() {
  const { user, profile } = useAuth();
  const { fmt, fmtRent, country } = useLocale();

  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    // Sync active homes via tenancies (secure UID-based)
    const u1 = subscribeTenantTenancies(user.uid, (list) => {
      setUnits(list.map(t => ({ ...t, id: t.unitId || t.id, type: 'unit' })));
    });

    // Payments & Reminders
    const u2 = subscribeTenantPayments(user.uid, setPayments);
    return () => {
      u1?.();
      u2?.();
    };
  }, [user?.uid, user?.email]);

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

  const allHomes = units; // Now simplified to just units from tenancies
  const activeHomes = allHomes.filter(h => h.status === 'active');
  const pastHomes = allHomes.filter(h => h.status === 'former');
  const nextDue = activeHomes.reduce((s, h) => s + (h.rentAmount || 0), 0);

  const [dismissedWelcome, setDismissedWelcome] = useState(false);
  const canvasRef = useRef(null);

  // Logic for "Approved Tenant Experience"
  const newApprovals = activeHomes.filter(h => {
    if (!h.welcomeMessageSent) return false;
    const welcomeDate = h.welcomeMessageDate?.toDate?.() || new Date(h.welcomeMessageDate);
    // Show celebration if approved in the last 48 hours
    return isAfter(welcomeDate, subHours(new Date(), 48));
  });

  useEffect(() => {
    if (newApprovals.length > 0 && !dismissedWelcome) {
      let interval;
      let myConfetti;

      const timer = setTimeout(() => {
        if (!canvasRef.current) return;
        myConfetti = confetti.create(canvasRef.current, { resize: true, useWorker: true });
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        interval = setInterval(function () {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

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
    <div className="space-y-8">
      <motion.div {...fadeUp(0)} className="flex items-start justify-between">
        <div>
          <p className="font-body text-stone-400 text-sm">
            {country?.name ? `${country.name} · ${country.currency}` : 'Your tenant portal'}
          </p>
          <h1 className="font-display text-ink text-3xl font-semibold mt-0.5">
            Welcome, <em>{firstName}</em>
          </h1>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div {...fadeUp(0.05)} className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center">
            <Home size={18} className="text-sage" />
          </div>
          <div>
            <div className="font-display text-ink text-2xl font-semibold">
              {activeHomes.length}
            </div>
            <div className="font-body text-stone-400 text-xs mt-0.5">Active homes</div>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.1)} className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
            <CreditCard size={18} className="text-amber" />
          </div>
          <div>
            <div className="font-display text-ink text-2xl font-semibold">
              {fmt(nextDue)}
            </div>
            <div className="font-body text-stone-400 text-xs mt-0.5">
              Typical monthly rent
            </div>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.15)} className="stat-card hidden lg:flex">
          <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center">
            <CreditCard size={18} className="text-sage" />
          </div>
          <div>
            <div className="font-display text-ink text-2xl font-semibold">
              {fmt(totalPaid)}
            </div>
            <div className="font-body text-stone-400 text-xs mt-0.5">Total paid here</div>
          </div>
        </motion.div>
      </div>

      {reminders.length > 0 && (
        <motion.div {...fadeUp(0.18)} className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-ink text-lg font-semibold">Upcoming reminders</h2>
            <Link to="/tenant/reminders" className="btn-ghost text-xs">
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          <ul className="space-y-2">
            {reminders.slice(0, 5).map((r) => {
              const due = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-stone-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-amber" />
                    <span className="font-body text-sm text-ink">{r.propertyName || 'Rent'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-sm font-semibold text-ink">{fmt(r.amount || 0)}</span>
                    <span className="font-body text-xs text-stone-400 block">Due {format(due, 'MMM d')}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}

      {activeHomes.length === 0 && pastHomes.length > 0 && (
        <motion.div {...fadeUp(0.18)} className="p-4 rounded-xl bg-stone-100 border border-stone-200">
          <div className="flex items-start gap-3">
            <Home size={20} className="text-stone-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-body font-semibold text-ink text-sm">Read-Only Mode</p>
              <p className="font-body text-sm text-stone-500 mt-1">
                You do not have any active leases. You can still access your past homes and download payment receipts for your records.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Homes */}
      <motion.div {...fadeUp(0.2)} className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-ink text-lg font-semibold">Active homes</h2>
          <div className="flex items-center gap-2">
            <Link to="/tenant/reminders" className="btn-ghost text-xs">
              Reminders
            </Link>
            <Link to="/tenant/payments" className="btn-ghost text-xs">
              View payments <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {activeHomes.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8">
            <Home size={28} className="text-stone-300 mb-3" />
            <p className="font-body text-sm text-stone-500">No active homes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeHomes.map(h => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-sage/20 bg-sage/5 transition-colors">
                <div>
                  <p className="font-body font-semibold text-sm text-ink">{h.unitName || h.propertyName || h.name}</p>
                  <p className="font-body text-xs text-sage font-medium flex items-center gap-1 mt-0.5">
                    <Hash size={10} /> {h.unitNumber || h.name || 'Unit'}
                  </p>
                  <p className="font-body text-xs text-stone-400 mt-0.5">{h.address || 'Managed Property'}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm font-semibold text-ink">
                    {fmtRent(h.monthlyRent || h.rentAmount || 0, h.rentType || h.billingCycle || 'monthly')}
                  </p>
                  <p className="font-body text-[11px] text-sage font-medium mt-0.5">Active lease</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Past Homes */}
      {pastHomes.length > 0 && (
        <motion.div {...fadeUp(0.25)} className="card p-6 bg-stone-50/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-stone-500 text-lg font-semibold">Past homes</h2>
          </div>
          <div className="space-y-3">
            {pastHomes.map(h => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-stone-200 bg-white opacity-70 grayscale hover:grayscale-0 transition-all">
                <div>
                  <p className="font-body font-semibold text-sm text-stone-600">{h.unitName || h.propertyName || h.name}</p>
                  <p className="font-body text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                    <Hash size={10} /> {h.unitNumber || h.name || 'Unit'}
                  </p>
                  <p className="font-body text-xs text-stone-400 mt-0.5">{h.address || 'Managed Property'}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-500 uppercase tracking-widest">
                    Archived
                  </span>
                  {h.closedAt && (
                    <p className="font-body text-[11px] text-stone-400 mt-1.5">
                      Moved out: {format(h.closedAt?.toDate?.() || new Date(h.closedAt), 'MMM yyyy')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Approved Tenant Celebration Overlay Modal ──────────────────────── */}
      <AnimatePresence>
        {newApprovals.length > 0 && !dismissedWelcome && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm pointer-events-auto"
              onClick={() => setDismissedWelcome(true)}
            />

            {/* Confetti Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col pointer-events-auto z-10 overflow-hidden"
              style={{ maxHeight: 'calc(100vh - 2rem)' }}
            >
              {/* Decorative top gradient */}
              <div className="h-2 w-full bg-gradient-to-r from-sage via-amber to-sage flex-shrink-0" />

              {/* Close Button */}
              <button
                onClick={() => setDismissedWelcome(true)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-2 rounded-full transition-colors z-20"
                aria-label="Close welcome banner"
              >
                <X size={20} />
              </button>

              <div className="p-6 md:p-8 overflow-y-auto w-full">
                {newApprovals.map((prop, idx) => (
                  <div key={`welcome-${prop.id}`} className={idx > 0 ? "mt-8 pt-8 border-t border-stone-100" : ""}>
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">

                      {/* Left: Icon & Title */}
                      <div className="flex flex-col items-center md:items-start flex-shrink-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.25rem] bg-sage flex items-center justify-center mb-4 shadow-lg shadow-sage/20 relative">
                          {/* Decorative Sparkles */}
                          <div className="absolute -top-3 -right-3 text-amber animate-pulse">
                            <Sparkles size={24} />
                          </div>
                          <CheckCircle2 size={32} className="text-cream" />
                        </div>
                        <h2 className="font-display text-ink text-2xl md:text-3xl font-bold leading-tight break-words">
                          Welcome Home!
                        </h2>
                        <p className="font-body text-sage font-semibold mt-1 flex items-center gap-1.5 justify-center md:justify-start text-base md:text-lg">
                          <PartyPopper size={18} /> Request Approved
                        </p>
                      </div>

                      {/* Right: Info Card */}
                      <div className="flex-1 w-full space-y-5 min-w-0">
                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col gap-4 overflow-hidden">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0 text-sage">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-body text-xs text-stone-400 uppercase tracking-wider font-semibold">Address</p>
                              <p className="font-display text-ink font-semibold truncate break-words">{prop.buildingName || prop.propertyName || prop.name}</p>
                              <p className="font-body text-stone-500 text-sm break-words line-clamp-2">{prop.address}</p>
                              {prop.unitNumber && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage/10 text-sage text-xs font-bold mt-2">
                                  <Hash size={12} /> Unit {prop.unitNumber}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="h-px bg-stone-200 w-full" />

                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center flex-shrink-0 text-amber">
                              <Mail size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-body text-xs text-stone-400 uppercase tracking-wider font-semibold">A quick note</p>
                              <p className="font-body text-stone-600 text-sm italic leading-relaxed break-words">
                                "We are glad to have you! Please find building rules attached. Feel free to reach out via management contact if you need anything."
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <Link
                            to="/tenant/payments"
                            className="btn-primary flex-1 py-3 text-sm justify-center shadow-lg shadow-sage/10 min-w-0 whitespace-nowrap"
                            onClick={() => setDismissedWelcome(true)}
                          >
                            <CreditCard size={16} /> Pay Your Rent
                          </Link>
                          <a
                            href={`mailto:${prop.landlordEmail || ''}?subject=Question regarding ${prop.name}`}
                            className="btn-secondary flex-1 py-3 text-sm justify-center min-w-0 whitespace-nowrap"
                            onClick={() => setDismissedWelcome(true)}
                          >
                            <Mail size={16} /> Contact Management
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


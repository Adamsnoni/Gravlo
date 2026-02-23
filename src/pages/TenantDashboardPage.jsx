// src/pages/TenantDashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CreditCard, ArrowRight, Bell, Hash, PartyPopper, Sparkles, Building2, MapPin, Mail, CheckCircle2 } from 'lucide-react';
import { format, isAfter, subHours } from 'date-fns';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenantProperties, subscribeTenantUnits, subscribeTenantPayments, subscribeReminders } from '../services/firebase';
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
    if (!user?.email) return;
    const u1 = subscribeTenantProperties(user.email, setProperties);
    const u2 = subscribeTenantUnits(user.email, setUnits);
    const u3 = subscribeTenantPayments(user.email, setPayments);
    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, [user?.email]);

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

  const allHomes = [
    ...properties.map(p => ({ ...p, type: 'property' })),
    ...units.map(u => ({ ...u, type: 'unit' }))
  ];

  const nextDue = allHomes.map(h => h.monthlyRent || h.rentAmount || 0).reduce((s, v) => s + v, 0);

  const firstName = (profile?.fullName || user?.displayName || 'there').split(' ')[0];

  // Logic for "Approved Tenant Experience"
  const newApprovals = allHomes.filter(h => {
    if (!h.welcomeMessageSent) return false;
    const welcomeDate = h.welcomeMessageDate?.toDate?.() || new Date(h.welcomeMessageDate);
    // Show celebration if approved in the last 48 hours
    return isAfter(welcomeDate, subHours(new Date(), 48));
  });

  useEffect(() => {
    if (newApprovals.length > 0) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [newApprovals.length]);

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
              {allHomes.length}
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

        {/* ── Approved Tenant Celebration ────────────────────────────── */}
        <AnimatePresence>
          {newApprovals.map((prop, idx) => (
            <motion.div
              key={`welcome-${prop.id}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ delay: idx * 0.1, duration: 0.5, type: 'spring' }}
              className="relative overflow-hidden rounded-3xl border-2 border-sage/30 bg-gradient-to-br from-sage/5 to-white p-1 mb-8 shadow-xl"
            >
              {/* Decorative Sparkles */}
              <div className="absolute top-4 right-6 text-sage/20 animate-pulse">
                <Sparkles size={48} />
              </div>

              <div className="bg-white rounded-[1.4rem] p-6 sm:p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Left side: Icon & Title */}
                  <div className="flex-shrink-0 flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="w-20 h-20 rounded-3xl bg-sage flex items-center justify-center mb-4 shadow-lg shadow-sage/20">
                      <CheckCircle2 size={40} className="text-cream" />
                    </div>
                    <h2 className="font-display text-ink text-3xl font-bold leading-tight">
                      Welcome Home!
                    </h2>
                    <p className="font-body text-sage font-semibold mt-1 flex items-center gap-1.5 justify-center md:justify-start text-lg">
                      <PartyPopper size={20} /> Request Approved
                    </p>
                  </div>

                  {/* Right side: Info Card */}
                  <div className="flex-1 w-full space-y-6">
                    <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0 text-sage">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <p className="font-body text-xs text-stone-400 uppercase tracking-wider font-semibold">Address</p>
                          <p className="font-display text-ink font-semibold">{prop.buildingName || prop.propertyName || prop.name}</p>
                          <p className="font-body text-stone-500 text-sm">{prop.address}</p>
                          {prop.unitNumber && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage/10 text-sage text-xs font-bold mt-2">
                              <Hash size={12} /> Unit {prop.unitNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="h-px bg-stone-100 w-full" />

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center flex-shrink-0 text-amber">
                          <Mail size={20} />
                        </div>
                        <div>
                          <p className="font-body text-xs text-stone-400 uppercase tracking-wider font-semibold">A quick note</p>
                          <p className="font-body text-stone-600 text-sm italic leading-relaxed">
                            "We are glad to have you! Please find building rules attached. Feel free to reach out via management contact if you need anything."
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link to="/tenant/payments" className="btn-primary flex-1 py-4 text-base justify-center shadow-lg shadow-sage/10">
                        <CreditCard size={18} /> Pay Your Rent
                      </Link>
                      <a href={`mailto:${prop.landlordEmail || ''}?subject=Question regarding ${prop.name}`}
                        className="btn-secondary flex-1 py-4 text-base justify-center">
                        <Mail size={18} /> Contact Management
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

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

      <motion.div {...fadeUp(0.2)} className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-ink text-lg font-semibold">Your homes</h2>
          <div className="flex items-center gap-2">
            <Link to="/tenant/reminders" className="btn-ghost text-xs">
              Reminders
            </Link>
            <Link to="/tenant/payments" className="btn-ghost text-xs">
              View payments <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {allHomes.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            <Home size={32} className="text-stone-300 mb-3" />
            <p className="font-body text-sm text-stone-500">
              No homes are linked to your email yet.
            </p>
            <p className="font-body text-xs text-stone-300 mt-1">
              Ask your landlord to approve your request or add your email directly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allHomes.map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 p-4 rounded-xl border border-stone-100 bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                <div>
                  <p className="font-body font-semibold text-sm text-ink">{h.unitName || h.propertyName || h.name}</p>
                  {(h.unitNumber || h.type === 'unit') && (
                    <p className="font-body text-xs text-sage font-medium flex items-center gap-1 mt-0.5">
                      <Hash size={10} /> {h.unitNumber || h.name || 'Unit'}
                    </p>
                  )}
                  <p className="font-body text-xs text-stone-400 mt-0.5">{h.address || 'Managed Property'}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm font-semibold text-ink">
                    {fmtRent(h.monthlyRent || h.rentAmount || 0, h.rentType || h.billingCycle || 'monthly')}
                  </p>
                  <p className="font-body text-[11px] text-stone-400 mt-0.5">
                    {h.status === 'occupied' ? 'Active lease' : h.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}


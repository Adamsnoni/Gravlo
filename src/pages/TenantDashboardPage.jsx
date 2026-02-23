// src/pages/TenantDashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, CreditCard, ArrowRight, Bell, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenantProperties, subscribeTenantPayments, subscribeReminders } from '../services/firebase';
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
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (!user?.email) return;
    const u1 = subscribeTenantProperties(user.email, setProperties);
    const u2 = subscribeTenantPayments(user.email, setPayments);
    return () => {
      u1?.();
      u2?.();
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

  const nextDue = properties.map(p => p.monthlyRent || 0).reduce((s, v) => s + v, 0);

  const firstName = (profile?.fullName || user?.displayName || 'there').split(' ')[0];

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
              {properties.length}
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

        {properties.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            <Home size={32} className="text-stone-300 mb-3" />
            <p className="font-body text-sm text-stone-500">
              No homes are linked to your email yet.
            </p>
            <p className="font-body text-xs text-stone-300 mt-1">
              Ask your landlord to add your email on the property in LeaseEase.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-4 rounded-xl border border-stone-100 bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                <div>
                  <p className="font-body font-semibold text-sm text-ink">{p.name}</p>
                  {p.unitNumber && (
                    <p className="font-body text-xs text-sage font-medium flex items-center gap-1 mt-0.5">
                      <Hash size={10} /> {getShortUnitId(p)}
                    </p>
                  )}
                  <p className="font-body text-xs text-stone-400 mt-0.5">{p.address}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm font-semibold text-ink">
                    {fmtRent(p.monthlyRent || 0, p.rentType || 'monthly')}
                  </p>
                  <p className="font-body text-[11px] text-stone-400 mt-0.5">
                    {p.status === 'occupied' ? 'Active lease' : p.status}
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


// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, TrendingUp, Users, AlertTriangle, ArrowRight,
  Plus, Bell, Wrench, ChevronRight, User, UserCheck, ExternalLink,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, differenceInDays, isPast, subMonths } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeProperties, subscribeReminders, subscribePendingUnits, updateUnit } from '../services/firebase';
import { createTenancy } from '../services/tenancy';
import StatusBadge from '../components/StatusBadge';
import PropertyCard from '../components/PropertyCard';


const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

const generateChartData = (properties) => {
  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
  return months.map(m => ({
    month: format(m, 'MMM'),
    revenue: properties.filter(p => p.status === 'occupied').reduce((s, p) => s + (p.monthlyRent || 0), 0) * (0.8 + Math.random() * 0.4),
  }));
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { fmt, country } = useLocale();
  const [properties, setProperties] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [pendingUnits, setPendingUnits] = useState([]);
  const [approvingSaving, setApprovingSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeProperties(user.uid, (data) => { setProperties(data); setDataLoading(false); });
    const u2 = subscribeReminders(user.uid, setReminders);
    const u3 = subscribePendingUnits(user.uid, setPendingUnits);
    return () => { u1(); u2(); u3(); };
  }, [user]);

  const approvePending = async (unit) => {
    setApprovingSaving(true);
    try {
      await updateUnit(user.uid, unit.propertyId, unit.id, {
        status: 'occupied',
        tenantId: unit.pendingTenantId,
        tenantName: unit.pendingTenantName || '',
        tenantEmail: unit.pendingTenantEmail || '',
        pendingTenantId: null,
        pendingTenantName: null,
        pendingTenantEmail: null,
        pendingRequestedAt: null,
      });
      await createTenancy({
        tenantId: unit.pendingTenantId,
        landlordId: user.uid,
        propertyId: unit.propertyId,
        unitId: unit.id,
        tenantName: unit.pendingTenantName || '',
        tenantEmail: unit.pendingTenantEmail || '',
        unitName: unit.unitName || unit.name || '',
        propertyName: unit.propertyName || '',
        rentAmount: unit.rentAmount || 0,
        billingCycle: unit.billingCycle || 'monthly',
        currency: country?.currency || 'NGN',
      });
      toast.success(`${unit.pendingTenantName || 'Tenant'} approved!`);
    } catch (err) { console.error(err); toast.error('Failed to approve request.'); }
    finally { setApprovingSaving(false); }
  };

  const occupied = properties.filter(p => p.status === 'occupied').length;
  const vacant = properties.filter(p => p.status === 'vacant').length;
  const monthlyRev = properties.filter(p => p.status === 'occupied').reduce((s, p) => s + (p.monthlyRent || 0), 0);
  const urgentRem = reminders.filter(r => {
    const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
    return !isPast(d) && differenceInDays(d, new Date()) <= 5 && r.status !== 'paid';
  });
  const overdueRem = reminders.filter(r => {
    const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
    return isPast(d) && r.status !== 'paid';
  });

  const chartData = generateChartData(properties);
  const firstName = (profile?.fullName || user?.displayName || 'there').split(' ')[0];

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Building2, color: 'text-sage', bg: 'bg-sage/10', change: null },
    { label: 'Occupied', value: occupied, icon: Users, color: 'text-sage', bg: 'bg-sage/10', change: properties.length > 0 ? `${Math.round(occupied / properties.length * 100)}% occupancy` : '0%' },
    { label: 'Monthly Revenue', value: fmt(monthlyRev), icon: TrendingUp, color: 'text-amber', bg: 'bg-amber/10', change: `${occupied} active leases` },
    { label: 'Urgent Reminders', value: urgentRem.length + overdueRem.length, icon: AlertTriangle, color: 'text-rust', bg: 'bg-rust/10', change: overdueRem.length > 0 ? `${overdueRem.length} overdue` : 'All current' },
  ];

  return (
    <div className="space-y-8">
      {dataLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Greeting */}
          <motion.div {...fadeUp(0)} className="flex items-start justify-between">
            <div>
              <p className="font-body text-stone-400 text-sm font-medium">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <h1 className="font-display text-ink text-3xl font-semibold mt-0.5">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                <em>{firstName}</em>
              </h1>
            </div>

          </motion.div>

          {/* ── Global Pending Requests Widget ────────────────────── */}
          {pendingUnits.length > 0 && (
            <motion.div {...fadeUp(0)} className="rounded-2xl border-2 border-amber/30 bg-amber/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber/15 flex items-center justify-center flex-shrink-0">
                  <User size={15} className="text-amber" />
                </div>
                <div className="flex-1">
                  <p className="font-body text-sm font-semibold text-ink">
                    Action Required · {pendingUnits.length} New Join Request{pendingUnits.length !== 1 ? 's' : ''}
                  </p>
                  <p className="font-body text-xs text-stone-400">Tenants waiting for your approval</p>
                </div>
              </div>
              <div className="space-y-2">
                {pendingUnits.map(unit => (
                  <div key={unit.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-amber/20 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-body text-sm font-semibold text-ink truncate">
                        {unit.pendingTenantName || 'Unknown Tenant'}
                      </p>
                      <p className="font-body text-xs text-stone-500">
                        {unit.propertyName && <span className="font-medium">{unit.propertyName}</span>}
                        {unit.propertyName && (unit.unitName || unit.name) && ' (​'}
                        {(unit.unitName || unit.name) && <span>{unit.unitName || unit.name}</span>}
                        {unit.propertyName && (unit.unitName || unit.name) && ')'}
                        {unit.pendingTenantEmail && (
                          <span className="ml-1 text-stone-400">· {unit.pendingTenantEmail}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link to={`/properties/${unit.propertyId}?tab=units`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-medium bg-white border border-stone-200 text-stone-500 hover:border-ink/30 hover:text-ink transition-all">
                        <ExternalLink size={12} /> View Property
                      </Link>
                      <button
                        onClick={() => approvePending(unit)}
                        disabled={approvingSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-medium bg-sage text-cream hover:bg-sage/90 transition-all disabled:opacity-50"
                      >
                        <UserCheck size={12} /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon, color, bg, change }, i) => (
              <motion.div key={label} {...fadeUp(i * 0.06)} className="stat-card">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <div className="font-display text-ink text-2xl font-semibold">{value}</div>
                  <div className="font-body text-stone-400 text-xs mt-0.5">{label}</div>
                </div>
                {change && (
                  <div className="font-body text-xs text-stone-300 border-t border-stone-100 pt-2 mt-auto">
                    {change}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Revenue Chart + Urgent reminders */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chart */}
            <motion.div {...fadeUp(0.2)} className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-ink text-lg font-semibold">Revenue Overview</h2>
                  <p className="font-body text-stone-400 text-xs mt-0.5">Last 6 months · Estimated</p>
                </div>
                <span className="badge-sage">Live</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4A7C59" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE5D4" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: '#A89272' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: '#A89272' }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmt(v)} />
                  <Tooltip
                    contentStyle={{ background: '#1A1612', border: 'none', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 12, color: '#F5F0E8' }}
                    formatter={v => [fmt(v), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4A7C59" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Urgent */}
            <motion.div {...fadeUp(0.25)} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-ink text-lg font-semibold">Urgent Alerts</h2>
                <Link to="/reminders" className="text-sage hover:text-sage-light transition-colors">
                  <ArrowRight size={16} />
                </Link>
              </div>
              {urgentRem.length === 0 && overdueRem.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center mb-3">
                    <Bell size={20} className="text-sage" />
                  </div>
                  <p className="font-body text-sm text-stone-400">No urgent reminders</p>
                  <p className="font-body text-xs text-stone-300 mt-1">All payments on track</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...overdueRem, ...urgentRem].slice(0, 5).map(r => {
                    const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
                    const overdue = isPast(d);
                    return (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? 'bg-rust' : 'bg-amber'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-body font-medium text-sm text-ink truncate">{r.tenantName}</p>
                          <p className="font-body text-xs text-stone-400">
                            {overdue ? 'Overdue' : `Due ${format(d, 'MMM d')}`}
                          </p>
                        </div>
                        <span className="font-body font-semibold text-sm text-ink">
                          {fmt(r.amount || 0)}
                        </span>
                      </div>
                    );
                  })}
                  <Link to="/reminders" className="btn-ghost w-full text-xs mt-1 justify-center">
                    View all reminders <ChevronRight size={13} />
                  </Link>
                </div>
              )}
            </motion.div>
          </div>

          {/* Recent Properties */}
          <motion.div {...fadeUp(0.3)}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-ink text-xl font-semibold">Your Properties</h2>
              <Link to="/properties" className="btn-ghost text-sm">
                View all <ChevronRight size={14} />
              </Link>
            </div>

            {properties.length === 0 ? (
              <div className="card p-12 flex flex-col items-center text-center border-2 border-dashed border-stone-200">
                <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center mb-4">
                  <Building2 size={28} className="text-sage" />
                </div>
                <h3 className="font-display text-ink text-xl font-semibold mb-2">Add your first property</h3>
                <p className="font-body text-stone-400 text-sm mb-6 max-w-xs">
                  Start tracking rent, tenants, and maintenance by adding a property.
                </p>
                <Link to="/properties" className="btn-primary">
                  <Plus size={16} /> Add Property
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {properties.slice(0, 6).map(p => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}


    </div>
  );
}

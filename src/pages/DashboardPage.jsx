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
import { subscribeProperties, subscribeReminders, subscribePendingUnits, subscribeNotifications, markNotificationRead, updateUnit, serverTimestamp } from '../services/firebase';
import { createTenancy } from '../services/tenancy';
import StatusBadge from '../components/StatusBadge';
import PropertyCard from '../components/PropertyCard';
import { toast } from 'react-hot-toast';


const safeToDate = (d) => {
  if (!d) return null;
  if (typeof d.toDate === 'function') return d.toDate();
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
};

const safeFmt = (val, fmtFunc) => {
  if (typeof fmtFunc !== 'function') return val || 0;
  try {
    return fmtFunc(val);
  } catch (e) {
    console.error('Format error:', e, val);
    return val || 0;
  }
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

const generateChartData = (properties, fmtFunc) => {
  try {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map(m => {
      const rev = (properties || [])
        .filter(p => p && p.status === 'occupied')
        .reduce((s, p) => s + Number(p.monthlyRent || 0), 0) * (0.8 + Math.random() * 0.4);
      return {
        month: format(m, 'MMM'),
        revenue: isNaN(rev) ? 0 : rev,
      };
    });
  } catch (e) {
    console.error('Chart data error:', e);
    return [];
  }
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { fmt, country } = useLocale();
  const [properties, setProperties] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [pendingUnits, setPendingUnits] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [approvingSaving, setApprovingSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeProperties(user.uid, (data) => { setProperties(data); setDataLoading(false); });
    const u2 = subscribeReminders(user.uid, setReminders);
    const u3 = subscribePendingUnits(user.uid, setPendingUnits);
    const u4 = subscribeNotifications(user.uid, setNotifications);
    console.log('Dashboard: Subscribed to all feeds for', user.uid);
    return () => { u1(); u2(); u3(); u4(); };
  }, [user]);

  const approvePending = async (unit) => {
    setApprovingSaving(true);
    try {
      await updateUnit(user.uid, unit.propertyId, unit.id, {
        status: 'occupied',
        tenantId: unit.pendingTenantId,
        tenantName: unit.pendingTenantName || '',
        tenantEmail: unit.pendingTenantEmail || '',
        welcomeMessageSent: true,
        welcomeMessageDate: serverTimestamp(),
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

  const occupied = (properties || []).filter(p => p && p.status === 'occupied').length;
  const unreadCount = (notifications || []).filter(n => !n.read).length;
  const vacant = (properties || []).filter(p => p && p.status === 'vacant').length;
  const monthlyRev = (properties || []).filter(p => p && p.status === 'occupied').reduce((s, p) => s + Number(p.monthlyRent || 0), 0);
  const urgentRem = (reminders || []).filter(r => {
    const d = safeToDate(r.dueDate);
    if (!d) return false;
    return !isPast(d) && differenceInDays(d, new Date()) <= 5 && r.status !== 'paid';
  });
  const overdueRem = (reminders || []).filter(r => {
    const d = safeToDate(r.dueDate);
    if (!d) return false;
    return isPast(d) && r.status !== 'paid';
  });

  const chartData = generateChartData(properties, fmt);
  const firstName = (profile?.fullName || user?.displayName || 'there').split(' ')[0];

  const stats = [
    { label: 'Total Properties', value: (properties || []).length, icon: Building2, color: 'text-sage', bg: 'bg-sage/10', change: null },
    { label: 'Occupied', value: occupied, icon: Users, color: 'text-sage', bg: 'bg-sage/10', change: (properties || []).length > 0 ? `${Math.round(occupied / properties.length * 100)}% occupancy` : '0%' },
    { label: 'Monthly Revenue', value: safeFmt(monthlyRev, fmt), icon: TrendingUp, color: 'text-amber', bg: 'bg-amber/10', change: `${occupied} active leases` },
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
          <motion.div {...fadeUp(0)} className="flex items-center justify-between">
            <div>
              <p className="font-body text-stone-400 text-sm font-medium">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <h1 className="font-display text-ink text-3xl font-semibold mt-0.5">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                <em>{firstName}</em>
              </h1>
            </div>

            <button
              onClick={() => document.getElementById('recent-activity')?.scrollIntoView({ behavior: 'smooth' })}
              className="relative p-3 rounded-2xl bg-white border border-stone-100 shadow-sm hover:border-sage/30 hover:bg-stone-50 transition-all group"
            >
              <Bell size={20} className="text-stone-400 group-hover:text-sage transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-sage text-cream text-[9px] font-bold flex items-center justify-center animate-pulse border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
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
                    tickFormatter={v => safeFmt(v, fmt)} />
                  <Tooltip
                    contentStyle={{ background: '#1A1612', border: 'none', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 12, color: '#F5F0E8' }}
                    formatter={v => [safeFmt(v, fmt), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4A7C59" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Recent Activity Feed */}
            <motion.div id="recent-activity" {...fadeUp(0.25)} className="card p-0 overflow-hidden flex flex-col scroll-mt-8">
              <div className="p-6 pb-4 flex items-center justify-between border-b border-stone-100">
                <h2 className="font-display text-ink text-lg font-semibold">Recent Activity</h2>
                <span className="badge-stone">{notifications.length}</span>
              </div>

              <div className="flex-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 && urgentRem.length === 0 && overdueRem.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center mb-3">
                      <Bell size={20} className="text-sage" />
                    </div>
                    <p className="font-body text-sm text-stone-500 font-medium">No recent activity</p>
                    <p className="font-body text-xs text-stone-400 mt-1">We'll alert you here when things happen.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {/* Combine Notifications and Urgent Reminders */}
                    {[
                      ...notifications.map(n => ({ ...n, feedType: 'notification' })),
                      ...overdueRem.map(r => ({ ...r, feedType: 'reminder', overdue: true })),
                      ...urgentRem.map(r => ({ ...r, feedType: 'reminder', overdue: false }))
                    ]
                      .sort((a, b) => {
                        const dateA = safeToDate(a.createdAt) || safeToDate(a.dueDate) || new Date(0);
                        const dateB = safeToDate(b.createdAt) || safeToDate(b.dueDate) || new Date(0);
                        return dateB - dateA;
                      })
                      .slice(0, 15)
                      .map(item => (
                        <div key={item.id} className={`p-4 hover:bg-stone-50 transition-colors ${!item.read && item.feedType === 'notification' ? 'bg-sage/5' : ''}`}>
                          <div className="flex gap-4">
                            <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${item.feedType === 'notification'
                              ? item.type === 'unit_request' ? 'bg-amber/10 text-amber' : 'bg-sage/10 text-sage'
                              : item.overdue ? 'bg-rust/10 text-rust' : 'bg-amber/10 text-amber'
                              }`}>
                              {item.feedType === 'notification'
                                ? item.type === 'unit_request' ? <User size={16} /> : <Bell size={16} />
                                : <AlertTriangle size={16} />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-body text-sm text-ink leading-snug">
                                  {item.feedType === 'notification' ? (
                                    <>
                                      <span className="font-semibold">{item.tenantName}</span> {' '}
                                      {item.type === 'unit_request' ? 'requested to join' : 'sent a notification'} {' '}
                                      <span className="font-semibold">{item.unitName}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-semibold">{item.tenantName}</span> {' '}
                                      payment is {item.overdue ? 'overdue' : 'due soon'}
                                    </>
                                  )}
                                </p>
                                {item.feedType === 'notification' && !item.read && (
                                  <button
                                    onClick={() => markNotificationRead(user.uid, item.id)}
                                    className="w-2 h-2 rounded-full bg-sage flex-shrink-0 mt-1.5"
                                    title="Mark as read"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-body text-[11px] text-stone-400">
                                  {item.feedType === 'notification'
                                    ? (safeToDate(item.createdAt) ? format(safeToDate(item.createdAt), 'MMM d, h:mm a') : 'Recently')
                                    : (safeToDate(item.dueDate) ? `Due ${format(safeToDate(item.dueDate), 'MMM d')}` : 'Invalid date')
                                  }
                                </span>
                                {item.feedType === 'notification' && (
                                  <Link to={`/properties/${item.propertyId}?tab=units`} className="text-[11px] font-semibold text-sage hover:underline">
                                    View Request
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="p-4 bg-stone-50 border-t border-stone-100">
                <Link to="/notifications" className="w-full btn-ghost text-xs justify-center py-2">
                  View full history <ArrowRight size={13} className="ml-1" />
                </Link>
              </div>
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

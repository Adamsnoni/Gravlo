// src/pages/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, AlertTriangle, CheckCircle, Trash2, Search, Filter, Clock, ChevronRight } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeNotifications, subscribeReminders, markNotificationRead, deleteNotification } from '../services/firebase';
import { Link } from 'react-router-dom';

const safeToDate = (d) => {
    if (!d) return null;
    if (typeof d.toDate === 'function') return d.toDate();
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
};

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.3 },
});

export default function NotificationsPage() {
    const { user } = useAuth();
    const { fmt } = useLocale();
    const [notifications, setNotifications] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all, unread, requests, alerts

    useEffect(() => {
        if (!user) return;
        const unsubNotifs = subscribeNotifications(user.uid, (data) => {
            setNotifications(data);
            setLoading(false);
        });
        const unsubReminders = subscribeReminders(user.uid, setReminders);
        return () => { unsubNotifs(); unsubReminders(); };
    }, [user]);

    // Combine and sort
    const urgentRem = reminders.filter(r => {
        const d = safeToDate(r.dueDate);
        if (!d) return false;
        return !isPast(d) && differenceInDays(d, new Date()) <= 5 && r.status !== 'paid';
    });
    const overdueRem = reminders.filter(r => {
        const d = safeToDate(r.dueDate);
        if (!d) return false;
        return isPast(d) && r.status !== 'paid';
    });

    const allActivity = [
        ...notifications.map(n => ({ ...n, feedType: 'notification' })),
        ...overdueRem.map(r => ({ ...r, feedType: 'reminder', overdue: true })),
        ...urgentRem.map(r => ({ ...r, feedType: 'reminder', overdue: false }))
    ].sort((a, b) => {
        const dateA = safeToDate(a.createdAt) || safeToDate(a.dueDate) || new Date(0);
        const dateB = safeToDate(b.createdAt) || safeToDate(b.dueDate) || new Date(0);
        return dateB - dateA;
    });

    const filtered = allActivity.filter(item => {
        // Search filter
        const searchMatch = !search ||
            (item.tenantName || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.unitName || '').toLowerCase().includes(search.toLowerCase());

        // Category filter
        if (filter === 'unread') return searchMatch && item.feedType === 'notification' && !item.read;
        if (filter === 'requests') return searchMatch && item.type === 'unit_request';
        if (filter === 'alerts') return searchMatch && item.feedType === 'reminder';

        return searchMatch;
    });

    const counts = {
        unread: notifications.filter(n => !n.read).length,
        requests: notifications.filter(n => n.type === 'unit_request').length,
        alerts: urgentRem.length + overdueRem.length
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <motion.div {...fadeUp(0)} className="flex items-end justify-between">
                <div>
                    <h1 className="font-display text-ink text-3xl font-semibold">Activity History</h1>
                    <p className="font-body text-stone-400 text-sm mt-0.5">
                        Your recent updates, requests, and payment alerts
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => notifications.filter(n => !n.read).forEach(n => markNotificationRead(user.uid, n.id))}
                        className="btn-ghost text-xs"
                        disabled={counts.unread === 0}
                    >
                        Mark all as read
                    </button>
                </div>
            </motion.div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'All Activity', count: allActivity.length },
                        { id: 'unread', label: 'Unread', count: counts.unread },
                        { id: 'requests', label: 'Requests', count: counts.requests },
                        { id: 'alerts', label: 'Alerts', count: counts.alerts },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setFilter(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body font-medium border transition-all whitespace-nowrap
                ${filter === t.id ? 'bg-ink text-cream border-ink' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}
                        >
                            {t.label}
                            {t.count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === t.id ? 'bg-white/15 text-cream' : 'bg-stone-100 text-stone-500'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                    <input
                        type="text"
                        placeholder="Search activity..."
                        className="input-base pl-9 py-2 text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="card h-20 animate-pulse bg-stone-100" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card p-16 flex flex-col items-center text-center border-2 border-dashed border-stone-200">
                    <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4">
                        <Bell size={24} className="text-stone-300" />
                    </div>
                    <h3 className="font-display text-ink text-lg font-semibold">No activity found</h3>
                    <p className="font-body text-stone-400 text-sm mt-1">
                        {search ? "Try adjusting your search terms." : "You're all caught up! New updates will appear here."}
                    </p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden divide-y divide-stone-100">
                    <AnimatePresence>
                        {filtered.map((item, i) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`p-5 flex items-start gap-4 transition-colors hover:bg-stone-50/50 ${!item.read && item.feedType === 'notification' ? 'bg-sage/5' : ''}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${item.feedType === 'notification'
                                    ? item.type === 'unit_request' ? 'bg-amber/10 text-amber' : 'bg-sage/10 text-sage'
                                    : item.overdue ? 'bg-rust/10 text-rust' : 'bg-amber/10 text-amber'
                                    }`}>
                                    {item.feedType === 'notification'
                                        ? item.type === 'unit_request' ? <User size={18} /> : <Bell size={18} />
                                        : <AlertTriangle size={18} />}
                                </div>

                                <div className="flex-1 min-w-0 py-0.5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="font-body text-ink leading-snug">
                                                {item.feedType === 'notification' ? (
                                                    <>
                                                        <span className="font-bold">{item.tenantName}</span>{' '}
                                                        {item.type === 'unit_request' ? 'requested to join' : 'sent a notification'} {' '}
                                                        <span className="font-bold text-sage">{item.unitName}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="font-bold">{item.tenantName}</span>{' '}
                                                        payment is {item.overdue ? 'overdue' : 'due soon'}
                                                    </>
                                                )}
                                            </p>

                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1.5 font-body text-xs text-stone-400">
                                                    <Clock size={12} />
                                                    {item.feedType === 'notification'
                                                        ? (safeToDate(item.createdAt) ? format(safeToDate(item.createdAt), 'MMM d, h:mm a') : 'Recently')
                                                        : (safeToDate(item.dueDate) ? `Due ${format(safeToDate(item.dueDate), 'MMM d')}` : 'Invalid date')}
                                                </span>
                                                {item.propertyName && (
                                                    <span className="font-body text-[11px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                                                        {item.propertyName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {item.feedType === 'notification' && !item.read && (
                                                <button
                                                    onClick={() => markNotificationRead(user.uid, item.id)}
                                                    className="p-1.5 rounded-lg text-sage hover:bg-sage/10 transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <CheckCircle size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (item.feedType === 'notification') deleteNotification(user.uid, item.id);
                                                    else toast.error("Please manage reminders on the Reminders page.");
                                                }}
                                                className="p-1.5 rounded-lg text-stone-300 hover:text-rust hover:bg-rust/10 transition-colors"
                                                title="Delete Activity"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {item.feedType === 'notification' && item.type === 'unit_request' && (
                                        <div className="mt-4">
                                            <Link
                                                to={`/requests/${item.propertyId}/${item.unitId}`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sage text-cream font-body text-xs font-semibold hover:bg-sage/90 transition-all shadow-sm"
                                                onClick={() => {
                                                    if (!item.read) {
                                                        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
                                                        markNotificationRead(user.uid, item.id);
                                                    }
                                                }}
                                            >
                                                Review Request <ChevronRight size={14} />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

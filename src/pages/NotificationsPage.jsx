// src/pages/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, AlertTriangle, CheckCircle, Trash2, Search, Filter, Clock, ChevronRight, Loader2, X } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeNotifications, subscribeReminders, markNotificationRead, deleteNotification, markAllNotificationsRead, clearAllNotifications } from '../services/firebase';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const safeToDate = (d) => {
    if (!d) return null;
    if (typeof d.toDate === 'function') return d.toDate();
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
};

export default function NotificationsPage() {
    const { user } = useAuth();
    const { fmt } = useLocale();
    const [notifications, setNotifications] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!user) return;
        const unsubNotifs = subscribeNotifications(user.uid, (data) => {
            setNotifications(data);
            setLoading(false);
        });
        const unsubReminders = subscribeReminders(user.uid, setReminders);
        return () => { unsubNotifs(); unsubReminders(); };
    }, [user]);

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
        const searchMatch = !search ||
            (item.tenantName || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.unitName || '').toLowerCase().includes(search.toLowerCase());

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
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tight">Activity Log</h1>
                    <p className="font-body text-[#4a5568] text-sm mt-1 uppercase tracking-widest font-bold">
                        Central synchronization hub for your building events
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (counts.unread === 0) return;
                            try {
                                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                await markAllNotificationsRead(user.uid);
                                toast.success('Cleared unread status');
                            } catch (e) { toast.error('Failed to sync'); }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${counts.unread > 0 ? 'bg-[#1a3c2e] border-[#2d6a4f]/30 text-[#52b788] hover:bg-[#2d6a4f]' : 'bg-[#141b1e] border-[#1e2a2e] text-[#4a5568] cursor-not-allowed'}`}
                        disabled={counts.unread === 0}
                    >
                        Mark All Read
                    </button>
                    <button
                        onClick={async () => {
                            if (notifications.length === 0) return;
                            if (window.confirm("Purge activity history? This cannot be undone.")) {
                                try {
                                    setNotifications([]);
                                    await clearAllNotifications(user.uid);
                                    toast.success('Inbox purged');
                                } catch (e) { toast.error('Failed to clear'); }
                            }
                        }}
                        className={`p-2.5 rounded-xl border transition-all ${notifications.length > 0 ? 'bg-[#2d1a1a] border-[#3d2020] text-[#e74c3c] hover:bg-[#3d2020]' : 'bg-[#141b1e] border-[#1e2a2e] text-[#4a5568] cursor-not-allowed'}`}
                        disabled={notifications.length === 0}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </motion.div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0d1215] p-3 rounded-2xl border border-[#1e2a2e]">
                <div className="flex gap-2 p-1 bg-[#141b1e] rounded-xl overflow-x-auto no-scrollbar w-full md:w-auto">
                    {[
                        { id: 'all', label: 'All', count: allActivity.length },
                        { id: 'unread', label: 'Unread', count: counts.unread },
                        { id: 'requests', label: 'Requests', count: counts.requests },
                        { id: 'alerts', label: 'Payment Alerts', count: counts.alerts },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setFilter(t.id)}
                            className={`flex items-center gap-2.5 px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap
                                ${filter === t.id
                                    ? 'bg-[#1a3c2e] text-[#52b788] shadow-sm'
                                    : 'text-[#4a5568] hover:text-[#8a9ba8]'}`}
                        >
                            {t.label}
                            {t.count > 0 && (
                                <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[9px] font-bold ${filter === t.id ? 'bg-[#52b788] text-[#1a3c2e]' : 'bg-[#1e2a2e] text-[#4a5568]'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568]" size={15} />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="input-base pl-12 h-12 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Feed List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="card h-24 animate-pulse bg-[#141b1e]/20 border-[#1e2a2e]" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card p-24 flex flex-col items-center text-center bg-[#0d1215] border-2 border-dashed border-[#1e2a2e]">
                    <div className="w-16 h-16 rounded-3xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center mb-6 text-[#1e2a2e]">
                        <Bell size={32} />
                    </div>
                    <h3 className="font-display text-[#e8e4de] text-xl font-bold mb-2 tracking-tight">Zero Activity Detected</h3>
                    <p className="font-body text-[#4a5568] text-sm max-w-xs mx-auto font-medium">
                        {search ? "No events match your current synchronization query." : "Everything is currently stable. New events will populate this stream in real-time."}
                    </p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden divide-y divide-[#1e2a2e]/50 bg-[#0d1215] border-[#1e2a2e] shadow-2xl">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((item, i) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`p-6 flex items-start gap-5 transition-all hover:bg-[#141b1e]/50 group ${!item.read && item.feedType === 'notification' ? 'bg-[#1a3c2e]/5' : ''}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center border transition-all ${item.feedType === 'notification'
                                    ? item.type === 'unit_request' ? 'bg-[#2d2510]/20 border-[#3d3215]/50 text-[#f0c040]' : 'bg-[#1a3c2e]/20 border-[#2d6a4f]/50 text-[#52b788]'
                                    : item.overdue ? 'bg-[#2d1a1a]/20 border-[#3d2020]/50 text-[#e74c3c]' : 'bg-[#2d2510]/20 border-[#3d3215]/50 text-[#f0c040]'
                                    }`}>
                                    {item.feedType === 'notification'
                                        ? item.type === 'unit_request' ? <User size={22} /> : <Bell size={22} />
                                        : <AlertTriangle size={22} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="font-body text-[#e8e4de] leading-relaxed font-medium">
                                                {item.feedType === 'notification' ? (
                                                    <>
                                                        <span className="font-bold text-[#e8e4de]">{item.tenantName}</span>{' '}
                                                        <span className="text-[#8a9ba8]">{item.type === 'unit_request' ? 'requested to join' : 'sent a priority notification'}</span>{' '}
                                                        <span className="font-bold text-[#52b788]">{item.unitName}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="font-bold text-[#e8e4de]">{item.tenantName}</span>{' '}
                                                        <span className="text-[#8a9ba8]">payout fulfillment is</span>{' '}
                                                        <span className={`font-bold ${item.overdue ? 'text-[#e74c3c]' : 'text-[#f0c040]'}`}>
                                                            {item.overdue ? 'PAST DUE' : 'DUE SOON'}
                                                        </span>
                                                    </>
                                                )}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                                <span className="flex items-center gap-2 font-body text-[10px] text-[#4a5568] uppercase tracking-widest font-bold">
                                                    <Clock size={12} className="text-[#52b788]" />
                                                    {item.feedType === 'notification'
                                                        ? (safeToDate(item.createdAt) ? format(safeToDate(item.createdAt), 'MMM d, h:mm a') : 'Synchronized')
                                                        : (safeToDate(item.dueDate) ? `DEADLINE: ${format(safeToDate(item.dueDate), 'MMM d')}` : 'System Date')}
                                                </span>
                                                {item.propertyName && (
                                                    <span className="font-body text-[9px] text-[#52b788] bg-[#1a3c2e]/20 border border-[#2d6a4f]/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                                                        {item.propertyName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {item.feedType === 'notification' && !item.read && (
                                                <button
                                                    onClick={() => markNotificationRead(user.uid, item.id)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#52b788] hover:bg-[#1a3c2e] transition-all shadow-sm"
                                                    title="Seal record"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (item.feedType === 'notification') deleteNotification(user.uid, item.id);
                                                    else toast.error("Reminders cannot be deleted from history.");
                                                }}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] hover:text-[#e74c3c] hover:bg-[#2d1a1a] transition-all shadow-sm"
                                                title="Purge record"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {item.feedType === 'notification' && item.type === 'unit_request' && (
                                        <div className="mt-5">
                                            <Link
                                                to={`/properties/${item.propertyId}?tab=units`}
                                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1a3c2e] text-[#52b788] border border-[#2d6a4f]/30 font-body text-[11px] font-bold uppercase tracking-widest hover:bg-[#2d6a4f] transition-all shadow-lg shadow-[#1a3c2e]/20"
                                                onClick={() => {
                                                    if (!item.read) {
                                                        markNotificationRead(user.uid, item.id);
                                                    }
                                                }}
                                            >
                                                Process Admission <ChevronRight size={14} />
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

// src/pages/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, AlertTriangle, CheckCircle, Trash2, Search, Filter, Clock, ChevronRight, Check, Zap, Activity } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { subscribeNotifications, subscribeReminders, markNotificationRead, deleteNotification, markAllNotificationsRead, clearAllNotifications } from '../services/firebase';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const safeToDate = (d) => {
    if (!d) return null;
    if (typeof d.toDate === 'function') return d.toDate();
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
};

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.3, ease: "easeOut" },
});

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

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
        const da = a.createdAt || a.dueDate || new Date(0);
        const db = b.createdAt || b.dueDate || new Date(0);
        return safeToDate(db) - safeToDate(da);
    });

    const filtered = allActivity.filter(item => {
        const searchMatch = !search ||
            (item.tenantName || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.unitName || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.propertyName || '').toLowerCase().includes(search.toLowerCase());

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

    const handleMarkAllRead = async () => {
        if (counts.unread === 0) return;
        try {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            await markAllNotificationsRead(user.uid);
            toast.success('Clean slate!');
        } catch (e) { toast.error('Sync failed.'); }
    };

    const handleClearInbox = async () => {
        if (notifications.length === 0) return;
        setShowClearConfirm(true);
    };

    const confirmClearInbox = async () => {
        setShowClearConfirm(false);
        try {
            setNotifications([]);
            await clearAllNotifications(user.uid);
            toast.success('Inbox cleared.');
        } catch (e) { toast.error('Archive failed.'); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-slide-up">
            {/* Page Header */}
            <motion.div {...fadeUp(0)} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-[#6b8a7a] font-bold text-xs uppercase tracking-[0.15em] mb-2">Internal Comms</p>
                    <h1 className="font-fraunces text-[#1a2e22] text-4xl font-black tracking-tight leading-none italic">
                        Activity Stream
                    </h1>
                    <p className="text-[#94a3a8] font-medium text-sm mt-3 flex items-center gap-2">
                        <Activity size={16} /> Real-time feed of registrations, payments and alerts
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleMarkAllRead} disabled={counts.unread === 0} className="btn-secondary py-3 text-[10px] font-black uppercase tracking-widest bg-white shadow-sm disabled:opacity-30">
                        <Check size={14} strokeWidth={3} className="mr-2" /> Mark as Read
                    </button>
                    <button onClick={handleClearInbox} disabled={notifications.length === 0} className="btn-secondary py-3 text-[10px] font-black uppercase tracking-widest bg-[#fff5f5] text-[#e74c3c] border-transparent hover:border-[#fee2e2] disabled:opacity-30">
                        <Trash2 size={14} strokeWidth={3} className="mr-2" /> Archive All
                    </button>
                </div>
            </motion.div>

            {/* Controls */}
            <motion.div {...fadeUp(0.1)} className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex bg-[#fcfdfc] p-1.5 rounded-[1.25rem] border border-[#f0f7f2] shadow-sm overflow-x-auto no-scrollbar w-full md:w-auto">
                    {[
                        { id: 'all', label: 'Everything', count: allActivity.length },
                        { id: 'unread', label: 'Unseen', count: counts.unread },
                        { id: 'requests', label: 'Access Requests', count: counts.requests },
                        { id: 'alerts', label: 'Financial Alerts', count: counts.alerts },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setFilter(t.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                ${filter === t.id ? 'bg-[#1a3c2e] text-white shadow-md' : 'text-[#6b8a7a] hover:text-[#1a6a3c]'}`}
                        >
                            {t.label}
                            {t.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] ${filter === t.id ? 'bg-white/20 text-white' : 'bg-[#e8f5ee] text-[#1a6a3c]'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cce8d8]" size={18} strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="w-full bg-white border border-[#ddf0e6] rounded-2xl pl-12 pr-4 py-4 text-[#1a2e22] font-semibold text-sm focus:ring-2 focus:ring-[#1a6a3c]/10 focus:border-[#1a6a3c] shadow-sm placeholder:text-[#cce8d8]"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </motion.div>

            {/* List Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="card h-24 animate-pulse bg-white/50" />)}
                </div>
            ) : filtered.length === 0 ? (
                <motion.div {...fadeUp(0.2)} className="card p-24 flex flex-col items-center text-center bg-[#fcfdfc]/50 border-2 border-dashed border-[#ddf0e6]">
                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-[#cce8d8] mb-6 shadow-sm border border-[#f0f7f2]">
                        <Bell size={36} strokeWidth={1.5} />
                    </div>
                    <h2 className="font-fraunces text-[#1a2e22] text-2xl font-black mb-2 italic">Stream Empty</h2>
                    <p className="text-[#6b8a7a] font-medium max-w-sm">
                        {search ? "No activity records match your current criteria." : "You're all caught up. New systemic updates will appear in this feed."}
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((item, i) => (
                            <motion.div
                                key={item.id}
                                {...fadeUp(0.15 + i * 0.05)}
                                layout
                                className={`card p-6 flex flex-col sm:flex-row items-center sm:items-center gap-6 group hover:border-[#1a6a3c]/30 hover:shadow-xl transition-all relative overflow-hidden ${!item.read && item.feedType === 'notification' ? 'border-[#1a6a3c]/20 bg-[#f4fbf7]/30' : ''}`}
                            >
                                {/* Activity Icon */}
                                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm border ${item.feedType === 'notification'
                                    ? item.type === 'unit_request' ? 'bg-[#fef9ed] border-[#f5e0b8] text-[#c8691a]' : 'bg-[#e8f5ee] border-[#ddf0e6] text-[#1a6a3c]'
                                    : item.overdue ? 'bg-[#fff5f5] border-[#fee2e2] text-[#e74c3c]' : 'bg-[#fef9ed] border-[#f5e0b8] text-[#c8691a]'
                                    }`}>
                                    {item.feedType === 'notification'
                                        ? item.type === 'unit_request' ? <User size={24} strokeWidth={2.5} /> : <Zap size={24} strokeWidth={2.5} />
                                        : <AlertTriangle size={24} strokeWidth={2.5} />}
                                </div>

                                {/* Main Text Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${item.feedType === 'notification' ? 'bg-[#e8f5ee] border-[#ddf0e6] text-[#1a6a3c]' : 'bg-[#fff5f5] border-[#fee2e2] text-[#e74c3c]'}`}>
                                            {item.feedType === 'notification' ? (item.type === 'unit_request' ? 'Portal Request' : 'System Update') : 'Financial Alert'}
                                        </span>
                                        {item.propertyName && (
                                            <span className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest flex items-center gap-1">
                                                · {item.propertyName} · {item.unitName}
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="font-fraunces font-black text-[#1a2e22] text-lg leading-tight mb-2">
                                        {item.feedType === 'notification' ? (
                                            <>
                                                <span className="text-[#1a6a3c]">{item.tenantName}</span> {' '}
                                                {item.type === 'unit_request' ? 'wants to lease' : 'interacted with'} {' '}
                                                <span className="italic">{item.unitName}</span>
                                            </>
                                        ) : (
                                            <>
                                                Settlement for <span className="text-[#e74c3c]">{item.tenantName}</span> is {item.overdue ? 'critical' : 'incoming'}
                                            </>
                                        )}
                                    </h4>

                                    <div className="flex items-center gap-4 text-[10px] font-bold text-[#94a3a8] tracking-wider uppercase">
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={12} strokeWidth={3} />
                                            {item.feedType === 'notification'
                                                ? (safeToDate(item.createdAt) ? format(safeToDate(item.createdAt), 'MMM d, p') : 'Just now')
                                                : (safeToDate(item.dueDate) ? `Deadline: ${format(safeToDate(item.dueDate), 'MMM d')}` : 'Invalid')}
                                        </span>
                                    </div>
                                </div>

                                {/* Contextual Actions */}
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    {item.feedType === 'notification' && item.type === 'unit_request' && (
                                        <Link
                                            to={`/properties/${item.propertyId}?tab=units`}
                                            className="flex-1 sm:flex-initial btn-primary text-[10px] px-6 py-3 bg-[#1a6a3c]"
                                            onClick={() => {
                                                if (!item.read) markNotificationRead(user.uid, item.id);
                                            }}
                                        >
                                            Review Access
                                        </Link>
                                    )}

                                    <div className="flex items-center gap-2">
                                        {item.feedType === 'notification' && !item.read && (
                                            <button
                                                onClick={() => markNotificationRead(user.uid, item.id)}
                                                className="w-10 h-10 rounded-xl bg-[#e8f5ee] border border-[#ddf0e6] flex items-center justify-center text-[#1a6a3c] hover:bg-[#1a3c2e] hover:text-white transition-all shadow-sm"
                                                title="Mark Complete"
                                            >
                                                <Check size={18} strokeWidth={3} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (item.feedType === 'notification') deleteNotification(user.uid, item.id);
                                                else toast.error("Reminders cannot be archived here.");
                                            }}
                                            className="w-10 h-10 rounded-xl bg-white border border-[#f0f7f2] flex items-center justify-center text-[#94a3a8] hover:bg-[#e74c3c] hover:text-white transition-all shadow-sm"
                                            title="Archive Log"
                                        >
                                            <Trash2 size={18} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Archive Confirmation Modal */}
            <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="System Archive" size="sm">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-[#fff5f5] text-[#e74c3c] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Trash2 size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-fraunces text-2xl font-black text-[#1a2e22] mb-3 italic">Clean Sweep?</h3>
                    <p className="text-[#6b8a7a] font-medium text-sm mb-8 leading-relaxed">
                        Are you sure you want to archive all activity logs? Historical rent reminders and financial data will be preserved, but your inbox stream will be cleared.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={confirmClearInbox} className="w-full btn-primary py-4 bg-[#e74c3c] border-[#e74c3c] hover:bg-black hover:border-black text-white shadow-xl shadow-red-100 uppercase tracking-widest text-[10px]">
                            Proceed with Archive
                        </button>
                        <button onClick={() => setShowClearConfirm(false)} className="w-full btn-secondary py-4 text-[10px] font-black uppercase tracking-widest border-transparent hover:bg-gray-100">
                            Keep my logs
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

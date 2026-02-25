// src/pages/ArchivedTenantsPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Search, Hash, MapPin, Calendar, ExternalLink, AlertCircle, User, Activity, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenancies } from '../services/tenancy';
import { Link } from 'react-router-dom';

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4, ease: "easeOut" },
});

export default function ArchivedTenantsPage() {
    const { user } = useAuth();
    const { fmtRent } = useLocale();
    const [tenancies, setTenancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        setError(null);

        const unsub = subscribeTenancies(
            user.uid,
            (data) => {
                setTenancies(data.filter(t => t.status === 'former'));
                setLoading(false);
            },
            (err) => {
                console.error("Archive fetch error:", err);
                setError(err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [user]);

    const filtered = tenancies.filter(t => {
        const s = searchTerm.toLowerCase();
        return (
            (t.tenantName || '').toLowerCase().includes(s) ||
            (t.unitName || '').toLowerCase().includes(s) ||
            (t.propertyName || '').toLowerCase().includes(s)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-10 h-10 border-3 border-[#1a6a3c] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-5xl mx-auto py-12">
                <div className="card p-16 flex flex-col items-center justify-center text-center bg-[#fff5f5] border-[#fee2e2]">
                    <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mb-6 text-[#e74c3c] shadow-sm border border-[#fee2e2]">
                        <AlertCircle size={36} strokeWidth={2.5} />
                    </div>
                    <h2 className="font-fraunces text-[#1a2e22] text-2xl font-black mb-3 italic">Connection Interrupted</h2>
                    <p className="text-[#6b8a7a] font-medium max-w-md leading-relaxed">
                        We encountered an issue synchronizing with the historical ledger. This is typically a brief synchronization delay.
                    </p>
                    <button onClick={() => window.location.reload()} className="mt-8 btn-secondary px-8 py-3 text-xs font-black uppercase tracking-widest border-[#fee2e2]">
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-12 animate-slide-up">
            {/* Page Header */}
            <motion.div {...fadeUp(0)} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-[#6b8a7a] font-bold text-xs uppercase tracking-[0.15em] mb-2">Historical Records</p>
                    <h1 className="font-fraunces text-[#1a2e22] text-4xl font-black tracking-tight leading-none italic">
                        Archived Tenancies
                    </h1>
                    <p className="text-[#94a3a8] font-medium text-sm mt-3 flex items-center gap-2">
                        <Activity size={16} /> Preserving {tenancies.length} historical lease agreements
                    </p>
                </div>
            </motion.div>

            {/* Utility Bar */}
            <motion.div {...fadeUp(0.05)} className="relative max-w-xl">
                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#cce8d8]" strokeWidth={3} />
                <input
                    type="text"
                    placeholder="Search past residents, assets, or identifiers..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-[#ddf0e6] rounded-[2rem] pl-14 pr-6 py-5 text-[#1a2e22] font-semibold text-base focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] shadow-xl placeholder:text-[#cce8d8] transition-all"
                />
            </motion.div>

            {/* Content Area */}
            {filtered.length === 0 ? (
                <motion.div {...fadeUp(0.1)} className="card p-24 flex flex-col items-center text-center bg-[#fcfdfc]/50 border-2 border-dashed border-[#ddf0e6]">
                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-[#cce8d8] mb-6 shadow-sm border border-[#f0f7f2]">
                        <Archive size={40} strokeWidth={1.5} />
                    </div>
                    <h2 className="font-fraunces text-[#1a2e22] text-2xl font-black mb-2 italic">No History Found</h2>
                    <p className="text-[#6b8a7a] font-medium max-w-sm">
                        {searchTerm ? "No historical records match your current search criteria." : "Historical tenancies will be automatically indexed here upon lease termination."}
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((t, idx) => (
                            <motion.div
                                key={t.id}
                                {...fadeUp(0.1 + idx * 0.05)}
                                layout
                                className="card group overflow-hidden bg-white border-[#f0f7f2] hover:border-[#1a6a3c]/30 hover:shadow-2xl transition-all"
                            >
                                <div className="p-8">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-14 h-14 rounded-2xl bg-[#f4fbf7] border border-[#ddf0e6] flex items-center justify-center text-[#1a6a3c] flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                <User size={28} strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-fraunces font-black text-[#1a2e22] text-xl truncate mb-0.5">{t.tenantName || 'Standard Tenant'}</h3>
                                                <p className="text-[#6b8a7a] font-bold text-xs uppercase tracking-widest">{t.tenantEmail || 'Encrypted Identity'}</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#fcfdfc] border border-[#f0f7f2] text-[#94a3a8]">
                                            Archived
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-[#fcfdfc] border border-[#f0f7f2] border-dashed mb-8">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Property Asset</p>
                                            <div className="flex items-center gap-2 text-[#1a2e22] font-bold text-sm">
                                                <MapPin size={14} className="text-[#1a6a3c]" strokeWidth={2.5} />
                                                <span className="truncate">{t.propertyName || 'Portfolio Asset'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Unit Reference</p>
                                            <div className="flex items-center gap-2 text-[#1a2e22] font-bold text-sm">
                                                <Hash size={14} className="text-[#1a6a3c]" strokeWidth={2.5} />
                                                <span>{t.unitName || 'Multi-Unit'}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-1 mt-2">
                                            <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Term Expired</p>
                                            <div className="flex items-center gap-2 text-[#1a2e22] font-bold text-sm">
                                                <Calendar size={14} className="text-[#1a6a3c]" strokeWidth={2.5} />
                                                <span>{t.closedAt ? format(t.closedAt.toDate?.() || new Date(t.closedAt), 'MMMM d, yyyy') : 'Indefinite Term'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-[#f0f7f2]">
                                        <div>
                                            <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest mb-1">Final Agreed Rent</p>
                                            <p className="font-fraunces font-black text-[#1a2e22] text-2xl italic leading-none">
                                                {fmtRent(t.rentAmount || 0, t.billingCycle || 'monthly')}
                                            </p>
                                        </div>
                                        <Link
                                            to={`/properties/${t.propertyId || ''}?tab=payments`}
                                            className="inline-flex items-center gap-2 bg-[#f4fbf7] text-[#1a6a3c] font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[#1a3c2e] hover:text-white transition-all shadow-sm"
                                        >
                                            View Asset <ArrowRight size={14} strokeWidth={3} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

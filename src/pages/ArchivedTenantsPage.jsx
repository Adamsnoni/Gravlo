// src/pages/ArchivedTenantsPage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Archive, Search, Hash, MapPin, Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenancies } from '../services/tenancy';
import { Link } from 'react-router-dom';

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4 },
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
                // Only show former tenancies
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
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="card p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-rust/10 flex items-center justify-center mb-4 text-rust">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="font-display text-ink text-xl font-semibold mb-2">Something went wrong</h2>
                    <p className="font-body text-stone-500 max-w-md">
                        We couldn't load your archived records. This is likely due to a database indexing update. Check the console for details, or try again later.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-ink text-2xl font-semibold">Archived Tenants</h1>
                    <p className="font-body text-stone-500 text-sm mt-1">
                        Past leases and historical payment records.
                    </p>
                </div>
            </motion.div>

            <motion.div {...fadeUp(0.1)} className="card p-6 min-h-[400px]">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Search past tenants or properties..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input-base pl-10 w-full"
                        />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mx-auto mb-4 border border-stone-100">
                            <Archive size={24} className="text-stone-300" />
                        </div>
                        <p className="font-body text-stone-500 font-medium">No archived records found.</p>
                        {searchTerm && <p className="font-body text-sm text-stone-400 mt-1">Try adjusting your search.</p>}
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {filtered.map(t => (
                            <div key={t.id} className="p-5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-body font-semibold text-ink text-base">{t.tenantName || 'Unknown Tenant'}</h3>
                                        <p className="font-body text-stone-400 text-xs mt-0.5">{t.tenantEmail || 'No email provided'}</p>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-500 uppercase tracking-widest">
                                        Archived
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-stone-600">
                                        <MapPin size={14} className="text-stone-400" />
                                        <span className="font-body truncate">{t.propertyName || 'Property'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-stone-600">
                                        <Hash size={14} className="text-stone-400" />
                                        <span className="font-body">{t.unitName || 'Unit'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-stone-600">
                                        <Calendar size={14} className="text-stone-400" />
                                        <span className="font-body">Moved out: {t.closedAt ? format(t.closedAt.toDate?.() || new Date(t.closedAt), 'MMM d, yyyy') : 'Unknown'}</span>
                                    </div>
                                </div>

                                <div className="h-px bg-stone-200 w-full mb-4" />

                                <div className="flex items-center justify-between">
                                    <p className="font-display font-semibold text-ink">
                                        {fmtRent(t.rentAmount || 0, t.billingCycle || 'monthly')}
                                    </p>
                                    <Link to={`/properties/${t.propertyId || ''}?tab=payments`} className="btn-ghost text-xs">
                                        View Property <ExternalLink size={12} className="ml-1" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// src/components/AssignTenantModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal for assigning a tenant to a unit via email search or manual entry.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Mail } from 'lucide-react';
import Modal from './Modal';
import { searchTenants } from '../services/firebase';
import toast from 'react-hot-toast';

export default function AssignTenantModal({ isOpen, onClose, onAssign, saving, unitName }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [mode, setMode] = useState('search'); // 'search' | 'manual'

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setSearchQuery(''); setResults([]); setManualName(''); setManualEmail(''); setMode('search');
        }
    }, [isOpen]);

    // Debounced search
    const doSearch = useCallback(async (q) => {
        if (q.length < 2) { setResults([]); return; }
        setSearching(true);
        try {
            const r = await searchTenants(q);
            setResults(r);
        } catch { setResults([]); }
        finally { setSearching(false); }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => doSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery, doSearch]);

    const handleSelectTenant = (tenant) => {
        onAssign({
            tenantId: tenant.uid,
            tenantName: tenant.fullName,
            tenantEmail: tenant.email,
            status: 'occupied',
        });
    };

    const handleManualAssign = (e) => {
        e.preventDefault();
        if (!manualName.trim() && !manualEmail.trim()) { toast.error('Enter at least a name or email.'); return; }
        onAssign({
            tenantId: null,
            tenantName: manualName.trim(),
            tenantEmail: manualEmail.trim(),
            status: 'occupied',
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Assign Tenant — ${unitName || 'Unit'}`}>
            <div className="space-y-4">
                {/* Mode toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('search')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium border transition-all ${mode === 'search' ? 'bg-sage/10 text-sage border-sage/30' : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
                            }`}
                    >
                        Search Tenants
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium border transition-all ${mode === 'manual' ? 'bg-sage/10 text-sage border-sage/30' : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
                            }`}
                    >
                        Enter Manually
                    </button>
                </div>

                {mode === 'search' ? (
                    <>
                        {/* Search input */}
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                            <input
                                className="input-base pl-10"
                                placeholder="Search by tenant email..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Results */}
                        {searching && (
                            <div className="flex items-center justify-center py-4">
                                <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        {!searching && results.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {results.map(t => (
                                    <button
                                        key={t.uid}
                                        onClick={() => handleSelectTenant(t)}
                                        disabled={saving}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-sage/30 hover:bg-sage/5 transition-all text-left"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-sage/10 flex items-center justify-center flex-shrink-0">
                                            <User size={16} className="text-sage" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-body text-sm font-medium text-ink truncate">{t.fullName}</p>
                                            <p className="font-body text-xs text-stone-400 truncate">{t.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {!searching && searchQuery.length >= 2 && results.length === 0 && (
                            <div className="text-center py-4">
                                <p className="font-body text-sm text-stone-400">No tenants found.</p>
                                <button onClick={() => setMode('manual')} className="font-body text-sm text-sage font-medium mt-1 hover:underline">
                                    Enter manually instead
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Manual entry */
                    <form onSubmit={handleManualAssign} className="space-y-3">
                        <div>
                            <label className="label-xs">Tenant Name</label>
                            <div className="relative">
                                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                <input className="input-base pl-10" placeholder="John Doe" value={manualName} onChange={e => setManualName(e.target.value)} autoFocus />
                            </div>
                        </div>
                        <div>
                            <label className="label-xs">Tenant Email</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                <input className="input-base pl-10" type="email" placeholder="tenant@email.com" value={manualEmail} onChange={e => setManualEmail(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={saving} className="btn-primary">
                                {saving ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" /> : 'Assign Tenant'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}

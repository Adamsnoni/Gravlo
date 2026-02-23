// src/pages/JoinPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public building portal — tenant self-selects a vacant unit and requests
// approval from the landlord.
// Route: /join/:landlordUid/:propertyId?pname=PropertyName
//
// ⚠️  Firestore reads (units) require authentication — unauthenticated visitors
//     are prompted to sign in first; once authenticated the units load normally.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, DoorOpen, Check, KeyRound,
    Loader2, BellRing, Home, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { getVacantUnits, requestUnitApproval } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function JoinPage() {
    const { landlordUid, propertyId } = useParams();
    const [searchParams] = useSearchParams();
    const propertyName = searchParams.get('pname') || 'Building Portal';

    const { user } = useAuth();
    const navigate = useNavigate();

    const [status, setStatus] = useState('idle'); // idle | loading | ready | submitting | done | error
    const [vacantUnits, setVacantUnits] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState(null);

    /* ── Load vacant units (only when authenticated) ───────────────────────── */
    useEffect(() => {
        if (!user) return; // wait for auth — don't attempt unauthenticated Firestore reads
        setStatus('loading');
        getVacantUnits(landlordUid, propertyId)
            .then(units => { setVacantUnits(units); setStatus('ready'); })
            .catch(err => {
                console.error('JoinPage units error:', err);
                setStatus('error');
            });
    }, [user, landlordUid, propertyId]);

    /* ── Submit approval request ───────────────────────────────────────────── */
    const handleRequest = async () => {
        if (!user || !selectedUnitId) return;
        if (user.uid === landlordUid) { toast.error("You can't request your own unit."); return; }

        setStatus('submitting');
        try {
            await requestUnitApproval(landlordUid, propertyId, selectedUnitId, user);
            toast.success('Request sent to your landlord!');
            setStatus('done');
        } catch (err) {
            toast.error(err.message || 'Something went wrong. Please try again.');
            setStatus('ready');
        }
    };

    const selectedUnit = vacantUnits.find(u => u.id === selectedUnitId);
    const currentUrl = `/join/${landlordUid}/${propertyId}?pname=${encodeURIComponent(propertyName)}`;

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center shadow-sm">
                    <KeyRound size={17} className="text-cream" />
                </div>
                <span className="font-display font-semibold text-ink text-xl">LeaseEase</span>
            </div>

            <AnimatePresence mode="wait">

                {/* ── Not authenticated yet ────────────────────────────────── */}
                {!user && (
                    <motion.div key="auth" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }} className="w-full max-w-sm space-y-5">

                        {/* Property header */}
                        <div className="card overflow-hidden">
                            <div className="bg-gradient-to-br from-ink to-ink/90 p-6 relative">
                                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #F5F0E8 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
                                <div className="relative flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-sage/20 border border-sage/30 flex items-center justify-center flex-shrink-0">
                                        <Building2 size={24} className="text-sage" />
                                    </div>
                                    <div>
                                        <p className="font-body text-stone-400 text-xs uppercase tracking-wider mb-0.5">Building Portal</p>
                                        <h1 className="font-display text-cream text-xl font-semibold">{propertyName}</h1>
                                        <p className="font-body text-stone-400 text-sm">Sign in to view & claim a unit</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/register?next=${encodeURIComponent(currentUrl)}`)}
                            className="btn-primary w-full py-3 justify-center"
                        >
                            <KeyRound size={16} /> Create Account to Continue
                        </button>
                        <p className="font-body text-xs text-stone-400 text-center">
                            Already have an account?{' '}
                            <Link to={`/login?next=${encodeURIComponent(currentUrl)}`}
                                className="text-sage font-medium hover:underline">Sign in</Link>
                        </p>
                    </motion.div>
                )}

                {/* ── Loading units ─────────────────────────────────────────── */}
                {user && status === 'loading' && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="text-sage animate-spin" />
                        <p className="font-body text-sm text-stone-400">Loading available units…</p>
                    </motion.div>
                )}

                {/* ── Error ─────────────────────────────────────────────────── */}
                {user && status === 'error' && (
                    <motion.div key="error" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="card p-8 max-w-sm w-full flex flex-col items-center text-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
                            <AlertTriangle size={28} className="text-rust" />
                        </div>
                        <h2 className="font-display text-ink text-xl font-semibold">Could Not Load Units</h2>
                        <p className="font-body text-stone-500 text-sm">
                            We couldn't fetch the available units for this property. Please try again or contact your landlord.
                        </p>
                        <button onClick={() => { setStatus('loading'); getVacantUnits(landlordUid, propertyId).then(u => { setVacantUnits(u); setStatus('ready'); }).catch(() => setStatus('error')); }}
                            className="btn-ghost text-sm">
                            Try Again
                        </button>
                    </motion.div>
                )}

                {/* ── Done ──────────────────────────────────────────────────── */}
                {status === 'done' && (
                    <motion.div key="done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center text-center gap-4 max-w-sm">
                        <div className="w-20 h-20 rounded-full bg-sage/15 flex items-center justify-center">
                            <BellRing size={36} className="text-sage" />
                        </div>
                        <h2 className="font-display text-ink text-2xl font-semibold">Request Sent!</h2>
                        <p className="font-body text-stone-500 text-sm">
                            Your request for <strong>{selectedUnit?.name}</strong> at{' '}
                            <strong>{propertyName}</strong> has been sent to your landlord.
                        </p>
                        <div className="w-full p-4 rounded-xl bg-sage/8 border border-sage/20 text-left">
                            <p className="font-body text-xs text-sage font-semibold uppercase tracking-wider mb-1">What happens next?</p>
                            <p className="font-body text-xs text-stone-500">
                                Your landlord will review and approve your request. Once approved, the unit will appear in your Homes dashboard.
                            </p>
                        </div>
                        <button onClick={() => navigate('/tenant')} className="btn-primary w-full justify-center mt-1">
                            <Home size={16} /> Go to My Homes
                        </button>
                    </motion.div>
                )}

                {/* ── Ready / Submitting ────────────────────────────────────── */}
                {user && (status === 'ready' || status === 'submitting') && (
                    <motion.div key="ready" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md space-y-5">

                        {/* Property header */}
                        <div className="card overflow-hidden">
                            <div className="bg-gradient-to-br from-ink to-ink/90 p-6 relative">
                                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #F5F0E8 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
                                <div className="relative flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-sage/20 border border-sage/30 flex items-center justify-center flex-shrink-0">
                                        <Building2 size={24} className="text-sage" />
                                    </div>
                                    <div>
                                        <p className="font-body text-stone-400 text-xs uppercase tracking-wider mb-0.5">Building Portal</p>
                                        <h1 className="font-display text-cream text-xl font-semibold">{propertyName}</h1>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-3 flex items-center gap-2 border-t border-stone-100">
                                <DoorOpen size={13} className="text-stone-400 flex-shrink-0" />
                                <span className="font-body text-xs text-stone-400">
                                    {vacantUnits.length} vacant unit{vacantUnits.length !== 1 ? 's' : ''} available · as <strong>{user.email}</strong>
                                </span>
                            </div>
                        </div>

                        {/* Unit grid */}
                        <div>
                            <p className="font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Select Your Unit</p>
                            {vacantUnits.length === 0 ? (
                                <div className="card p-6 text-center">
                                    <DoorOpen size={28} className="text-stone-300 mx-auto mb-2" />
                                    <p className="font-body text-sm text-stone-400">No vacant units available right now.</p>
                                    <p className="font-body text-xs text-stone-300 mt-1">Contact your landlord directly.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {vacantUnits.map((unit, i) => {
                                        const isSelected = selectedUnitId === unit.id;
                                        return (
                                            <motion.button
                                                key={unit.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                type="button"
                                                onClick={() => setSelectedUnitId(isSelected ? null : unit.id)}
                                                className={`relative text-left p-4 rounded-2xl border-2 transition-all ${isSelected
                                                    ? 'border-sage bg-sage/8 shadow-md'
                                                    : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-sage flex items-center justify-center">
                                                        <Check size={11} className="text-white" />
                                                    </div>
                                                )}
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${isSelected ? 'bg-sage/20' : 'bg-stone-100'}`}>
                                                    <DoorOpen size={17} className={isSelected ? 'text-sage' : 'text-stone-400'} />
                                                </div>
                                                <p className={`font-body text-sm font-semibold ${isSelected ? 'text-ink' : 'text-stone-700'}`}>
                                                    {unit.name}
                                                </p>
                                                {unit.rentAmount > 0 && (
                                                    <p className="font-body text-xs text-stone-400 mt-0.5">
                                                        {unit.rentAmount?.toLocaleString()} / {unit.billingCycle || 'mo'}
                                                    </p>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* CTA */}
                        <button
                            onClick={handleRequest}
                            disabled={!selectedUnitId || status === 'submitting'}
                            className="btn-primary w-full py-3 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'submitting'
                                ? <><Loader2 size={16} className="animate-spin" /> Sending Request…</>
                                : <><ChevronRight size={16} /> Request to Join{selectedUnit ? ` · ${selectedUnit.name}` : ''}</>
                            }
                        </button>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}

// src/pages/PropertySuccessPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Post-creation Success / Onboarding view.
// Reached after a landlord creates a new property.
// Offers two actions: "Invite Tenant to App" and "Add Later".
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, UserPlus, ArrowRight,
    Copy, Check, Ticket, RefreshCw, Building2, FileText, Calendar,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { regenerateInviteCode } from '../services/inviteCodes';

export default function PropertySuccessPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { fmt } = useLocale();

    // Data passed via navigate state from PropertiesPage
    const { propertyId, propertyName, inviteCode, monthlyRent = 0, rentType = 'monthly' } = location.state || {};

    // Invoice preview computations
    const securityDeposit = monthlyRent; // Default: 1× rent
    const totalDue = monthlyRent + securityDeposit;
    const dueDate = format(addDays(new Date(), 30), 'MMM d, yyyy');

    const [view, setView] = useState('main'); // 'main' | 'invite'
    const [code, setCode] = useState(inviteCode || '');
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    // Safety: if someone lands here directly without state, redirect
    if (!propertyId || !propertyName) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="font-body text-stone-400 mb-4">No property data found.</p>
                <button onClick={() => navigate('/properties')} className="btn-primary">Go to Properties</button>
            </div>
        );
    }

    /* ── Copy handler ──────────────────────────────────────────────────────── */
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            toast.success('Invite code copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch { toast.error('Failed to copy.'); }
    };

    /* ── Regenerate handler ────────────────────────────────────────────────── */
    const handleRegenerate = async () => {
        if (!confirm('Regenerate invite code? The current code will stop working.')) return;
        setRegenerating(true);
        try {
            const newCode = await regenerateInviteCode(user.uid, propertyId, propertyName);
            setCode(newCode);
            toast.success('New invite code generated!');
        } catch { toast.error('Failed to regenerate.'); }
        finally { setRegenerating(false); }
    };

    /* ════════════════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <AnimatePresence mode="wait">
                {/* ── Main onboarding view ───────────────────────────────────────── */}
                {view === 'main' && (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.35 }}
                        className="w-full max-w-lg text-center"
                    >
                        {/* Success icon */}
                        <div className="w-20 h-20 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={40} className="text-sage" />
                        </div>

                        <h1 className="font-display text-ink text-3xl font-semibold mb-2">
                            Property Created!
                        </h1>
                        <p className="font-body text-stone-400 text-sm mb-2">
                            <span className="font-semibold text-ink">{propertyName}</span> has been added to your portfolio.
                        </p>
                        <p className="font-body text-stone-400 text-sm mb-10">
                            What would you like to do next?
                        </p>

                        {/* Action cards */}
                        <div className="grid gap-4 sm:grid-cols-2 text-left">
                            {/* Invite Tenant */}
                            <button
                                onClick={() => setView('invite')}
                                className="group card p-5 border-2 border-sage/20 hover:border-sage/50 hover:shadow-deep transition-all text-left"
                            >
                                <div className="w-11 h-11 rounded-xl bg-sage/10 flex items-center justify-center mb-3 group-hover:bg-sage/20 transition-colors">
                                    <UserPlus size={20} className="text-sage" />
                                </div>
                                <p className="font-body font-semibold text-ink text-sm mb-1">Invite Tenant to App</p>
                                <p className="font-body text-xs text-stone-400 leading-relaxed">
                                    Generate and share an invite code so your tenant can join this property.
                                </p>
                                <div className="flex items-center gap-1 mt-3 text-sage font-body text-xs font-medium">
                                    Continue <ArrowRight size={12} />
                                </div>
                            </button>

                            {/* Add Later */}
                            <button
                                onClick={() => navigate('/properties')}
                                className="group card p-5 border-2 border-stone-100 hover:border-stone-300 hover:shadow-deep transition-all text-left"
                            >
                                <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center mb-3 group-hover:bg-stone-200 transition-colors">
                                    <Building2 size={20} className="text-stone-500" />
                                </div>
                                <p className="font-body font-semibold text-ink text-sm mb-1">Add Later</p>
                                <p className="font-body text-xs text-stone-400 leading-relaxed">
                                    Skip for now and go to your property dashboard. You can invite tenants anytime.
                                </p>
                                <div className="flex items-center gap-1 mt-3 text-stone-400 font-body text-xs font-medium">
                                    Go to Dashboard <ArrowRight size={12} />
                                </div>
                            </button>
                        </div>

                        {/* ── First Payment Preview ──────────────────────────── */}
                        {monthlyRent > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="mt-10 text-left"
                            >
                                <div className="flex items-center gap-2 mb-4 justify-center">
                                    <FileText size={16} className="text-sage" />
                                    <p className="font-body text-xs font-semibold text-sage uppercase tracking-wider">
                                        First Payment Preview
                                    </p>
                                </div>

                                <div className="card border border-stone-200 overflow-hidden">
                                    {/* Invoice header */}
                                    <div className="bg-gradient-to-br from-ink to-ink-light px-5 py-4">
                                        <p className="font-display text-cream text-sm font-semibold">Invoice Preview</p>
                                        <p className="font-body text-stone-400 text-xs mt-0.5">{propertyName}</p>
                                    </div>

                                    {/* Line items */}
                                    <div className="divide-y divide-stone-100">
                                        <InvoiceRow label="Rent Amount" value={fmt(monthlyRent)} />
                                        <InvoiceRow label="Security Deposit" value={fmt(securityDeposit)} sub="1× monthly rent" />
                                        <InvoiceRow
                                            label="Due Date"
                                            value={dueDate}
                                            icon={<Calendar size={13} className="text-stone-400" />}
                                        />
                                    </div>

                                    {/* Total */}
                                    <div className="bg-stone-50 px-5 py-3 flex items-center justify-between">
                                        <span className="font-body text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Due</span>
                                        <span className="font-display text-lg font-bold text-sage">{fmt(totalDue)}</span>
                                    </div>
                                </div>

                                <p className="font-body text-xs text-stone-400 text-center mt-3">
                                    This is a preview based on default settings. Amounts may be adjusted before sending.
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ── Invite code view ───────────────────────────────────────────── */}
                {view === 'invite' && (
                    <motion.div
                        key="invite"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.35 }}
                        className="w-full max-w-md text-center"
                    >
                        {/* Header */}
                        <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-5">
                            <Ticket size={28} className="text-sage" />
                        </div>
                        <h2 className="font-display text-ink text-2xl font-semibold mb-1">
                            Invite Your Tenant
                        </h2>
                        <p className="font-body text-sm text-stone-400 mb-8">
                            Share this unique code with your tenant for <span className="font-semibold text-ink">{propertyName}</span>.
                        </p>

                        {/* Code tiles */}
                        <div className="flex justify-center gap-2 mb-6">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={code}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex gap-2"
                                >
                                    {code.split('').map((char, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center justify-center w-12 h-14 rounded-xl bg-white border-2 border-sage/20 font-display text-2xl font-bold text-ink shadow-sm"
                                        >
                                            {char}
                                        </span>
                                    ))}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <p className="font-body text-xs text-stone-400 mb-6">
                            Your tenant can use this code during sign-up to link to this property.
                        </p>

                        {/* Action buttons */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <button
                                onClick={handleCopy}
                                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-medium border transition-all ${copied
                                    ? 'bg-sage/10 text-sage border-sage/30'
                                    : 'bg-sage text-cream border-sage hover:bg-sage/90'
                                    }`}
                            >
                                {copied ? <Check size={15} /> : <Copy size={15} />}
                                {copied ? 'Copied!' : 'Copy to Clipboard'}
                            </button>

                            <button
                                onClick={handleRegenerate}
                                disabled={regenerating}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium bg-white text-stone-500 border border-stone-200 hover:border-stone-300 transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                                Regenerate
                            </button>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-center gap-3 pt-4 border-t border-stone-100">
                            <button
                                onClick={() => setView('main')}
                                className="btn-secondary text-sm"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={() => navigate(`/properties/${propertyId}`)}
                                className="btn-primary text-sm"
                            >
                                View Property <ArrowRight size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Helper: single row inside the invoice preview ──────────────────────── */
function InvoiceRow({ label, value, sub, icon }) {
    return (
        <div className="flex items-center justify-between px-5 py-3">
            <div>
                <span className="font-body text-sm text-ink font-medium">{label}</span>
                {sub && <p className="font-body text-xs text-stone-400 mt-0.5">{sub}</p>}
            </div>
            <div className="flex items-center gap-1.5">
                {icon}
                <span className="font-body text-sm font-semibold text-ink">{value}</span>
            </div>
        </div>
    );
}

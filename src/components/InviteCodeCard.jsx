// src/components/InviteCodeCard.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RefreshCw, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getInviteCodeForProperty,
    createInviteCode,
    regenerateInviteCode,
} from '../services/inviteCodes';
import Modal from './Modal';
import { RefreshCw as RefreshIcon, Trash2 } from 'lucide-react';

export default function InviteCodeCard({ landlordUid, propertyId, propertyName }) {
    const [code, setCode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [showRegenConfirm, setShowRegenConfirm] = useState(false);

    // Fetch or auto-generate on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                let existing = await getInviteCodeForProperty(landlordUid, propertyId);
                if (!existing) {
                    existing = await createInviteCode(landlordUid, propertyId, propertyName);
                }
                if (!cancelled) setCode(existing);
            } catch (err) {
                console.error('InviteCodeCard error:', err);
                if (!cancelled) toast.error('Failed to load invite code.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [landlordUid, propertyId, propertyName]);

    const handleCopy = async () => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            toast.success('Invite code copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy.');
        }
    };

    const handleRegenerate = async () => {
        setShowRegenConfirm(true);
    };

    const confirmRegenerate = async () => {
        setShowRegenConfirm(false);
        setRegenerating(true);
        try {
            const newCode = await regenerateInviteCode(landlordUid, propertyId, propertyName);
            setCode(newCode);
            toast.success('New invite code generated!');
        } catch {
            toast.error('Failed to regenerate code.');
        } finally {
            setRegenerating(false);
        }
    };

    // ── Skeleton ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 animate-pulse">
                <div className="h-3 w-24 bg-stone-200 rounded mb-4" />
                <div className="h-10 w-48 bg-stone-200 rounded mx-auto" />
            </div>
        );
    }

    // ── Rendered card ─────────────────────────────────────────────────────────
    return (
        <div className="bg-gradient-to-br from-sage/5 to-sage/10 rounded-xl p-5 border border-sage/20">
            <div className="flex items-center gap-2 mb-4">
                <Ticket size={14} className="text-sage" />
                <p className="font-body text-xs font-semibold text-sage uppercase tracking-wider">
                    Tenant Invite Code
                </p>
            </div>

            {/* Code display */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={code}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex gap-1.5"
                    >
                        {code?.split('').map((char, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center justify-center w-10 h-12 rounded-lg bg-white border border-sage/20 font-display text-xl font-bold text-ink shadow-sm"
                            >
                                {char}
                            </span>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>

            <p className="font-body text-xs text-stone-400 text-center mb-4">
                Share this code with your tenant so they can join this property.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-center gap-2">
                <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-body font-medium border transition-all ${copied
                        ? 'bg-sage/10 text-sage border-sage/30'
                        : 'bg-white text-ink border-stone-200 hover:border-sage/40 hover:bg-sage/5'
                        }`}
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                </button>

                <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-body font-medium bg-white text-stone-500 border border-stone-200 hover:border-stone-300 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                    Regenerate
                </button>
            </div>

            {/* Regeneration Confirmation */}
            <Modal isOpen={showRegenConfirm} onClose={() => setShowRegenConfirm(false)} title="System Rotation" size="sm">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-100">
                        <RefreshCw size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-fraunces text-2xl font-black text-[#1a2e22] mb-3 italic">Rotate Access Code?</h3>
                    <p className="text-[#6b8a7a] font-medium text-sm mb-8 leading-relaxed">
                        Generating a new code will immediately <span className="font-bold text-[#e74c3c]">invalidate</span> the current one. Any tenants using the legacy code will be unable to join.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={confirmRegenerate} className="w-full btn-primary py-4 bg-[#1a3c2e] border-[#1a3c2e] hover:bg-black hover:border-black text-white shadow-xl shadow-stone-200 uppercase tracking-widest text-[10px] font-black">
                            Authorize Rotation
                        </button>
                        <button onClick={() => setShowRegenConfirm(false)} className="w-full btn-secondary py-4 text-[10px] font-black uppercase tracking-widest border-transparent hover:bg-gray-100">
                            Maintain Current
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// src/components/UnitCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Displays a single unit card with status, rent, tenant info, and actions.
// Landlords can: Edit, Assign, Remove, or Send Invite Link to a tenant.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DoorOpen, UserPlus, UserMinus, Pencil, DollarSign, CalendarClock, User, Link2, Check, Copy, X, Clock, Loader2 } from 'lucide-react';
import { createInviteToken } from '../services/inviteTokens';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function UnitCard({ unit, fmtRent, landlordUid, propertyId, propertyName, onAssign, onRemove, onEdit }) {
    const isOccupied = unit.status === 'occupied' && unit.tenantId;

    // ── Invite link state ──────────────────────────────────────────────────
    const [showInvite, setShowInvite] = useState(false);
    const [inviteLink, setInviteLink] = useState(null);
    const [inviteExpiry, setInviteExpiry] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerateInvite = async () => {
        if (inviteLink) {
            // Already generated — just open the popover
            setShowInvite(true);
            return;
        }
        setGenerating(true);
        try {
            const { link, expiresAt } = await createInviteToken({
                landlordUid,
                propertyId,
                unitId: unit.id,
                unitName: unit.unitName,
                propertyName,
            });
            setInviteLink(link);
            setInviteExpiry(expiresAt);
            setShowInvite(true);
            toast.success('Invite link created — valid for 24 hours.');
        } catch (err) {
            console.error('Failed to create invite token:', err);
            toast.error('Failed to generate invite link.');
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy.');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5 hover:shadow-deep transition-shadow relative"
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOccupied ? 'bg-sage/10' : 'bg-stone-100'}`}>
                        <DoorOpen size={18} className={isOccupied ? 'text-sage' : 'text-stone-400'} />
                    </div>
                    <div>
                        <p className="font-body font-semibold text-ink text-sm">{unit.unitName}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-body font-semibold ${isOccupied ? 'bg-sage/10 text-sage' : 'bg-amber/10 text-amber'
                            }`}>
                            {isOccupied ? 'Occupied' : 'Vacant'}
                        </span>
                    </div>
                </div>
                <button onClick={() => onEdit(unit)} className="p-2 rounded-lg text-stone-300 hover:text-ink hover:bg-stone-100 transition-colors" title="Edit unit">
                    <Pencil size={14} />
                </button>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <DollarSign size={13} className="text-stone-400" />
                    <span className="font-body text-sm text-ink font-medium">
                        {fmtRent ? fmtRent(unit.rentAmount, unit.billingCycle) : `$${unit.rentAmount || 0}`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarClock size={13} className="text-stone-400" />
                    <span className="font-body text-sm text-stone-500 capitalize">{unit.billingCycle || 'monthly'}</span>
                </div>
            </div>

            {/* Tenant row */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-stone-50 rounded-xl border border-stone-100">
                <User size={14} className={isOccupied ? 'text-sage' : 'text-stone-300'} />
                <span className={`font-body text-sm ${isOccupied ? 'text-ink font-medium' : 'text-stone-400 italic'}`}>
                    {isOccupied ? (unit.tenantName || unit.tenantEmail || 'Assigned') : 'No tenant assigned'}
                </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {isOccupied ? (
                    <button onClick={() => onRemove(unit)} className="flex-1 btn-ghost text-xs text-rust hover:bg-rust/8 hover:text-rust">
                        <UserMinus size={14} /> Remove Tenant
                    </button>
                ) : (
                    <>
                        <button onClick={() => onAssign(unit)} className="flex-1 btn-ghost text-xs text-sage hover:bg-sage/8 hover:text-sage">
                            <UserPlus size={14} /> Assign
                        </button>
                        <button
                            onClick={handleGenerateInvite}
                            disabled={generating}
                            className="flex-1 btn-ghost text-xs text-stone-500 hover:bg-stone-100 hover:text-ink"
                            title="Generate a secure invite link to send to your tenant"
                        >
                            {generating
                                ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                                : <><Link2 size={13} /> Invite Link</>
                            }
                        </button>
                    </>
                )}
            </div>

            {/* Invite link popover */}
            <AnimatePresence>
                {showInvite && inviteLink && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        className="absolute inset-x-0 bottom-full mb-2 mx-2 z-10 bg-white rounded-2xl shadow-deep border border-stone-100 p-4"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Link2 size={14} className="text-sage" />
                                <span className="font-body text-xs font-semibold text-ink">Invite Link</span>
                            </div>
                            <button onClick={() => setShowInvite(false)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Link pill */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 bg-stone-50 rounded-xl px-3 py-2 border border-stone-100 overflow-hidden">
                                <p className="font-body text-xs text-stone-500 truncate">{inviteLink}</p>
                            </div>
                            <button onClick={handleCopy} className={`p-2 rounded-xl border transition-all flex-shrink-0 ${copied ? 'bg-sage/10 border-sage/30 text-sage' : 'bg-white border-stone-200 text-stone-400 hover:border-sage/30 hover:text-sage'}`}>
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>

                        {inviteExpiry && (
                            <p className="font-body text-[11px] text-stone-400 flex items-center gap-1">
                                <Clock size={10} />
                                Expires {formatDistanceToNow(inviteExpiry, { addSuffix: true })} · Share via email, WhatsApp, or SMS
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

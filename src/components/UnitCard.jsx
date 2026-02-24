// src/components/UnitCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, UserMinus, Pencil, DollarSign, CalendarClock, User, Send } from 'lucide-react';

export default function UnitCard({ unit, fmtRent, onRemove, onEdit, currencySymbol = '$' }) {
    const isOccupied = unit.status === 'occupied' && unit.tenantId;

    const handleShareVancancy = () => {
        // Build the direct portal link for this specific unit
        const portalUrl = `${window.location.origin}/apply/${propertyId}/${unit.id}`;

        const subject = encodeURIComponent(`Invitation to apply for ${unit.name} at ${propertyName}`);
        const body = encodeURIComponent(
            `Hi there,\n\nI'd like to invite you to apply for ${unit.name} at ${propertyName}. ` +
            `You can view the details and submit your application securely using the link below:\n\n` +
            `${portalUrl}\n\n` +
            `Best regards,\nYour Property Manager`
        );

        window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
                        <p className="font-body font-semibold text-ink text-sm">{unit.name}</p>
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
                        {fmtRent ? fmtRent(unit.rentAmount, unit.billingCycle) : `${currencySymbol}${unit.rentAmount || 0}`}
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
                    <button onClick={() => onRemove(unit)} className="flex-1 btn-ghost text-xs text-rust hover:bg-rust/8 hover:text-rust py-2">
                        <UserMinus size={14} /> Move-out
                    </button>
                ) : (
                    <button onClick={handleShareVancancy} className="flex-1 btn-ghost text-xs text-sage hover:bg-sage/10 hover:text-sage py-2 border border-sage/20">
                        <Send size={13} /> Email Invite
                    </button>
                )}
            </div>
        </motion.div>
    );
}

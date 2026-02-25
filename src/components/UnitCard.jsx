// src/components/UnitCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, UserMinus, Pencil, DollarSign, CalendarClock, User, Send, Loader2, Hash, ArrowUpRight, Trash2 } from 'lucide-react';

export default function UnitCard({ unit, fmtRent, onRemove, onEdit, currencySymbol = '$' }) {
    const isOccupied = unit.status === 'occupied' && unit.tenantId;

    const handleShareVancancy = () => {
        const portalUrl = `${window.location.origin}/portal/${unit.propertyId}`;
        const subject = encodeURIComponent(`Invitation to apply for ${unit.name} at ${unit.propertyName || 'the property'}`);
        const body = encodeURIComponent(
            `Hi there,\n\nI'd like to invite you to apply for ${unit.name} at ${unit.propertyName || 'the property'}. ` +
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
            className="card group p-6 bg-[#0d1215] border-[#1e2a2e] hover:border-[#1a3c2e] transition-all duration-500 hover:shadow-2xl hover:shadow-[#1a3c2e]/10 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[30px] -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-105 ${isOccupied ? 'bg-[#1a3c2e]/30 border-[#2d6a4f]/30 text-[#52b788]' : 'bg-[#141b1e] border-[#1e2a2e] text-[#4a5568]'}`}>
                        <DoorOpen size={20} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-display font-bold text-[#e8e4de] text-lg tracking-tight leading-tight">{unit.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${isOccupied ? 'bg-[#1a3c2e]/50 border-[#2d6a4f]/30 text-[#52b788]' : 'bg-[#2d2510]/50 border-[#3d3215]/30 text-[#f0c040]'}`}>
                                {isOccupied ? 'Secured' : 'Vacant'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(unit)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-[#4a5568] hover:text-[#e8e4de] bg-[#141b1e] border border-transparent hover:border-[#1e2a2e] transition-all"
                        title="Edit Vector"
                    >
                        <Pencil size={14} />
                    </button>
                    {!isOccupied && (
                        <button
                            onClick={() => onRemove(unit, true)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#4a5568] hover:text-[#e74c3c] bg-[#141b1e] border border-transparent hover:border-[#3d2020] transition-all"
                            title="Delete Vector"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative">
                <div className="space-y-1">
                    <p className="font-body text-[8px] font-black text-[#4a5568] uppercase tracking-widest">Pricing</p>
                    <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-[#52b788]" />
                        <span className="font-display text-[#e8e4de] text-lg font-bold tracking-tight">
                            {fmtRent ? fmtRent(unit.rentAmount, unit.billingCycle) : `${currencySymbol}${unit.rentAmount || 0}`}
                        </span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="font-body text-[8px] font-black text-[#4a5568] uppercase tracking-widest">Protocol</p>
                    <div className="flex items-center gap-2">
                        <CalendarClock size={14} className="text-[#4a5568]" />
                        <span className="font-body text-[10px] text-[#8a9ba8] font-bold uppercase tracking-widest">{unit.billingCycle || 'monthly'}</span>
                    </div>
                </div>
            </div>

            <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-500 mb-6 ${isOccupied ? 'bg-[#1a3c2e]/10 border-[#2d6a4f]/20' : 'bg-[#141b1e]/50 border-[#1e2a2e]'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOccupied ? 'bg-[#1a3c2e] text-[#52b788]' : 'bg-[#0d1215] text-[#4a5568]'}`}>
                    <User size={14} />
                </div>
                <div className="min-w-0">
                    <p className="font-body text-[8px] font-black text-[#4a5568] uppercase tracking-widest">Primary Resident</p>
                    <p className={`font-body text-xs font-bold truncate tracking-tight ${isOccupied ? 'text-[#e8e4de]' : 'text-[#4a5568] italic'}`}>
                        {isOccupied ? (unit.tenantName || 'Tenant Alpha') : 'Unassigned Vector'}
                    </p>
                </div>
                {isOccupied && <ArrowUpRight size={14} className="ml-auto text-[#4a5568] group-hover:text-[#52b788] transition-colors" />}
            </div>

            <div className="flex gap-3">
                {isOccupied ? (
                    <button
                        onClick={() => onRemove(unit)}
                        className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#2d1a1a]/20 border border-[#3d2020]/20 text-[#e74c3c] font-body text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#2d1a1a] transition-all"
                    >
                        <UserMinus size={14} /> Initiate Move-out
                    </button>
                ) : (
                    <button
                        onClick={handleShareVancancy}
                        className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#1a3c2e] border border-[#2d6a4f]/30 text-[#52b788] font-body text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#2d6a4f] transition-all shadow-lg shadow-[#1a3c2e]/20"
                    >
                        <Send size={14} /> Dispatch Invite
                    </button>
                )}
            </div>
        </motion.div>
    );
}

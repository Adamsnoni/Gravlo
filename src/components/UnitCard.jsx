// src/components/UnitCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, UserMinus, Pencil, Hash, User, Send, Calendar, Trash2, RefreshCw } from 'lucide-react';

export default function UnitCard({ unit, fmtRent, onRemove, onMasterReset, onEdit, onDelete, propertyId, propertyName, currencySymbol = '₦' }) {
    const isOccupied = unit.status === 'occupied' && unit.tenantId;

    const handleShareVacancy = () => {
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6 hover:border-[#1a6a3c]/30 hover:shadow-xl transition-all group flex flex-col relative"
        >
            <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center border transition-colors ${isOccupied ? 'bg-[#e8f5ee] border-[#ddf0e6] text-[#1a6a3c]' : 'bg-[#f4fbf7] border-[#f0f7f2] text-[#94a3a8]'}`}>
                        <DoorOpen size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="font-fraunces font-black text-[#1a2e22] text-lg tracking-tight group-hover:text-[#1a6a3c] transition-colors">{unit.name}</h4>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mt-1 border ${isOccupied ? 'bg-[#e8f5ee] text-[#1a6a3c] border-[#ddf0e6]' : 'bg-[#fef9ed] text-[#c8691a] border-[#f5e0b8]'}`}>
                            {isOccupied ? 'Leased' : 'Vacant'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {!isOccupied && onDelete && (
                        <button
                            onClick={(e) => { e.preventDefault(); onDelete(unit); }}
                            className="p-2.5 rounded-xl text-[#e74c3c]/40 hover:text-[#e74c3c] hover:bg-red-50 transition-all"
                            title="Delete Unit"
                        >
                            <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                    )}
                    <button onClick={() => onEdit(unit)} className="p-2.5 rounded-xl text-[#cce8d8] hover:text-[#1a2e22] hover:bg-[#f4fbf7] transition-all" title="Edit Properties">
                        <Pencil size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-[#f0f7f2] mb-6">
                <div>
                    <label className="text-[9px] font-black text-[#94a3a8] uppercase tracking-[0.15em] mb-1 block">Rental Amount</label>
                    <p className="font-fraunces font-black text-[#1a2e22] tracking-tight">
                        {fmtRent ? fmtRent(unit.rentAmount || 0, 'yearly') : `${currencySymbol}${unit.rentAmount || 0}`}
                    </p>
                </div>
                <div className="text-right">
                    <label className="text-[9px] font-black text-[#94a3a8] uppercase tracking-[0.15em] mb-1 block">Billing Context</label>
                    <div className="flex items-center justify-end gap-1.5 text-[#1a2e22] font-bold text-xs capitalize">
                        <Calendar size={12} className="text-[#1a6a3c]" />
                        Yearly Cycle
                    </div>
                </div>
            </div>

            {/* Resident Information */}
            <div className="flex-1">
                <div className="p-4 rounded-2xl bg-[#fcfdfc] border border-[#f0f7f2] flex items-center gap-3 mb-6 group-hover:bg-[#f4fbf7] transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm ${isOccupied ? 'bg-[#1a3c2e] text-[#52b788]' : 'bg-gray-100 text-gray-300'}`}>
                        <User size={14} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Resident</p>
                        <p className={`text-xs truncate font-bold ${isOccupied ? 'text-[#1a2e22]' : 'text-gray-400 italic'}`}>
                            {isOccupied ? (unit.tenantName || unit.tenantEmail || 'Occupant Active') : 'No resident assigned'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Contextual Actions */}
            <div className="flex gap-2 pt-2">
                {isOccupied ? (
                    <>
                        <button onClick={() => onRemove(unit)} className="flex-1 btn-secondary py-3 text-[10px] font-black uppercase text-[#e74c3c] border-transparent hover:bg-red-50 hover:border-[#fee2e2] transition-all">
                            <UserMinus size={14} strokeWidth={3} /> Move-out
                        </button>
                        <button onClick={() => onMasterReset(unit)} className="px-4 btn-secondary py-3 text-[10px] font-black uppercase text-[#94a3a8] border-transparent hover:text-red-600 hover:bg-red-50 transition-all" title="Master Reset Registry">
                            <RefreshCw size={14} strokeWidth={3} /> Reset
                        </button>
                    </>
                ) : (
                    <button onClick={handleShareVacancy} className="flex-1 btn-primary py-3 text-[10px] font-black uppercase bg-[#1a6a3c] shadow-lg shadow-[#1a6a3c]/10">
                        <Send size={14} strokeWidth={3} /> Send Invitation
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// src/components/AddUnitModal.jsx
import React, { useState, useEffect } from 'react';
import { DoorOpen, Hash, Calendar, UserPlus, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function AddUnitModal({ isOpen, onClose, onSubmit, saving, editUnit = null, currencySymbol = '₦', defaultRent = '' }) {
    const [form, setForm] = useState({
        unitName: '',
        rentAmount: '',
        billingCycle: 'yearly',
        tenantName: '',
        tenantEmail: '',
    });

    useEffect(() => {
        if (editUnit) {
            setForm({
                unitName: editUnit.unitName || '',
                rentAmount: editUnit.rentAmount?.toString() || '',
                billingCycle: editUnit.billingCycle || 'yearly',
                tenantName: editUnit.tenantName || '',
                tenantEmail: editUnit.tenantEmail || '',
            });
        } else {
            setForm({ unitName: '', rentAmount: defaultRent ? defaultRent.toString() : '', billingCycle: 'yearly', tenantName: '', tenantEmail: '' });
        }
    }, [editUnit, isOpen, defaultRent]);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.unitName.trim()) { toast.error('Unit identifier is required.'); return; }
        if (!form.rentAmount || isNaN(form.rentAmount)) { toast.error('Valid rent valuation required.'); return; }

        onSubmit({
            unitName: form.unitName.trim(),
            rentAmount: parseFloat(form.rentAmount),
            billingCycle: form.billingCycle,
            tenantName: form.tenantName.trim(),
            tenantEmail: form.tenantEmail.trim(),
            tenantId: form.tenantEmail.trim() ? (editUnit?.tenantId || null) : null,
            status: form.tenantName.trim() ? 'occupied' : 'vacant',
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editUnit ? 'Modify Unit Parameters' : 'Register New Unit'} size="md">
            <form onSubmit={handleSubmit} className="p-2 space-y-8">

                <div className="space-y-6">
                    {/* Unit Identifier */}
                    {!editUnit && (
                        <div>
                            <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Unit Number / Floor Name *</label>
                            <div className="relative">
                                <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#cce8d8] pointer-events-none" strokeWidth={3} />
                                <input
                                    className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl pl-12 pr-5 py-4 text-[#1a2e22] font-semibold text-sm focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] transition-all placeholder:font-normal placeholder:text-[#cce8d8]"
                                    placeholder="e.g. Penthouse A, Unit 204..."
                                    value={form.unitName}
                                    onChange={set('unitName')}
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Rent Val */}
                        <div>
                            <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Yearly Rent ({currencySymbol}) *</label>
                            <div className="relative">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1a6a3c] font-black text-sm pointer-events-none">
                                    {currencySymbol}
                                </div>
                                <input
                                    className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl pl-12 pr-5 py-4 text-[#1a2e22] font-black text-lg focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] transition-all"
                                    type="number"
                                    placeholder="0"
                                    value={form.rentAmount}
                                    onChange={set('rentAmount')}
                                    required
                                />
                            </div>
                        </div>

                        {/* Frequency removed - yearly only */}
                    </div>

                    {/* Resident Status */}
                    <div className="pt-2">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-black text-[#1a6a3c] uppercase tracking-widest px-3 py-1 bg-[#e8f5ee] rounded-lg border border-[#ddf0e6]">
                                Occupancy Context
                            </span>
                        </div>

                        <div className="p-6 rounded-3xl bg-[#fcfdfc] border border-[#f0f7f2] border-dashed">
                            <div className="flex items-center gap-4 mb-4">
                                <UserPlus size={20} className="text-[#cce8d8]" />
                                <p className="text-xs text-[#6b8a7a] font-medium leading-relaxed italic">
                                    Resident details are typically captured via the invitation portal. Direct assignment is preserved for legacy records.
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2 opacity-60">
                                    <label className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Active Resident</label>
                                    <div className="w-full bg-white border border-[#f0f7f2] rounded-xl px-4 py-3 text-[#1a2e22] text-xs font-bold truncate">
                                        {form.tenantName || 'No resident assigned'}
                                    </div>
                                </div>
                                <div className="space-y-2 opacity-60">
                                    <label className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Registered Email</label>
                                    <div className="w-full bg-white border border-[#f0f7f2] rounded-xl px-4 py-3 text-[#1a2e22] text-xs font-bold truncate">
                                        {form.tenantEmail || 'None'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button type="submit" disabled={saving} className="flex-1 btn-primary py-4 text-base order-1 sm:order-2">
                        {saving ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="flex items-center gap-2">
                                {editUnit ? 'Commit Changes' : 'Register Unit'}
                                <ArrowRight size={18} />
                            </span>
                        )}
                    </button>
                    <button type="button" onClick={onClose} className="flex-1 btn-secondary py-4 text-base order-2 sm:order-1 border-transparent hover:bg-gray-100">
                        Discard
                    </button>
                </div>
            </form>
        </Modal>
    );
}

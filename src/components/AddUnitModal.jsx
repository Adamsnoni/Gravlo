// src/components/AddUnitModal.jsx
import React, { useState, useEffect } from 'react';
import { DoorOpen, DollarSign, CalendarClock, UserPlus, Loader2 } from 'lucide-react';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function AddUnitModal({ isOpen, onClose, onSubmit, saving, editUnit = null, currencySymbol = '$', defaultRent = '' }) {
    const [form, setForm] = useState({
        unitName: '',
        rentAmount: '',
        billingCycle: 'monthly',
        tenantName: '',
        tenantEmail: '',
    });

    // Populate form when editing
    useEffect(() => {
        if (editUnit) {
            setForm({
                unitName: editUnit.unitName || '',
                rentAmount: editUnit.rentAmount?.toString() || '',
                billingCycle: editUnit.billingCycle || 'monthly',
                tenantName: editUnit.tenantName || '',
                tenantEmail: editUnit.tenantEmail || '',
            });
        } else {
            setForm({ unitName: '', rentAmount: defaultRent ? defaultRent.toString() : '', billingCycle: 'monthly', tenantName: '', tenantEmail: '' });
        }
    }, [editUnit, isOpen, defaultRent]);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.unitName.trim()) { toast.error('Apartment name/number is required.'); return; }
        if (!form.rentAmount || isNaN(form.rentAmount)) { toast.error('Valid rent amount is required.'); return; }

        onSubmit({
            unitName: form.unitName.trim(),
            rentAmount: parseInt(form.rentAmount),
            billingCycle: form.billingCycle,
            tenantName: form.tenantName.trim(),
            tenantEmail: form.tenantEmail.trim(),
            tenantId: form.tenantEmail.trim() ? (editUnit?.tenantId || null) : null,
            status: form.tenantName.trim() ? 'occupied' : 'vacant',
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editUnit ? 'Edit Unit' : 'Add Apartment / Unit'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Unit Name */}
                {!editUnit && (
                    <div>
                        <label className="label-xs">Apartment Number / Name *</label>
                        <div className="relative">
                            <DoorOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
                            <input
                                className="input-base pl-12"
                                placeholder="e.g. Unit 4B, Apt 12, Room 3"
                                value={form.unitName}
                                onChange={set('unitName')}
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Rent */}
                    <div>
                        <label className="label-xs">Rent Amount ({currencySymbol}) *</label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
                            <input
                                className="input-base pl-12"
                                type="number"
                                placeholder="e.g. 250000"
                                value={form.rentAmount}
                                onChange={set('rentAmount')}
                                required
                            />
                        </div>
                    </div>

                    {/* Billing cycle */}
                    <div>
                        <label className="label-xs">Billing Cycle</label>
                        <div className="relative">
                            <CalendarClock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
                            <select
                                className="input-base pl-12 appearance-none"
                                value={form.billingCycle}
                                onChange={set('billingCycle')}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tenant (optional) */}
                <div className="pt-2 border-t border-[#1e2a2e]">
                    <div className="flex items-center gap-2 mb-4">
                        <UserPlus size={14} className="text-[#52b788]" />
                        <span className="font-body text-[11px] font-bold text-[#e8e4de] uppercase tracking-widest">
                            Assign Tenant <span className="text-[#4a5568] normal-case font-medium ml-1">(Optional)</span>
                        </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-xs">Tenant Name</label>
                            <div className="input-base bg-[#141b1e]/50 text-[#4a5568] cursor-not-allowed flex items-center overflow-hidden whitespace-nowrap text-ellipsis border-dashed">
                                {form.tenantName || 'Not assigned'}
                            </div>
                        </div>
                        <div>
                            <label className="label-xs">Tenant Email</label>
                            <div className="input-base bg-[#141b1e]/50 text-[#4a5568] cursor-not-allowed flex items-center overflow-hidden whitespace-nowrap text-ellipsis border-dashed">
                                {form.tenantEmail || 'Not assigned'}
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 p-3 rounded-xl bg-[#1a3c2e]/10 border border-[#2d6a4f]/20 text-[11px] text-[#52b788] font-medium leading-relaxed">
                        To assign a tenant, share the Property Portal Link or a direct Unit Invite. Tenants will appear here once they join.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4 justify-end pt-4 border-t border-[#1e2a2e]">
                    <button type="button" onClick={onClose} className="btn-secondary px-8">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-primary px-8">
                        {saving ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : editUnit ? 'Save Changes' : 'Create Unit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

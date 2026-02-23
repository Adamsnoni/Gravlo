// src/components/AddUnitModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal for adding or editing an apartment/unit under a property.
// Fields: unit name (required), rent amount (required), billing cycle, tenant.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { DoorOpen, DollarSign, CalendarClock, UserPlus } from 'lucide-react';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function AddUnitModal({ isOpen, onClose, onSubmit, saving, editUnit = null, currencySymbol = '$' }) {
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
            setForm({ unitName: '', rentAmount: '', billingCycle: 'monthly', tenantName: '', tenantEmail: '' });
        }
    }, [editUnit, isOpen]);

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
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Unit Name */}
                <div>
                    <label className="label-xs">Apartment Number / Name *</label>
                    <div className="relative">
                        <DoorOpen size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input
                            className="input-base pl-10"
                            placeholder="e.g. Unit 4B, Apt 12, Room 3"
                            value={form.unitName}
                            onChange={set('unitName')}
                            autoFocus
                            required
                        />
                    </div>
                </div>

                {/* Rent */}
                <div>
                    <label className="label-xs">Rent Amount ({currencySymbol}) *</label>
                    <div className="relative">
                        <DollarSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input
                            className="input-base pl-10"
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
                        <CalendarClock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <select
                            className="input-base pl-10 appearance-none"
                            value={form.billingCycle}
                            onChange={set('billingCycle')}
                        >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>

                {/* Tenant (optional) */}
                <div className="pt-1">
                    <div className="flex items-center gap-2 mb-3">
                        <UserPlus size={14} className="text-stone-400" />
                        <span className="font-body text-xs font-semibold text-stone-400 uppercase tracking-wider">
                            Assign Tenant <span className="text-stone-300 normal-case">(optional)</span>
                        </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className="label-xs">Tenant Name</label>
                            <input
                                className="input-base"
                                placeholder="Skip if unknown"
                                value={form.tenantName}
                                onChange={set('tenantName')}
                            />
                        </div>
                        <div>
                            <label className="label-xs">Tenant Email</label>
                            <input
                                className="input-base"
                                type="email"
                                placeholder="tenant@email.com"
                                value={form.tenantEmail}
                                onChange={set('tenantEmail')}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-3">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-primary">
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                        ) : editUnit ? 'Save Changes' : 'Add Unit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

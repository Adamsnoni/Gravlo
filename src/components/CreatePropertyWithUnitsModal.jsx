// src/components/CreatePropertyWithUnitsModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 3-step modal:
//   Step 1 — Property details (name, address, rent, type, status)
//   Step 2 — How many units?  (numeric input → generates forms)
//   Step 3 — Fill each unit   (name, rent, billing cycle, optional tenant)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Plus, Trash2, ChevronRight,
    Check, DoorOpen, Info, User, Mail,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { addProperty, addUnit } from '../services/firebase';
import { canAddProperty, getUpgradePlan, getUserPlan } from '../services/subscription';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { RENT_TYPES } from '../utils/formatRent';
import toast from 'react-hot-toast';

const TYPES = ['Apartment', 'House', 'Studio', 'Duplex', 'Commercial', 'Other'];
const BILLING = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
];

const makeUnit = (idx, prefix = 'Unit') => ({
    id: crypto.randomUUID(),
    unitName: `${prefix} ${idx + 1}`,
    rentAmount: '',
    billingCycle: 'monthly',
    tenantName: '',
    tenantEmail: '',
    showTenant: false,
});

const STEPS = ['Property Details', 'Number of Units', 'Unit Setup'];

const slideVariants = {
    enter: { opacity: 0, x: 48 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -48 },
};

export default function CreatePropertyWithUnitsModal({ isOpen, onClose, propertyCount = 0 }) {
    const { user } = useAuth();
    const { currencySymbol } = useLocale();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [createdPropertyId, setCreatedPropertyId] = useState(null);
    const [createdPropertyName, setCreatedPropertyName] = useState('');

    // Step 1 — Property form
    const [propForm, setPropForm] = useState({
        name: '', address: '', type: 'Apartment', status: 'vacant',
    });

    // Step 2 — Unit count & prefix
    const [unitCount, setUnitCount] = useState('');
    const [unitPrefix, setUnitPrefix] = useState('Unit');
    const countRef = useRef(null);

    // Step 3 — Unit forms (generated)
    const [units, setUnits] = useState([]);

    const setP = k => e => setPropForm(f => ({ ...f, [k]: e.target.value }));
    const setUnit = (id, key, val) =>
        setUnits(us => us.map(u => u.id === id ? { ...u, [key]: val } : u));

    // Focus count input when step 2 mounts
    useEffect(() => {
        if (step === 2) setTimeout(() => countRef.current?.focus(), 100);
    }, [step]);

    // ── Step 1: Create property ───────────────────────────────────────────────
    const handleCreateProperty = async (e) => {
        e.preventDefault();
        if (!propForm.name.trim() || !propForm.address.trim()) {
            toast.error('Property name and address are required.');
            return;
        }
        const allowed = await canAddProperty(user.uid, propertyCount);
        if (!allowed) {
            const plan = await getUserPlan(user.uid);
            const upgrade = getUpgradePlan(plan.id);
            toast.error(
                `Reached ${plan.maxProperties}-property limit on ${plan.name}.${upgrade ? ` Upgrade to ${upgrade.name}.` : ''}`,
                { duration: 4000 }
            );
            return;
        }
        setSaving(true);
        try {
            const docRef = await addProperty(user.uid, { ...propForm });
            setCreatedPropertyId(docRef.id);
            setCreatedPropertyName(propForm.name);
            setStep(2);
        } catch {
            toast.error('Failed to create property.');
        } finally {
            setSaving(false);
        }
    };

    // ── Step 2: Confirm unit count → generate unit forms ─────────────────────
    const handleConfirmCount = (e) => {
        e.preventDefault();
        const n = Math.max(1, Math.min(50, parseInt(unitCount) || 1));
        const prefixStr = unitPrefix.trim() || 'Unit';

        setUnitCount(n);
        setUnitPrefix(prefixStr);
        setUnits(Array.from({ length: n }, (_, i) => makeUnit(i, prefixStr)));
        setStep(3);
    };

    // ── Step 3: Save units ────────────────────────────────────────────────────
    const handleSaveUnits = async () => {
        const valid = units.filter(u => u.unitName.trim());
        setSaving(true);
        try {
            for (const u of valid) {
                await addUnit(user.uid, createdPropertyId, {
                    unitName: u.unitName.trim(),
                    rentAmount: parseInt(u.rentAmount) || 0,
                    billingCycle: u.billingCycle || 'monthly',
                    status: u.tenantName || u.tenantEmail ? 'occupied' : 'vacant',
                    tenantId: null,
                    tenantName: u.tenantName || '',
                    tenantEmail: u.tenantEmail || '',
                });
            }
            toast.success(`${valid.length} unit${valid.length !== 1 ? 's' : ''} added!`);
        } catch {
            toast.error('Some units failed to save.');
        } finally {
            setSaving(false);
            navigate(`/properties/${createdPropertyId}?tab=units`);
            handleClose();
        }
    };

    const handleClose = () => {
        setStep(1);
        setPropForm({ name: '', address: '', type: 'Apartment', status: 'vacant' });
        setUnitCount('');
        setUnitPrefix('Unit');
        setUnits([]);
        setCreatedPropertyId(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={step === 1 ? handleClose : undefined}
            title={
                step === 1 ? 'Add Apartment / Unit' :
                    step === 2 ? 'How many units?' :
                        `Set Up Units — ${createdPropertyName}`
            }
            size="lg"
        >
            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-6">
                {STEPS.map((label, i) => {
                    const s = i + 1;
                    return (
                        <React.Fragment key={s}>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 flex-shrink-0 transition-all ${s < step ? 'bg-sage border-sage text-cream' :
                                    s === step ? 'border-sage text-sage bg-sage/10' :
                                        'border-stone-200 text-stone-300'
                                    }`}>
                                    {s < step ? <Check size={11} /> : s}
                                </div>
                                <span className={`font-body text-xs hidden sm:block transition-colors ${s === step ? 'text-ink font-semibold' : s < step ? 'text-sage' : 'text-stone-300'}`}>
                                    {label}
                                </span>
                            </div>
                            {s < 3 && <div className={`flex-1 h-px transition-colors ${s < step ? 'bg-sage/40' : 'bg-stone-100'}`} />}
                        </React.Fragment>
                    );
                })}
            </div>

            <AnimatePresence mode="wait">

                {/* ── STEP 1: Property details ──────────────────────────────────── */}
                {step === 1 && (
                    <motion.form key="s1" variants={slideVariants} initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }} onSubmit={handleCreateProperty} className="space-y-4">

                        <div className="grid sm:grid-cols-2 gap-3">
                            <Field label="Property / Building Name *">
                                <input className="input-base" placeholder="e.g. Sunset Court" value={propForm.name}
                                    onChange={setP('name')} required autoFocus />
                            </Field>
                            <Field label="Type">
                                <select className="input-base" value={propForm.type} onChange={setP('type')}>
                                    {TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </Field>
                        </div>

                        <Field label="Address *">
                            <div className="relative">
                                <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                <input className="input-base pl-9" placeholder="Full street address" value={propForm.address}
                                    onChange={setP('address')} required />
                            </div>
                        </Field>




                        <Field label="Status">
                            <div className="flex gap-2">
                                {['occupied', 'vacant', 'maintenance'].map(s => (
                                    <button type="button" key={s} onClick={() => setPropForm(f => ({ ...f, status: s }))}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium border capitalize transition-all ${propForm.status === s
                                            ? s === 'occupied' ? 'bg-sage/10 text-sage border-sage/30'
                                                : s === 'vacant' ? 'bg-amber/10 text-amber border-amber/30'
                                                    : 'bg-rust/10 text-rust border-rust/30'
                                            : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
                                            }`}>{s}</button>
                                ))}
                            </div>
                        </Field>

                        <div className="flex gap-3 justify-end pt-2">
                            <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={saving} className="btn-primary">
                                {saving
                                    ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                                    : <><ChevronRight size={15} /> Next: Units</>}
                            </button>
                        </div>
                    </motion.form>
                )}

                {/* ── STEP 2: Unit count ────────────────────────────────────────── */}
                {step === 2 && (
                    <motion.form key="s2" variants={slideVariants} initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }} onSubmit={handleConfirmCount}
                        className="space-y-6">

                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center mx-auto mb-4">
                                <DoorOpen size={28} className="text-sage" />
                            </div>
                            <p className="font-body text-stone-500 text-sm mb-6">
                                How many units or apartments are in <strong className="text-ink">{createdPropertyName}</strong>?
                            </p>

                            <div className="flex items-center justify-center gap-3">
                                <button type="button"
                                    onClick={() => setUnitCount(c => Math.max(1, (parseInt(c) || 1) - 1))}
                                    className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-lg flex items-center justify-center transition-colors">
                                    −
                                </button>
                                <input
                                    ref={countRef}
                                    type="number" min="1" max="50"
                                    className="w-24 h-14 text-center font-display text-3xl font-semibold text-ink border-2 border-stone-200 focus:border-sage rounded-2xl outline-none transition-colors"
                                    value={unitCount}
                                    onChange={e => setUnitCount(Math.max(1, Math.min(50, parseInt(e.target.value) || '')))}
                                    placeholder="1"
                                    required
                                />
                                <button type="button"
                                    onClick={() => setUnitCount(c => Math.min(50, (parseInt(c) || 0) + 1))}
                                    className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-sage/10 hover:text-sage text-stone-600 font-bold text-lg flex items-center justify-center transition-colors">
                                    +
                                </button>
                            </div>

                            <div className="mt-6 max-w-[200px] mx-auto text-left">
                                <Field label="Unit Prefix (e.g. Unit, Apt, Room)">
                                    <input
                                        className="input-base text-center"
                                        placeholder="Unit"
                                        value={unitPrefix}
                                        onChange={e => setUnitPrefix(e.target.value)}
                                    />
                                </Field>
                            </div>

                            <p className="font-body text-xs text-stone-400 mt-6 flex items-center justify-center gap-1">
                                <Info size={11} /> You can add or remove units anytime from the property page
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
                            <button type="submit" className="btn-primary">
                                <ChevronRight size={15} /> Set Up {unitCount || '?'} Unit{parseInt(unitCount) !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </motion.form>
                )}

                {/* ── STEP 3: Unit forms ────────────────────────────────────────── */}
                {step === 3 && (
                    <motion.div key="s3" variants={slideVariants} initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }} className="space-y-4">

                        <div className="flex items-center justify-between">
                            <p className="font-body text-sm text-stone-500">
                                Fill in the details for each unit below.
                            </p>
                            <span className="font-body text-xs text-stone-400 bg-stone-100 px-2 py-1 rounded-lg">
                                {units.length} unit{units.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Column headers */}
                        <div className="grid grid-cols-12 gap-2 px-1">
                            <span className="col-span-3 font-body text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Unit Name</span>
                            <span className="col-span-3 font-body text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Rent ({currencySymbol})</span>
                            <span className="col-span-3 font-body text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Billing</span>
                            <span className="col-span-3 font-body text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Tenant (opt.)</span>
                        </div>

                        {/* Scrollable unit list */}
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                            {units.map((unit, idx) => (
                                <motion.div key={unit.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                    className="space-y-1.5"
                                >
                                    <div className="grid grid-cols-12 gap-2 items-center p-2 bg-stone-50 rounded-xl border border-stone-100">
                                        {/* Unit name */}
                                        <div className="col-span-3">
                                            <input
                                                className="input-base text-sm h-9"
                                                placeholder={`Unit ${idx + 1}`}
                                                value={unit.unitName}
                                                onChange={e => setUnit(unit.id, 'unitName', e.target.value)}
                                            />
                                        </div>
                                        {/* Rent */}
                                        <div className="col-span-3">
                                            <input
                                                className="input-base text-sm h-9"
                                                type="number"
                                                placeholder="e.g. 150000"
                                                value={unit.rentAmount}
                                                onChange={e => setUnit(unit.id, 'rentAmount', e.target.value)}
                                            />
                                        </div>
                                        {/* Billing */}
                                        <div className="col-span-3">
                                            <select
                                                className="input-base text-sm h-9"
                                                value={unit.billingCycle}
                                                onChange={e => setUnit(unit.id, 'billingCycle', e.target.value)}
                                            >
                                                {BILLING.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                                            </select>
                                        </div>
                                        {/* Tenant toggle */}
                                        <div className="col-span-3 flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setUnit(unit.id, 'showTenant', !unit.showTenant)}
                                                className={`flex items-center gap-1 text-xs font-body px-2 py-1.5 rounded-lg border transition-all w-full justify-center ${unit.tenantName || unit.tenantEmail
                                                    ? 'bg-sage/10 text-sage border-sage/20'
                                                    : 'bg-white text-stone-400 border-stone-200 hover:border-sage/30 hover:text-sage'
                                                    }`}
                                                title="Add optional tenant info"
                                            >
                                                <User size={11} />
                                                {unit.tenantName ? unit.tenantName.split(' ')[0] : 'Tenant'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expandable tenant fields */}
                                    <AnimatePresence>
                                        {unit.showTenant && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="grid grid-cols-2 gap-2 px-2 overflow-hidden"
                                            >
                                                <div className="relative">
                                                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                                    <div className="input-base text-sm pl-8 h-9 bg-stone-50 text-stone-400 cursor-not-allowed flex items-center italic">
                                                        {unit.tenantName || 'Not assigned'}
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                                    <div className="input-base text-sm pl-8 h-9 bg-stone-50 text-stone-400 cursor-not-allowed flex items-center italic overflow-hidden whitespace-nowrap text-ellipsis">
                                                        {unit.tenantEmail || 'Not assigned'}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 justify-between pt-2">
                            <button type="button" onClick={() => setStep(2)} className="btn-ghost text-sm">
                                ← Back
                            </button>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => { navigate(`/properties/${createdPropertyId}?tab=units`); handleClose(); }}
                                    className="btn-secondary text-sm">
                                    Skip — fill later
                                </button>
                                <button onClick={handleSaveUnits} disabled={saving} className="btn-primary">
                                    {saving
                                        ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                                        : <><Check size={14} /> Save & Finish</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Modal>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="label-xs">{label}</label>
            {children}
        </div>
    );
}

// src/pages/OnboardingPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Post-signup onboarding wizard for landlords.
// Step 1: Add your first property/building (name + address)
// Step 2: Add apartments/units (name, rent, billing cycle, optional tenant)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, Plus, Trash2, ArrowRight,
    KeyRound, DollarSign, CalendarClock, UserPlus, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { addProperty } from '../services/firebase';
import toast from 'react-hot-toast';

const emptyUnit = () => ({
    id: crypto.randomUUID(),
    name: '',
    rent: '',
    rentType: 'monthly',
    tenantName: '',
});

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const { currencySymbol } = useLocale();

    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Step 1: Building info
    const [building, setBuilding] = useState({ name: '', address: '' });

    // Step 2: Units
    const [units, setUnits] = useState([emptyUnit()]);

    const firstName = (profile?.fullName || user?.displayName || 'there').split(' ')[0];

    /* ── Unit helpers ────────────────────────────────────────────────────── */
    const addUnit = () => setUnits(u => [...u, emptyUnit()]);

    const removeUnit = (id) => {
        if (units.length === 1) return;
        setUnits(u => u.filter(x => x.id !== id));
    };

    const updateUnit = (id, field, value) => {
        setUnits(u => u.map(x => x.id === id ? { ...x, [field]: value } : x));
    };

    /* ── Step 1 → Step 2 ────────────────────────────────────────────────── */
    const handleStep1 = (e) => {
        e.preventDefault();
        if (!building.name.trim()) { toast.error('Please enter a property/building name.'); return; }
        setStep(2);
    };

    /* ── Final submit ───────────────────────────────────────────────────── */
    const handleFinish = async () => {
        // Validate at least one unit has a name
        const validUnits = units.filter(u => u.name.trim());
        if (validUnits.length === 0) { toast.error('Add at least one apartment/unit.'); return; }

        setSaving(true);
        try {
            // Create each unit as a property doc under the building
            for (const unit of validUnits) {
                const docRef = await addProperty(user.uid, {
                    name: unit.name.trim(),
                    address: building.address.trim(),
                    buildingName: building.name.trim(),
                    unitNumber: unit.name.trim(),
                    type: 'Apartment',
                    status: unit.tenantName ? 'occupied' : 'vacant',
                    monthlyRent: parseInt(unit.rent) || 0,
                    rentType: unit.rentType || 'monthly',
                    tenantName: unit.tenantName || '',
                    tenantPhone: '',
                    bedrooms: 0,
                    bathrooms: 0,
                    sqft: 0,
                    floor: '',
                    description: '',
                });
                // Unit saved — no invite code generated here;
                // landlord can send invite links per-unit from the property page.
            }

            toast.success(`${validUnits.length} unit${validUnits.length > 1 ? 's' : ''} added to ${building.name}!`);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    /* ── Skip handler ───────────────────────────────────────────────────── */
    const handleSkip = () => navigate('/dashboard');

    /* ════════════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-dvh bg-cream flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-8"
                >
                    <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center">
                        <KeyRound size={18} className="text-cream" />
                    </div>
                    <div>
                        <p className="font-display text-ink text-lg font-semibold leading-tight">LeaseEase</p>
                        <p className="font-body text-xs text-stone-400">Set up your first property</p>
                    </div>
                </motion.div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 mb-8">
                    {[1, 2].map(s => (
                        <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-stone-200">
                            <motion.div
                                className="h-full bg-sage rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: step >= s ? '100%' : '0%' }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* ══ STEP 1 — Building Info ══════════════════════════════════ */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h1 className="font-display text-ink text-2xl sm:text-3xl font-semibold mb-2">
                                Welcome, <em>{firstName}</em>! 👋
                            </h1>
                            <p className="font-body text-stone-400 text-sm mb-8">
                                Let's add your first property or building to get started.
                            </p>

                            <form onSubmit={handleStep1} className="card p-6 sm:p-8 space-y-5">
                                <div>
                                    <label className="label-xs">Property / Building Name *</label>
                                    <div className="relative">
                                        <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                        <input
                                            className="input-base pl-10"
                                            placeholder="e.g. Sunset Apartments"
                                            value={building.name}
                                            onChange={e => setBuilding(b => ({ ...b, name: e.target.value }))}
                                            autoFocus
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label-xs">Address</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                        <input
                                            className="input-base pl-10"
                                            placeholder="e.g. 42 Marina Road, Lagos"
                                            value={building.address}
                                            onChange={e => setBuilding(b => ({ ...b, address: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button type="submit" className="btn-primary flex-1">
                                        Add Apartments / Units <ArrowRight size={15} />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="w-full text-center font-body text-xs text-stone-400 hover:text-stone-500 transition-colors pt-1"
                                >
                                    Skip for now → go to dashboard
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* ══ STEP 2 — Add Units ═════════════════════════════════════ */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <button
                                    onClick={() => setStep(1)}
                                    className="font-body text-xs text-stone-400 hover:text-ink transition-colors"
                                >
                                    ← Back
                                </button>
                            </div>

                            <h1 className="font-display text-ink text-2xl sm:text-3xl font-semibold mb-1">
                                Add units to <em className="text-sage">{building.name}</em>
                            </h1>
                            <p className="font-body text-stone-400 text-sm mb-6">
                                Add the apartments or units in this building. You can always add more later.
                            </p>

                            <div className="space-y-4">
                                {units.map((unit, idx) => (
                                    <motion.div
                                        key={unit.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        className="card p-5"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="font-body text-xs font-semibold text-stone-400 uppercase tracking-wider">
                                                Unit {idx + 1}
                                            </span>
                                            {units.length > 1 && (
                                                <button
                                                    onClick={() => removeUnit(unit.id)}
                                                    className="p-1.5 rounded-lg text-stone-300 hover:text-rust hover:bg-rust/8 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3">
                                            {/* Unit name */}
                                            <div>
                                                <label className="label-xs">Apartment Number / Name *</label>
                                                <input
                                                    className="input-base"
                                                    placeholder="e.g. Unit 4B, Room 12"
                                                    value={unit.name}
                                                    onChange={e => updateUnit(unit.id, 'name', e.target.value)}
                                                />
                                            </div>

                                            {/* Rent */}
                                            <div>
                                                <label className="label-xs">Rent Amount ({currencySymbol})</label>
                                                <div className="relative">
                                                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                                    <input
                                                        className="input-base pl-9"
                                                        type="number"
                                                        placeholder="e.g. 250000"
                                                        value={unit.rent}
                                                        onChange={e => updateUnit(unit.id, 'rent', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Billing cycle */}
                                            <div>
                                                <label className="label-xs">Billing Cycle</label>
                                                <div className="relative">
                                                    <CalendarClock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                                    <select
                                                        className="input-base pl-9 appearance-none"
                                                        value={unit.rentType}
                                                        onChange={e => updateUnit(unit.id, 'rentType', e.target.value)}
                                                    >
                                                        <option value="monthly">Monthly</option>
                                                        <option value="yearly">Yearly</option>
                                                        <option value="weekly">Weekly</option>
                                                        <option value="daily">Daily</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Tenant name (optional) */}
                                            <div>
                                                <label className="label-xs">
                                                    Tenant Name <span className="text-stone-300 normal-case">(optional)</span>
                                                </label>
                                                <div className="relative">
                                                    <UserPlus size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                                    <input
                                                        className="input-base pl-9"
                                                        placeholder="Skip if unknown"
                                                        value={unit.tenantName}
                                                        onChange={e => updateUnit(unit.id, 'tenantName', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Add another unit */}
                            <button
                                onClick={addUnit}
                                className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-stone-200 hover:border-sage/40 text-stone-400 hover:text-sage font-body text-sm font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add Another Unit
                            </button>

                            {/* Actions */}
                            <div className="flex items-center gap-3 mt-6">
                                <button
                                    onClick={handleFinish}
                                    disabled={saving}
                                    className="btn-primary flex-1 py-3"
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={16} />
                                            Finish Setup
                                        </>
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={handleSkip}
                                className="w-full text-center font-body text-xs text-stone-400 hover:text-stone-500 transition-colors mt-3"
                            >
                                Skip for now → go to dashboard
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

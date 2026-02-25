import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, Plus, Trash2, ArrowRight, ArrowLeft,
    Check, Loader2, Sparkles, LayoutGrid, Wrench, Info,
    Zap, Copy, Eye, Share2, DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addProperty, addUnitsBatch, serverTimestamp } from '../services/firebase';
import toast from 'react-hot-toast';

// ── Constants ────────────────────────────────────────────────
const PROPERTY_TYPES = [
    { id: 'apartment', label: 'Apartment', emoji: '🏢', desc: 'Multi-unit residential building' },
    { id: 'house', label: 'House', emoji: '🏠', desc: 'Standalone residential property' },
    { id: 'duplex', label: 'Duplex', emoji: '🏘️', desc: 'Two-unit residential building' },
    { id: 'commercial', label: 'Commercial', emoji: '🏗️', desc: 'Office or retail space' },
    { id: 'estate', label: 'Estate', emoji: '🏡', desc: 'Gated estate or compound' },
];

const BILLING_CYCLES = [
    { id: 'monthly', label: 'Monthly', desc: 'Charged every month' },
    { id: 'quarterly', label: 'Quarterly', desc: 'Charged every 3 months' },
    { id: 'biannual', label: 'Bi-annual', desc: 'Charged every 6 months' },
    { id: 'yearly', label: 'Yearly', desc: 'Charged once a year' },
];

const CURRENCIES = [
    { code: 'NGN', symbol: '₦', label: 'Nigerian Naira' },
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'GBP', symbol: '£', label: 'British Pound' },
];

const AMENITIES = [
    'Water Supply', 'Electricity', 'Backup Power',
    'Security', 'CCTV', 'Parking',
    'Waste Disposal', 'Internet', 'Pool', 'Gym'
];

const fmt = (n, sym = '₦') => n ? `${sym}${Number(n).toLocaleString()}` : '';

// ── Components ───────────────────────────────────────────────

const StepIndicator = ({ step }) => {
    const steps = ['Details', 'Units', 'Review', 'Finish'];
    return (
        <div className="flex items-center mb-12">
            {steps.map((label, i) => {
                const num = i + 1;
                const done = num < step;
                const active = num === step;
                return (
                    <div key={i} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                        <div className="flex flex-col items-center gap-2">
                            <div className={`
                w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300
                ${done ? 'bg-[#52b788] text-white border-[#52b788]' :
                                    active ? 'bg-[#1a3c2e] text-[#52b788] border-[#52b788]' :
                                        'bg-[#141b1e] text-[#4a5568] border-[#1e2a2e]'}
                border-2
              `}>
                                {done ? <Check size={16} strokeWidth={3} /> : num}
                            </div>
                            <span className={`
                text-[10px] font-bold uppercase tracking-widest whitespace-nowrap
                ${active || done ? 'text-[#52b788]' : 'text-[#4a5568]'}
              `}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`
                flex-1 h-0.5 mx-4 -mt-6 rounded-full transition-all duration-500
                ${done ? 'bg-[#52b788]' : 'bg-[#1e2a2e]'}
              `} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const Field = ({ label, error, hint, children, required }) => (
    <div className="space-y-2">
        <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[#4a5568]">
            {label}
            {required && <span className="text-[#e74c3c]">*</span>}
        </label>
        {children}
        {hint && !error && <p className="text-[11px] text-[#4a5568]">{hint}</p>}
        {error && <p className="text-[11px] text-[#e74c3c]">⚠ {error}</p>}
    </div>
);

// ── Step 1: Property Details ─────────────────────────────────
const Step1 = ({ data, onChange, errors }) => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
        <div className="mb-2">
            <h2 className="text-3xl font-black text-[#e8e4de] tracking-tighter sm:text-4xl">Property Identity.</h2>
            <p className="text-[#8a9ba8] text-sm font-medium mt-2">Define the core essence of your real estate asset.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PROPERTY_TYPES.map(type => (
                <button
                    key={type.id}
                    onClick={() => onChange('type', type.id)}
                    className={`
            p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group
            ${data.type === type.id
                            ? 'bg-[#1a3c2e] border-[#52b788] text-[#52b788]'
                            : 'bg-[#0d1215] border-[#1e2a2e] text-[#4a5568] hover:border-[#1a3c2e]'}
          `}
                >
                    <span className="text-3xl group-hover:scale-110 transition-transform">{type.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
                </button>
            ))}
        </div>

        <div className="space-y-6">
            <Field label="Property Name" required error={errors.name}>
                <div className="relative">
                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#52b788]" />
                    <input
                        className="input-base pl-12 h-14 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] text-[#e8e4de] font-bold"
                        placeholder="e.g. Neo-Marina Residences"
                        value={data.name}
                        onChange={e => onChange('name', e.target.value)}
                    />
                </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field label="City" required error={errors.city}>
                    <input
                        className="input-base h-12 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788]"
                        placeholder="Lagos"
                        value={data.city}
                        onChange={e => onChange('city', e.target.value)}
                    />
                </Field>
                <Field label="State" required error={errors.state}>
                    <input
                        className="input-base h-12 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788]"
                        placeholder="Lagos State"
                        value={data.state}
                        onChange={e => onChange('state', e.target.value)}
                    />
                </Field>
            </div>

            <Field label="Full Address" required error={errors.address}>
                <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#52b788]" />
                    <input
                        className="input-base pl-12 h-12 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788]"
                        placeholder="e.g. 102 Victoria Island, Lagos"
                        value={data.address}
                        onChange={e => onChange('address', e.target.value)}
                    />
                </div>
            </Field>

            <Field label="Amenities" hint="Select features available to all units">
                <div className="flex flex-wrap gap-2">
                    {AMENITIES.map(a => {
                        const sel = data.amenities?.includes(a);
                        return (
                            <button
                                key={a}
                                onClick={() => {
                                    const curr = data.amenities || [];
                                    onChange('amenities', sel ? curr.filter(x => x !== a) : [...curr, a]);
                                }}
                                className={`
                  px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all
                  ${sel ? 'bg-[#1a3c2e] border-[#52b788] text-[#52b788]' : 'bg-[#141b1e] border-[#1e2a2e] text-[#4a5568]'}
                `}
                            >
                                {a}
                            </button>
                        );
                    })}
                </div>
            </Field>
        </div>
    </motion.div>
);

// ── Step 2: Units ────────────────────────────────────────────
const Step2 = ({ units, onAdd, onUpdate, onRemove, errors }) => {
    const totalRevenue = units.reduce((sum, u) => sum + (Number(u.rentAmount) || 0), 0);

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div>
                <h2 className="text-3xl font-black text-[#e8e4de] tracking-tighter sm:text-4xl">Unit vectors.</h2>
                <p className="text-[#8a9ba8] text-sm font-medium mt-2">Initialize the rentable infrastructure within your property.</p>
            </div>

            {units.length > 0 && (
                <div className="grid grid-cols-3 gap-4 p-6 bg-[#0d1215] border border-[#1e2a2e] rounded-3xl">
                    <div>
                        <p className="text-[10px] font-bold text-[#4a5568] uppercase tracking-widest mb-1">UNITS</p>
                        <p className="text-2xl font-black text-[#52b788]">{units.length}</p>
                    </div>
                    <div className="border-l border-[#1e2a2e] pl-4">
                        <p className="text-[10px] font-bold text-[#4a5568] uppercase tracking-widest mb-1">VALUATION</p>
                        <p className="text-2xl font-black text-[#52b788]">₦{(totalRevenue / 1000).toFixed(1)}k</p>
                    </div>
                    <div className="border-l border-[#1e2a2e] pl-4">
                        <p className="text-[10px] font-bold text-[#4a5568] uppercase tracking-widest mb-1">STATUS</p>
                        <p className="text-xs font-bold text-[#f0c040] py-1 px-2 bg-[#f0c040]/10 rounded border border-[#f0c040]/30 inline-block mt-1">PENDING</p>
                    </div>
                </div>
            )}

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                {units.map((unit, idx) => (
                    <div key={unit.id} className="p-6 bg-[#0d1215] border border-[#1e2a2e] rounded-2xl relative group">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-[10px] font-bold text-[#4a5568] uppercase tracking-[0.3em]">VECTOR {idx + 1}</span>
                            <button onClick={() => onRemove(unit.id)} className="text-[#4a5568] hover:text-[#e74c3c] transition-all">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5568]">Unit Designation</label>
                                <input
                                    className="input-base h-11 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] text-sm"
                                    placeholder="e.g. Suite 402"
                                    value={unit.name}
                                    onChange={e => onUpdate(unit.id, 'name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5568]">Monthly Rent (₦)</label>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#52b788]" />
                                    <input
                                        className="input-base h-11 pl-10 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] text-sm"
                                        type="number"
                                        placeholder="250000"
                                        value={unit.rentAmount}
                                        onChange={e => onUpdate(unit.id, 'rentAmount', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={onAdd}
                className="w-full py-4 border-2 border-dashed border-[#1e2a2e] rounded-2xl text-[#4a5568] hover:border-[#52b788] hover:text-[#52b788] transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest"
            >
                <Plus size={18} /> Add Parallel Vector
            </button>

            {errors.units && <p className="text-xs text-[#e74c3c] text-center">⚠ {errors.units}</p>}
        </motion.div>
    );
};

// ── Step 3: Review ───────────────────────────────────────────
const Step3 = ({ property, units }) => {
    const totalRevenue = units.reduce((sum, u) => sum + (Number(u.rentAmount) || 0), 0);
    const type = PROPERTY_TYPES.find(t => t.id === property.type);

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div>
                <h2 className="text-3xl font-black text-[#e8e4de] tracking-tighter sm:text-4xl">Review infrastructure.</h2>
                <p className="text-[#8a9ba8] text-sm font-medium mt-2">Validate your configuration before final deployment.</p>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1a3c2e] to-[#0d1215] border border-[#1e2a2e] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Building2 size={120} />
                </div>

                <div className="relative z-10 space-y-6">
                    <div>
                        <span className="inline-block px-3 py-1 rounded bg-[#52b788]/20 text-[#52b788] text-[9px] font-black uppercase tracking-widest mb-3">
                            {type?.label} · PORTAL READY
                        </span>
                        <h3 className="text-3xl font-black text-[#e8e4de] leading-none">{property.name}</h3>
                        <p className="text-[#8a9ba8] text-xs mt-2 flex items-center gap-2">
                            <MapPin size={12} className="text-[#52b788]" /> {property.address}, {property.city}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-8 pt-6 border-t border-[#ffffff]/10">
                        <div>
                            <p className="text-[9px] font-bold text-[#4a5568] uppercase tracking-widest mb-1">VECTORS</p>
                            <p className="text-xl font-black text-[#e8e4de]">{units.length}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-[#4a5568] uppercase tracking-widest mb-1">VALUATION</p>
                            <p className="text-xl font-black text-[#e8e4de]">₦{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-[#4a5568] uppercase tracking-widest mb-1">AMENITIES</p>
                            <p className="text-xl font-black text-[#e8e4de]">{property.amenities?.length || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {units.slice(0, 3).map((u, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#141b1e] border border-[#1e2a2e] rounded-xl text-xs font-bold text-[#e8e4de]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#52b788]/10 text-[#52b788] flex items-center justify-center font-black">{i + 1}</div>
                            <span>{u.name}</span>
                        </div>
                        <span className="text-[#52b788]">₦{Number(u.rent).toLocaleString()}</span>
                    </div>
                ))}
                {units.length > 3 && (
                    <p className="text-center text-[10px] font-bold text-[#4a5568] uppercase tracking-widest">+ {units.length - 3} more unit vectors</p>
                )}
            </div>

            <div className="p-4 bg-[#f0c040]/5 border border-[#f0c040]/20 rounded-xl flex gap-3 text-xs text-[#f0c040]/80">
                <Info size={16} className="shrink-0" />
                <p>Deployment will generate a unique portal link for digital tenant onboarding.</p>
            </div>
        </motion.div>
    );
};

// ── Step 4: Success ──────────────────────────────────────────
const Step4 = ({ property, portalId }) => {
    const [copied, setCopied] = useState(false);
    const portalLink = `${window.location.origin}/portal/${portalId}`;

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 py-8">
            <div className="relative inline-block">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#1a3c2e] to-[#52b788] flex items-center justify-center shadow-2xl shadow-[#52b788]/20 animate-bounce">
                    <Sparkles size={40} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#f0c040] flex items-center justify-center text-white border-4 border-[#0a0f12]">
                    <Check size={16} strokeWidth={4} />
                </div>
            </div>

            <div>
                <h2 className="text-4xl font-black text-[#e8e4de] tracking-tighter">Mission Success.</h2>
                <p className="text-[#8a9ba8] text-sm font-medium mt-3 max-w-xs mx-auto">
                    <span className="text-[#e8e4de] font-bold">{property.name}</span> infrastructure has been deployed successfully to the LeaseEase network.
                </p>
            </div>

            <div className="p-8 bg-[#0d1215] border border-[#1e2a2e] rounded-[2.5rem] space-y-6">
                <div>
                    <p className="text-[10px] font-bold text-[#4a5568] uppercase tracking-[0.2em] mb-4">Unique Portal Access</p>
                    <div className="p-4 bg-[#141b1e] border border-[#1e2a2e] rounded-2xl flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-[#52b788] truncate">{portalLink}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(portalLink);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="p-2 rounded-xl bg-[#52b788]/10 text-[#52b788] hover:bg-[#52b788]/20 transition-all uppercase text-[9px] font-black tracking-widest flex items-center gap-1"
                        >
                            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button className="h-14 bg-[#141b1e] border border-[#1e2a2e] rounded-2xl text-[10px] font-bold text-[#8a9ba8] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-[#e8e4de] transition-all">
                        <Share2 size={16} /> Share Link
                    </button>
                    <button className="h-14 bg-[#141b1e] border border-[#1e2a2e] rounded-2xl text-[10px] font-bold text-[#8a9ba8] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-[#e8e4de] transition-all">
                        <Eye size={16} /> Preview Portal
                    </button>
                </div>
            </div>

            <div className="pt-4">
                <button
                    onClick={() => window.location.href = '/properties'}
                    className="btn-primary w-full h-16 text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xl shadow-[#1a3c2e]/40"
                >
                    Finalize & Return to Terminal
                </button>
            </div>
        </motion.div>
    );
};

// ── Main Page Component ───────────────────────────────────────
export default function AddPropertyPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [portalId, setPortalId] = useState('');

    const [property, setProperty] = useState({
        type: 'apartment', name: '', city: '', state: '',
        address: '', description: '', amenities: [],
    });

    const [units, setUnits] = useState([
        { id: crypto.randomUUID(), name: '', rentAmount: '', status: 'vacant' }
    ]);

    const handleUpdateProperty = (k, v) => setProperty(p => ({ ...p, [k]: v }));

    const handleAddUnit = () => setUnits(u => [...u, { id: crypto.randomUUID(), name: '', rentAmount: '', status: 'vacant' }]);

    const handleUpdateUnit = (id, k, v) => setUnits(u => u.map(x => x.id === id ? { ...x, [k]: v } : x));

    const handleRemoveUnit = id => {
        if (units.length === 1) return;
        setUnits(u => u.filter(x => x.id !== id));
    };

    const validate = () => {
        const e = {};
        if (step === 1) {
            if (!property.name.trim()) e.name = "Enter a designation.";
            if (!property.city.trim()) e.city = "City required.";
            if (!property.state.trim()) e.state = "State required.";
            if (!property.address.trim()) e.address = "Geo-vector required.";
        }
        if (step === 2) {
            const empty = units.some(u => !u.name.trim() || !u.rent);
            if (empty) e.units = "Fill all unit vector fields.";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = async () => {
        if (!validate()) return;
        if (step < 3) {
            setStep(s => s + 1);
        } else {
            setLoading(true);
            try {
                // Create Property
                const propRef = await addProperty(user.uid, {
                    ...property,
                    status: 'active',
                    totalUnits: units.length,
                });

                // Add Units
                const unitNames = units.map(u => u.name);
                // We'll use a modified version of addUnitsBatch or loop through
                for (const unit of units) {
                    await addUnitsBatch(user.uid, propRef.id, [unit.name], {
                        rentAmount: Number(unit.rentAmount),
                        status: 'vacant',
                        currency: 'NGN'
                    });
                }

                setPortalId(propRef.id);
                setStep(4);
                toast.success("Infrastructure deployed.");
            } catch (err) {
                console.error(err);
                toast.error("Deployment failure.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f12] flex flex-col xl:flex-row overflow-hidden">
            {/* Left Navigation Path */}
            <div className="flex-1 max-w-2xl px-8 py-12 sm:px-12 overflow-y-auto no-scrollbar border-r border-[#1e2a2e]">
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center">
                            <LayoutGrid size={22} className="text-[#e8e4de]" />
                        </div>
                        <span className="font-display text-lg font-black text-[#e8e4de] tracking-tighter">LeaseEase</span>
                    </div>
                    <button onClick={() => navigate('/properties')} className="text-[10px] font-bold text-[#4a5568] hover:text-[#e8e4de] transition-all uppercase tracking-widest">
                        Abandon Session
                    </button>
                </div>

                {step < 4 && <StepIndicator step={step} />}

                <AnimatePresence mode="wait">
                    {step === 1 && <Step1 data={property} onChange={handleUpdateProperty} errors={errors} />}
                    {step === 2 && <Step2 units={units} onAdd={handleAddUnit} onUpdate={handleUpdateUnit} onRemove={handleRemoveUnit} errors={errors} />}
                    {step === 3 && <Step3 property={property} units={units} />}
                    {step === 4 && <Step4 property={property} portalId={portalId} />}
                </AnimatePresence>

                {step < 4 && (
                    <div className="flex gap-4 mt-12 pt-8 border-t border-[#1e2a2e]">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-3 px-8 h-14 bg-[#141b1e] border border-[#1e2a2e] rounded-2xl text-[11px] font-bold text-[#4a5568] hover:text-[#e8e4de] hover:border-[#52b788] transition-all uppercase tracking-widest"
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-4 h-16 bg-gradient-to-r from-[#1a3c2e] to-[#2d6a4f] rounded-2xl text-[11px] font-bold text-[#52b788] hover:shadow-2xl hover:shadow-[#1a3c2e]/40 transition-all uppercase tracking-[0.2em]"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    {step === 3 ? "Initialize Deployment" : "Continue Sequence"}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Right Intelligence Preview (Dashboard Simulation) */}
            <div className="hidden xl:flex flex-1 flex-col p-12 bg-[#070b0d] sticky top-0 h-screen overflow-hidden">
                <div className="mb-8">
                    <p className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.3em]">Neural Preview System</p>
                </div>

                <div className="flex-1 bg-[#0a0f12] rounded-[3rem] border border-[#1e2a2e] shadow-2xl relative overflow-hidden flex flex-col">
                    {/* Mock Portal Header */}
                    <div className="bg-gradient-to-br from-[#1a3c2e] to-[#0d1215] p-8 sm:p-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-[#0a0f12] flex items-center justify-center text-3xl">
                                {PROPERTY_TYPES.find(t => t.id === property.type)?.emoji || '🏠'}
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-[#52b788]/60 tracking-widest uppercase">Gravlo Portal · v2.4</span>
                                <h4 className="text-xl font-black text-[#e8e4de] leading-none mt-1">
                                    {property.name || 'Core Asset Identity'}
                                </h4>
                            </div>
                        </div>
                        <p className="text-[#8a9ba8] text-xs flex items-center gap-2">
                            <MapPin size={12} className="text-[#52b788]" />
                            {property.address && property.city ? `${property.address}, ${property.city}` : 'No global coordinates set.'}
                        </p>
                    </div>

                    {/* Preview Content */}
                    <div className="p-8 sm:p-10 space-y-8 flex-1 overflow-y-auto no-scrollbar">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#4a5568] uppercase tracking-[0.2em]">Available Infrastructure</span>
                                <span className="text-[10px] font-bold text-[#52b788] px-2 py-0.5 bg-[#52b788]/10 rounded border border-[#52b788]/30">VACANT</span>
                            </div>

                            {units.length === 0 || !units[0].name ? (
                                <div className="p-10 border-2 border-dashed border-[#1e2a2e] rounded-3xl text-center">
                                    <p className="text-xs text-[#4a5568] italic font-medium">Add parallel unit vectors to visualize asset structure.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {units.map((u, i) => (
                                        <div key={i} className="p-5 bg-[#0d1215] border border-[#1e2a2e] rounded-3xl flex items-center justify-between group hover:border-[#1a3c2e] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#e8e4de] font-black text-sm group-hover:bg-[#1a3c2e] group-hover:text-[#52b788] group-hover:border-[#52b788] transition-all">
                                                    {i + 1}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-[#e8e4de] leading-none">{u.name || 'Unnamed Vector'}</p>
                                                    <p className="text-[10px] font-bold text-[#4a5568] uppercase tracking-widest">Optimized Residency</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-black text-[#52b788]">₦{Number(u.rent || 0).toLocaleString()}</p>
                                                <p className="text-[9px] font-bold text-[#4a5568] uppercase tracking-widest">Monthly Cycle</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {property.amenities?.length > 0 && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-[#4a5568] uppercase tracking-[0.2em]">Asset Attributes</p>
                                <div className="flex flex-wrap gap-2">
                                    {property.amenities.map(a => (
                                        <span key={a} className="px-3 py-1.5 rounded-lg bg-[#141b1e] border border-[#1e2a2e] text-[#52b788] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-[#52b788]" />
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Call to Action Mock */}
                    <div className="p-8 bg-[#0d1215] border-t border-[#1e2a2e]">
                        <div className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center text-[10px] font-black text-[#52b788] uppercase tracking-[0.3em] opacity-50 cursor-not-allowed">
                            Request Onboarding
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

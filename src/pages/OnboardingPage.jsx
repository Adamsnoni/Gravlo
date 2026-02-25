// src/pages/OnboardingPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, Plus, Trash2, ArrowRight,
    KeyRound, DollarSign, CalendarClock, UserPlus, Check, Loader2, Home, Hash, Zap, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { addProperty, updateUserProfile } from '../services/firebase';
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
    const [building, setBuilding] = useState({ name: '', address: '' });
    const [units, setUnits] = useState([emptyUnit()]);

    const firstName = (profile?.fullName || user?.displayName || 'there').split(' ')[0];

    const addUnit = () => setUnits(u => [...u, emptyUnit()]);
    const removeUnit = (id) => {
        if (units.length === 1) return;
        setUnits(u => u.filter(x => x.id !== id));
    };
    const updateUnit = (id, field, value) => {
        setUnits(u => u.map(x => x.id === id ? { ...x, [field]: value } : x));
    };

    const handleStep1 = (e) => {
        e.preventDefault();
        if (!building.name.trim()) { toast.error('Enter a property designation.'); return; }
        setStep(2);
    };

    const handleFinish = async () => {
        const validUnits = units.filter(u => u.name.trim());
        if (validUnits.length === 0) { toast.error('Initialize at least one unit vector.'); return; }

        setSaving(true);
        try {
            for (const unit of validUnits) {
                await addProperty(user.uid, {
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
            }
            toast.success(`Infrastructure deployed to ${building.name}!`);
            await updateUserProfile(user.uid, { onboardingComplete: true });
            navigate('/dashboard');
        } catch (err) {
            toast.error('Deployment failure. Retry sequence.');
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = async () => {
        setSaving(true);
        try {
            await updateUserProfile(user.uid, { onboardingComplete: true });
            navigate('/dashboard');
        } catch (err) {
            toast.error('Logic failure. Retry bypass.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070b0d] flex items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-2xl">
                {/* Brand Header */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center shadow-xl shadow-[#1a3c2e]/20">
                        <KeyRound size={24} className="text-[#e8e4de]" />
                    </div>
                    <div>
                        <h1 className="font-display text-[#e8e4de] text-2xl font-bold tracking-tight">LeaseEase</h1>
                        <p className="font-body text-[#4a5568] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Deployment Wizard</p>
                    </div>
                </motion.div>

                {/* Evolution Progress */}
                <div className="flex gap-2 mb-12">
                    {[1, 2].map(s => (
                        <div key={s} className="flex-1 h-1 rounded-full bg-[#141b1e] overflow-hidden">
                            <motion.div
                                className="h-full bg-[#52b788]"
                                initial={{ width: '0%' }}
                                animate={{ width: step >= s ? '100%' : '0%' }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            />
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <div>
                                <h2 className="font-display text-[#e8e4de] text-4xl sm:text-5xl font-bold tracking-tighter leading-none mb-4">
                                    Initiate,<br /><span className="text-[#52b788]">{firstName}</span>.
                                </h2>
                                <p className="font-body text-[#8a9ba8] text-sm font-medium max-w-md">Let's define your primary property designation to calibrate your control center.</p>
                            </div>

                            <form onSubmit={handleStep1} className="card p-8 sm:p-10 bg-[#0d1215] border-[#1e2a2e] space-y-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-[#52b788]/5 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none" />

                                <div className="space-y-2 relative">
                                    <label className="font-body text-[10px] font-bold uppercase tracking-widest text-[#4a5568] px-1">Property Identification</label>
                                    <div className="relative">
                                        <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#52b788] pointer-events-none" />
                                        <input className="input-base pl-12 h-14 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] transition-all font-bold tracking-tight text-[#e8e4de]" placeholder="e.g. Neo-Marina Residences" value={building.name} onChange={e => setBuilding(b => ({ ...b, name: e.target.value }))} autoFocus required />
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="font-body text-[10px] font-bold uppercase tracking-widest text-[#4a5568] px-1">Geographic Vector</label>
                                    <div className="relative">
                                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#52b788] pointer-events-none" />
                                        <input className="input-base pl-12 h-14 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] transition-all text-[#e8e4de]" placeholder="e.g. 102 Victoria Island, Lagos" value={building.address} onChange={e => setBuilding(b => ({ ...b, address: e.target.value }))} />
                                    </div>
                                </div>

                                <button type="submit" className="btn-primary w-full h-14 text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-[#1a3c2e]/30 group">
                                    Configure Unit Vectors <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button type="button" onClick={handleSkip} disabled={saving} className="w-full text-center font-body text-[10px] font-bold text-[#4a5568] uppercase tracking-widest hover:text-[#e8e4de] transition-all pt-2">
                                    Bypass Wizard → Portal Access
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setStep(1)} className="w-10 h-10 rounded-xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#4a5568] hover:text-[#e8e4de] transition-all"><ArrowLeft size={18} /></button>
                                <div>
                                    <h2 className="font-display text-[#e8e4de] text-3xl font-bold tracking-tighter">Unit Deployment</h2>
                                    <p className="font-body text-[#4a5568] text-xs font-bold uppercase tracking-widest mt-0.5">Establishing infrastructure for {building.name}</p>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
                                {units.map((unit, idx) => (
                                    <div key={unit.id} className="card p-6 bg-[#0d1215] border-[#1e2a2e] relative overflow-hidden group">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-[#52b788]/10 text-[#52b788]"><Hash size={14} /></div>
                                                <span className="font-body text-[10px] font-bold text-[#4a5568] uppercase tracking-widest">Vector {idx + 1}</span>
                                            </div>
                                            {units.length > 1 && (
                                                <button onClick={() => removeUnit(unit.id)} className="w-8 h-8 rounded-lg bg-[#2d1a1a]/5 text-[#4a5568] hover:text-[#e74c3c] hover:bg-[#2d1a1a]/20 transition-all flex items-center justify-center"><Trash2 size={14} /></button>
                                            )}
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="font-body text-[9px] font-bold uppercase tracking-widest text-[#4a5568] px-1">Designation</label>
                                                <input className="input-base h-11 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] text-sm" placeholder="e.g. Suite 402" value={unit.name} onChange={e => updateUnit(unit.id, 'name', e.target.value)} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="font-body text-[9px] font-bold uppercase tracking-widest text-[#4a5568] px-1">Rent ({currencySymbol})</label>
                                                <div className="relative">
                                                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#52b788]" />
                                                    <input className="input-base h-11 pl-10 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] text-sm" type="number" placeholder="250000" value={unit.rent} onChange={e => updateUnit(unit.id, 'rent', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="font-body text-[9px] font-bold uppercase tracking-widest text-[#4a5568] px-1">Cycle</label>
                                                <div className="relative">
                                                    <CalendarClock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#52b788]" />
                                                    <select className="input-base h-11 pl-10 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] appearance-none text-sm font-bold" value={unit.rentType} onChange={e => updateUnit(unit.id, 'rentType', e.target.value)}>
                                                        <option value="monthly">Monthly</option>
                                                        <option value="yearly">Yearly</option>
                                                        <option value="weekly">Weekly</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="font-body text-[9px] font-bold uppercase tracking-widest text-[#4a5568] px-1 opacity-50">Residency Status</label>
                                                <div className="input-base h-11 bg-[#141b1e]/50 border-transparent text-[#4a5568] italic text-xs flex items-center">Auto-Vacant · Invite links enabled</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={addUnit} className="w-full h-14 rounded-2xl border-2 border-dashed border-[#1e2a2e] hover:border-[#1a3c2e] hover:bg-[#1a3c2e]/5 text-[#4a5568] hover:text-[#52b788] transition-all flex items-center justify-center gap-3 font-body text-[10px] font-bold uppercase tracking-widest">
                                <Plus size={18} /> Add Parallel Vector
                            </button>

                            <div className="space-y-4 pt-4">
                                <button onClick={handleFinish} disabled={saving} className="btn-primary w-full h-16 text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xl shadow-[#1a3c2e]/40 group flex items-center justify-center gap-4">
                                    {saving ? <Loader2 size={18} className="animate-spin text-[#1a3c2e]" /> : <><Sparkles size={18} /> Finalize Infrastructure</>}
                                </button>
                                <button onClick={handleSkip} disabled={saving} className="w-full text-center font-body text-[10px] font-bold text-[#4a5568] uppercase tracking-widest hover:text-[#e8e4de] transition-all">
                                    Skip Deployment → Portal Home
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// src/pages/AcceptInvitePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    KeyRound, Home, Check, ArrowRight, ArrowLeft,
    Loader2, AlertTriangle, Clock, UserX, Building2, MapPin, Hash, CheckCircle2, Star, PartyPopper, AtSign, ShieldCheck
} from 'lucide-react';
import { fetchInviteToken, acceptInviteToken } from '../services/inviteTokens';
import { getVacantUnits, requestUnitApproval, registerUser } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AcceptInvitePage() {
    const { token } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [inviteData, setInviteData] = useState(null);
    const [vacantUnits, setVacantUnits] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [errors, setErrors] = useState({});
    const [animDir, setAnimDir] = useState('forward');

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                fullName: user.displayName || '',
                email: user.email || '',
            }));
        }
    }, [user]);

    useEffect(() => {
        const init = async () => {
            try {
                const { data, valid, reason } = await fetchInviteToken(token);
                if (!valid) {
                    setInviteData({ reason });
                    setStep(-2); // Error state
                    return;
                }
                setInviteData(data);
                if (data.unitId) {
                    setSelectedUnit({ id: data.unitId, name: data.unitName, symbol: '₦' });
                    setStep(1);
                } else {
                    setStep(0);
                    setLoadingUnits(true);
                    const units = await getVacantUnits(data.landlordUid, data.propertyId);
                    setVacantUnits(units);
                    setLoadingUnits(false);
                }
            } catch (err) {
                setInviteData({ reason: 'error' });
                setStep(-2);
            }
        };
        init();
    }, [token]);

    const onChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const validate = () => {
        const e = {};
        if (step === 0 && !selectedUnit) e.unit = 'Please select a unit';
        if (step === 1 && !user) {
            if (!form.fullName.trim()) e.fullName = 'Full name is required';
            if (!form.email.includes('@')) e.email = 'Enter a valid email';
            if (!form.phone.trim()) e.phone = 'Phone number is required';
            if (form.password.length < 8) e.password = 'At least 8 characters';
            if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = async () => {
        if (!validate()) return;
        setAnimDir('forward');

        if (step === 1 && !user) {
            setLoading(true);
            try {
                await registerUser({
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    role: 'tenant',
                    countryCode: 'NG',
                });
                toast.success('Account created!');
                setStep(2);
            } catch (err) {
                toast.error(err.message || 'Registration failed.');
                setErrors({ email: err.message });
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step < 2) {
            setStep((s) => s + 1);
        } else {
            setLoading(true);
            try {
                if (!inviteData.unitId) {
                    await requestUnitApproval(inviteData.landlordUid, inviteData.propertyId, selectedUnit.id, user);
                } else {
                    await acceptInviteToken(token, user);
                }
                setStep(3);
            } catch (err) {
                toast.error(err.message || 'Submission failed.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        setAnimDir('back');
        if (step > 0) setStep((s) => s - 1);
    };

    // ── Status Screens ─────────────────────────────────────────────
    if (step === -1) return (
        <div className="min-h-screen bg-[#070b0d] flex items-center justify-center p-6">
            <div className="flex flex-col items-center">
                <Loader2 size={40} className="text-[#52b788] animate-spin mb-6" />
                <p className="font-body text-[#4a5568] text-[10px] font-bold uppercase tracking-[0.2em]">Verifying Security Token...</p>
            </div>
        </div>
    );

    if (step === -2) {
        const r = inviteData?.reason;
        return (
            <div className="min-h-screen bg-[#070b0d] flex items-center justify-center p-6 text-center">
                <CardWrapper noAccent>
                    <div className="w-20 h-20 rounded-[2rem] bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center mx-auto mb-8 text-[#e74c3c]">
                        <AlertTriangle size={36} />
                    </div>
                    <h2 className="font-display text-[#e8e4de] text-2xl font-bold tracking-tight mb-3">Access Denied</h2>
                    <p className="font-body text-[#8a9ba8] text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                        {r === 'already_used' ? "This invite token has already been fulfilled and integrated into a portfolio." :
                            r === 'expired' ? "This security token has expired. Request a new synchronization key from management." :
                                r === 'unit_occupied' ? "The target unit has already been colonized by another tenant." :
                                    "This invite link is invalid, malformed, or has been revoked by the issuer."}
                    </p>
                    <Link to="/login" className="btn-primary w-full h-14 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        Return to Portal <ArrowRight size={16} />
                    </Link>
                </CardWrapper>
            </div>
        );
    }

    const STEPS = ['Unit Vector', 'Identity', 'Sync Review'];
    const currentTotalSteps = inviteData?.unitId ? 2 : 3;

    return (
        <div className="min-h-screen bg-[#070b0d] flex items-center justify-center p-6">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: animDir === 'forward' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: animDir === 'forward' ? -20 : 20 }}
                    className="w-full max-w-lg"
                >
                    <CardWrapper>
                        {/* Progress */}
                        {step < 3 && (
                            <div className="mb-12">
                                <div className="flex gap-2 mb-4">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#52b788]' : 'bg-[#1e2a2e]'} ${inviteData?.unitId && i === 0 ? 'hidden' : ''}`} />
                                    ))}
                                </div>
                                <div className="flex justify-between">
                                    {STEPS.map((label, i) => (
                                        <span key={label} className={`font-body text-[9px] font-bold uppercase tracking-widest transition-colors ${i <= step ? 'text-[#52b788]' : 'text-[#4a5568]'} ${inviteData?.unitId && i === 0 ? 'hidden' : ''}`}>{label}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 0 && <ScreenUnit data={inviteData} vacantUnits={vacantUnits} loading={loadingUnits} selected={selectedUnit} onSelect={setSelectedUnit} />}
                        {step === 1 && <ScreenAccount data={form} onChange={onChange} errors={errors} selected={selectedUnit} user={user} />}
                        {step === 2 && <ScreenConfirm data={form} selected={selectedUnit} inviteData={inviteData} user={user} />}
                        {step === 3 && <ScreenSuccess name={form.fullName} unitName={selectedUnit?.name} propertyName={inviteData?.propertyName} onDone={() => navigate('/tenant')} />}

                        {/* Actions */}
                        {step < 3 && (
                            <div className="flex items-center gap-4 mt-12 pt-8 border-t border-[#1e2a2e]">
                                {(step > 0 && !(inviteData?.unitId && step === 1)) ? (
                                    <button onClick={handleBack} className="btn-secondary h-12 px-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-[#1e2a2e] bg-transparent">
                                        <ArrowLeft size={14} /> Back
                                    </button>
                                ) : <div className="flex-1" />}
                                <button
                                    onClick={handleNext}
                                    disabled={loading || (step === 0 && !selectedUnit)}
                                    className="btn-primary h-12 flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-[#1a3c2e]/20"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : (
                                        <> {step === 2 ? 'Finalize Synchronization' : 'Proceed'} <ArrowRight size={14} /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </CardWrapper>

                    {/* Footer link */}
                    {step === 0 && !user && (
                        <p className="text-center mt-8 font-body text-xs text-[#4a5568] font-medium">
                            Already authenticated? <Link to="/login" className="text-[#52b788] hover:underline font-bold">Sign In</Link>
                        </p>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ── Sub-Screens ───────────────────────────────────────────────

function ScreenUnit({ data, vacantUnits, loading, selected, onSelect }) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-[#e8e4de] text-3xl font-bold tracking-tight mb-2">Target Residency</h1>
                <p className="font-body text-[#8a9ba8] text-sm font-medium">Select your designated unit at {data?.propertyName}.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141b1e]/50 border border-[#1e2a2e] flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-[#0d1215] border border-[#1e2a2e] flex items-center justify-center text-[#52b788]">
                    <Building2 size={24} />
                </div>
                <div>
                    <p className="font-display text-[#e8e4de] text-xl font-bold tracking-tight leading-none mb-1">{data?.propertyName}</p>
                    <p className="font-body text-[10px] text-[#4a5568] uppercase font-bold tracking-widest">{data?.address || 'Verified Hub'}</p>
                </div>
            </div>

            <div className="space-y-3 pt-4">
                <p className="font-body text-[10px] text-[#4a5568] uppercase font-bold tracking-widest">Available Vectors · {vacantUnits.length}</p>
                {loading ? (
                    <div className="grid gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-[#141b1e]/30 animate-pulse border border-[#1e2a2e]" />)}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {vacantUnits.map(unit => {
                            const isSelected = selected?.id === unit.id;
                            return (
                                <button
                                    key={unit.id}
                                    onClick={() => onSelect(unit)}
                                    className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${isSelected ? 'bg-[#1a3c2e]/20 border-[#52b788] shadow-lg shadow-[#1a3c2e]/10' : 'bg-[#0d1215] border-[#1e2a2e] hover:border-[#1a3c2e]'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-[#52b788] text-[#1a3c2e]' : 'bg-[#141b1e] text-[#4a5568]'}`}>
                                            {isSelected ? <Check size={16} /> : (unit.name?.match(/\d+/)?.[0] || <Home size={16} />)}
                                        </div>
                                        <div>
                                            <p className="font-body font-bold text-[#e8e4de] text-sm tracking-tight">{unit.name}</p>
                                            <p className="font-body text-[10px] text-[#4a5568] uppercase font-bold tracking-widest">{unit.floor || 'Level 1'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-display font-bold text-base ${isSelected ? 'text-[#52b788]' : 'text-[#e8e4de]'}`}>₦{unit.rentAmount?.toLocaleString()}</p>
                                        <p className="font-body text-[9px] text-[#4a5568] uppercase font-bold">/ cycle</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function ScreenAccount({ data, onChange, errors, selected, user }) {
    const [showPw, setShowPw] = useState(false);
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-[#e8e4de] text-3xl font-bold tracking-tight mb-2">{user ? 'Confirm Identity' : 'Identity Protocol'}</h1>
                <p className="font-body text-[#8a9ba8] text-sm font-medium">{user ? 'Verify your persistent credentials.' : 'Establish your secure tenant profile.'}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#1a3c2e]/10 border border-[#2d6a4f]/20 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#0d1215] flex items-center justify-center text-[#52b788]">
                    <Home size={18} />
                </div>
                <div>
                    <p className="font-body text-[10px] text-[#4a5568] uppercase font-bold tracking-widest">Selected Residency</p>
                    <p className="font-body text-sm text-[#e8e4de] font-bold tracking-tight">{selected?.name} · {selected?.floor || 'Ground Level'}</p>
                </div>
            </div>

            {user ? (
                <div className="p-8 rounded-2xl bg-[#141b1e]/50 border border-[#1e2a2e] text-center">
                    <div className="w-16 h-16 rounded-full bg-[#1a3c2e] flex items-center justify-center mx-auto mb-4 border border-[#2d6a4f]/30 text-[#52b788]">
                        <ShieldCheck size={32} />
                    </div>
                    <p className="font-body text-[#e8e4de] font-bold">Authenticated as</p>
                    <p className="font-body text-sm text-[#4a5568] mt-1">{user.email}</p>
                </div>
            ) : (
                <div className="space-y-5">
                    <div>
                        <label className="label-xs mb-2 block font-bold text-[#4a5568] tracking-widest">Legal Full Name</label>
                        <input className="input-base bg-[#0d1215] border-[#1e2a2e] focus:border-[#52b788]" placeholder="e.g. Tunde Bello" value={data.fullName} onChange={e => onChange('fullName', e.target.value)} />
                        {errors.fullName && <p className="text-[#e74c3c] text-[10px] mt-1 font-bold">{errors.fullName}</p>}
                    </div>
                    <div>
                        <label className="label-xs mb-2 block font-bold text-[#4a5568] tracking-widest">Authorization Email</label>
                        <div className="relative">
                            <AtSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568]" />
                            <input className="input-base pl-12 bg-[#0d1215] border-[#1e2a2e] focus:border-[#52b788]" type="email" placeholder="email@example.com" value={data.email} onChange={e => onChange('email', e.target.value)} />
                        </div>
                        {errors.email && <p className="text-[#e74c3c] text-[10px] mt-1 font-bold">{errors.email}</p>}
                    </div>
                    <div>
                        <label className="label-xs mb-2 block font-bold text-[#4a5568] tracking-widest">Mobile String</label>
                        <input className="input-base bg-[#0d1215] border-[#1e2a2e] focus:border-[#52b788]" type="tel" placeholder="+234..." value={data.phone} onChange={e => onChange('phone', e.target.value)} />
                        {errors.phone && <p className="text-[#e74c3c] text-[10px] mt-1 font-bold">{errors.phone}</p>}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-xs mb-2 block font-bold text-[#4a5568] tracking-widest">Master Key</label>
                            <input className="input-base bg-[#0d1215] border-[#1e2a2e] focus:border-[#52b788]" type="password" placeholder="••••••••" value={data.password} onChange={e => onChange('password', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-xs mb-2 block font-bold text-[#4a5568] tracking-widest">Verify Key</label>
                            <input className="input-base bg-[#0d1215] border-[#1e2a2e] focus:border-[#52b788]" type="password" placeholder="••••••••" value={data.confirmPassword} onChange={e => onChange('confirmPassword', e.target.value)} />
                        </div>
                    </div>
                    {(errors.password || errors.confirmPassword) && <p className="text-[#e74c3c] text-[10px] font-bold text-center">{errors.password || errors.confirmPassword}</p>}
                </div>
            )}
        </div>
    );
}

function ScreenConfirm({ data, selected, inviteData, user }) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-[#e8e4de] text-3xl font-bold tracking-tight mb-2">Synchronization</h1>
                <p className="font-body text-[#8a9ba8] text-sm font-medium">Verify the residency vector before deployment.</p>
            </div>

            <div className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e] shadow-2xl">
                <div className="bg-gradient-to-r from-[#141b1e] to-[#0a0f12] p-8 border-b border-[#1e2a2e]">
                    <p className="font-body text-[10px] text-[#52b788] font-bold uppercase tracking-widest mb-2">Target Property</p>
                    <h3 className="font-display text-[#e8e4de] text-2xl font-bold tracking-tight">{inviteData?.propertyName}</h3>
                </div>
                <div className="divide-y divide-[#1e2a2e]/50">
                    <Row label="Assigned Unit" value={selected?.name} />
                    <Row label="Fulfillment Magnitude" value={`₦${selected?.rentAmount?.toLocaleString()} / cycle`} highlight />
                    <Row label="Primary Identity" value={data.fullName || user?.displayName} />
                    <Row label="Secure Contact" value={data.email || user?.email} />
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#1a3c2e]/10 border border-[#2d6a4f]/20 space-y-4">
                <p className="font-body text-[10px] text-[#4a5568] uppercase font-bold tracking-widest">Platform Integration Sequence</p>
                {[
                    'Encryption of request payload',
                    'Asynchronous landlord notification',
                    'Residency permission handshake',
                    'Full ledger initialization',
                ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md bg-[#52b788] text-[#1a3c2e] flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                        <p className="font-body text-xs text-[#8a9ba8] font-medium">{s}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ScreenSuccess({ name, unitName, propertyName, onDone }) {
    const canvasRef = React.useRef(null);
    useEffect(() => {
        if (!canvasRef.current) return;
        const myConfetti = confetti.create(canvasRef.current, { resize: true });
        myConfetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }, []);

    return (
        <div className="text-center py-6">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            <div className="relative">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-[#1a3c2e]/40 transform rotate-3">
                    <CheckCircle2 size={48} className="text-[#e8e4de]" />
                </div>
                <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tighter mb-4 leading-none">Record Dispatched.</h1>
                <p className="font-body text-[#8a9ba8] text-base font-medium max-w-xs mx-auto mb-10 leading-relaxed">
                    Your join request for <span className="text-[#e8e4de] font-bold">{unitName}</span> has been synchronized with management systems.
                </p>

                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#1a3c2e]/20 border border-[#2d6a4f]/30 text-[#52b788] mb-12">
                    <div className="w-2 h-2 rounded-full bg-[#52b788] animate-pulse" />
                    <span className="font-body text-[10px] font-bold uppercase tracking-widest">Awaiting Admin Signature</span>
                </div>

                <button onClick={onDone} className="btn-primary w-full h-16 rounded-[2rem] text-xs font-bold uppercase tracking-[0.2em] shadow-2xl shadow-[#1a3c2e]/40 flex items-center justify-center gap-3">
                    Access Tenant Portal <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}

// ── Shared Helpers ─────────────────────────────────────────────

function CardWrapper({ children, noAccent }) {
    return (
        <div className="bg-[#0d1215] rounded-[2.5rem] border border-[#1e2a2e] p-10 md:p-14 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
            {!noAccent && (
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#1a3c2e] via-[#52b788] to-[#1a3c2e]" />
            )}
            {/* Header / Brand */}
            {true && (
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center p-2">
                        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.9" /><polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.6" /></svg>
                    </div>
                    <div>
                        <span className="font-display font-bold text-[#e8e4de] text-xl tracking-tight">LeaseEase</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-body text-[9px] font-black text-[#52b788] uppercase tracking-[0.2em]">Deployment Wizard</span>
                        </div>
                    </div>
                </div>
            )}
            {children}
        </div>
    );
}

function Row({ label, value, highlight }) {
    return (
        <div className="flex items-center justify-between p-5 group hover:bg-[#141b1e]/30 transition-colors">
            <span className="font-body text-[10px] text-[#4a5568] uppercase font-bold tracking-widest">{label}</span>
            <span className={`font-body text-sm font-bold tracking-tight ${highlight ? 'text-[#52b788]' : 'text-[#e8e4de]'}`}>{value}</span>
        </div>
    );
}

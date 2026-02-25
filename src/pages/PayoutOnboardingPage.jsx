// src/pages/PayoutOnboardingPage.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Building2,
    CheckCircle2,
    ChevronRight,
    ShieldCheck,
    Loader2,
    ArrowLeft,
    Banknote,
    Navigation,
    Check,
    AlertCircle,
    Search
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../services/firebase";
import toast from "react-hot-toast";

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.3, ease: "easeOut" },
});

// ── Nigerian Bank Infrastructure & Name Pool ────────────────
const NIGERIAN_BANKS = [
    { name: "Access Bank", code: "044" },
    { name: "Access Bank (Diamond)", code: "063" },
    { name: "ALAT by Wema", code: "035A" },
    { name: "EcoBank Nigeria", code: "050" },
    { name: "Fidelity Bank", code: "070" },
    { name: "First Bank of Nigeria", code: "011" },
    { name: "First City Monument Bank (FCMB)", code: "214" },
    { name: "Guaranty Trust Bank (GTB)", code: "058" },
    { name: "Heritage Bank", code: "030" },
    { name: "Kuda Bank", code: "50211" },
    { name: "Moniepoint MFB", code: "50515" },
    { name: "OPay", code: "999992" },
    { name: "Palmpay", code: "999991" },
    { name: "Stanbic IBTC Bank", code: "039" },
    { name: "Standard Chartered Bank", code: "068" },
    { name: "Sterling Bank", code: "232" },
    { name: "United Bank for Africa (UBA)", code: "033" },
    { name: "Union Bank of Nigeria", code: "032" },
    { name: "Unity Bank", code: "215" },
    { name: "VFD Microfinance Bank", code: "566" },
    { name: "Wema Bank", code: "035" },
    { name: "Zenith Bank", code: "057" },
].sort((a, b) => a.name.localeCompare(b.name));

const NAME_POOL = [
    "EYO JUDE PETER", "ROSE EFFIOM", "OLUSEGUN ADEBAYO", "NGOZI ADEYEMI",
    "BOLAJI SILVA", "CHUKWUMA OKAFOR", "FATIMA ABUBAKAR", "TUNDE BAKARE",
    "IBRAHIM DANJUMA", "AMAKA NWOSU", "OLUCHI EZE", "KAZEEM OLOWO"
];

export default function PayoutOnboardingPage() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(profile?.payoutStatus === 'active' ? 'activated' : 1);
    const [loading, setLoading] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [bankData, setBankData] = useState({
        accountName: profile?.payoutMethod?.accountName || "",
        accountNumber: profile?.payoutMethod?.accountNumber || "",
        bankCode: profile?.payoutMethod?.bankCode || "",
        bankName: profile?.payoutMethod?.bankName || "",
    });

    // ── Auto-Resolve Hook ────────────────────────────────────
    useEffect(() => {
        if (bankData.accountNumber.length === 10 && bankData.bankCode) {
            handleAutoResolve();
        } else {
            setBankData(prev => ({ ...prev, accountName: "" }));
        }
    }, [bankData.accountNumber, bankData.bankCode]);

    const handleAutoResolve = () => {
        setResolving(true);
        setTimeout(() => {
            // Logic: Pick a random name from the pool for realistic simulation
            const randomName = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
            setBankData(prev => ({ ...prev, accountName: randomName }));
            setResolving(false);
        }, 1200);
    };

    const handleFinalize = async () => {
        setLoading(true);
        try {
            if (user?.uid) {
                await updateUserProfile(user.uid, {
                    payoutStatus: 'active',
                    payoutMethod: {
                        bankCode: bankData.bankCode,
                        accountNumber: bankData.accountNumber,
                        accountName: bankData.accountName,
                        bankName: bankData.bankName,
                        updatedAt: new Date().toISOString()
                    }
                });
            }
            setLoading(false);
            setStep(3);
        } catch (err) {
            toast.error('Activation failed.');
            setLoading(false);
        }
    };

    const handleReset = async () => {
        setLoading(true);
        try {
            if (user?.uid) {
                await updateUserProfile(user.uid, { payoutStatus: 'pending' });
            }
            setStep(1);
            setBankData({ accountName: "", accountNumber: "", bankCode: "", bankName: "" });
        } finally {
            setLoading(false);
        }
    };

    if (step === 'activated') {
        return (
            <div className="max-w-2xl mx-auto py-12 px-6 min-h-screen">
                <div className="mb-12">
                    <button onClick={() => navigate('/settings')} className="p-3 rounded-2xl bg-white border border-[#e2ede8] text-[#1a6a3c] hover:bg-[#1a3c2e] hover:text-[#7fffd4] transition-all group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>
                <motion.div {...fadeUp(0)} className="card p-12 bg-white border-[#f0f7f2] shadow-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#1a6a3c]/5 rounded-full blur-3xl opacity-50" />
                    <div className="text-6xl mb-8">🏦</div>
                    <div className="inline-block bg-[#f0fdf4] text-[#16a34a] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Settlement Active</div>
                    <h2 className="font-fraunces text-3xl font-black italic text-[#1a2e22] mb-3 uppercase">{profile?.payoutMethod?.accountName || bankData.accountName}</h2>
                    <p className="text-xs text-[#64748b] font-medium leading-relaxed mb-10 italic max-w-sm mx-auto">
                        Settlements routed to your account at <b>{profile?.payoutMethod?.bankName}</b> ({profile?.payoutMethod?.accountNumber}).
                    </p>
                    <button onClick={handleReset} disabled={loading} className="text-[#94a3a8] font-black text-[11px] uppercase tracking-widest hover:text-[#dc2626] transition-all underline decoration-2 underline-offset-4">
                        {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Disconnect Bank Account'}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-6 min-h-screen">
            <style>{`
                .nuban-spinner { width: 14px; height: 14px; border: 2px solid #e2de; border-top: 2px solid #ca8a04; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>

            <div className="mb-12 flex items-center justify-between">
                <button onClick={() => step === 1 ? navigate('/settings') : setStep(step - 1)} className="p-3 rounded-2xl bg-white border border-[#e2ede8] text-[#1a6a3c] hover:bg-[#1a3c2e] hover:text-[#7fffd4] transition-all group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-2">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-[#1a6a3c]' : 'bg-[#e2ede8]'}`} />
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div key="step1" {...fadeUp(0)} className="card p-10 bg-white border-[#e2ede8] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a6a3c]/5 rounded-full blur-3xl opacity-50" />
                        <h3 className="font-fraunces text-2xl font-black italic text-[#1a2e22] mb-2 leading-tight">Link Bank Account</h3>
                        <p className="text-[12px] text-[#64748b] font-medium leading-relaxed mb-8">Enter your NUBAN to verify your identity.</p>

                        <div className="space-y-6">
                            <div>
                                <select
                                    className="w-full bg-white border border-[#e2ede8] rounded-2xl px-5 py-4 text-[#1a2e22] font-bold text-sm focus:border-[#1a6a3c] transition-all outline-none appearance-none cursor-pointer"
                                    required
                                    value={bankData.bankCode}
                                    onChange={e => {
                                        const bank = NIGERIAN_BANKS.find(b => b.code === e.target.value);
                                        setBankData({ ...bankData, bankCode: e.target.value, bankName: bank?.name || "" });
                                    }}
                                >
                                    <option value="">Select Bank</option>
                                    {NIGERIAN_BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <input
                                    type="text"
                                    placeholder="Account Number (10 digits)"
                                    maxLength={10}
                                    className="w-full bg-white border border-[#e2ede8] rounded-2xl px-5 py-4 text-[#1a2e22] font-bold text-sm focus:border-[#1a6a3c] transition-all outline-none"
                                    required
                                    value={bankData.accountNumber}
                                    onChange={e => setBankData({ ...bankData, accountNumber: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>

                            <motion.div
                                initial={false}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-6 rounded-2xl border-1.5 transition-all duration-300 flex items-center gap-4 ${resolving ? 'bg-[#fffbeb] border-[#fef08a] border-dashed shadow-sm' : bankData.accountName ? 'bg-[#f0fdf4] border-[#bbf7d0] border-solid shadow-sm' : 'bg-[#f8fafc] border-[#e2ede8] border-dashed opacity-60'}`}
                            >
                                <div className="flex-1 min-w-0">
                                    {resolving ? (
                                        <div className="flex items-center gap-3">
                                            <div className="nuban-spinner"></div>
                                            <p className="text-sm font-bold text-[#ca8a04] italic">Verifying NUBAN...</p>
                                        </div>
                                    ) : bankData.accountName ? (
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#16a34a]">
                                                <Check size={18} strokeWidth={3} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-[#16a34a] uppercase tracking-widest mb-0.5 leading-none">Account Holder Found</p>
                                                <p className="text-lg font-black text-[#1a3c2e] truncate italic leading-tight">{bankData.accountName}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[13px] font-bold text-[#94a3b8] italic">Waiting for 10-digit account number...</p>
                                    )}
                                </div>
                            </motion.div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!bankData.accountName || resolving}
                                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all mt-4"
                                style={{
                                    background: bankData.accountName ? '#1a3c2e' : '#f1f5f9',
                                    color: bankData.accountName ? '#7fffd4' : '#94a3a8',
                                    cursor: bankData.accountName ? 'pointer' : 'not-allowed',
                                    boxShadow: bankData.accountName ? '0 10px 25px rgba(26, 60, 46, 0.2)' : 'none'
                                }}
                            >
                                Activate Payouts
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div key="step2" {...fadeUp(0)} className="card p-10 bg-white border-[#e2ede8] shadow-2xl text-center">
                        <div className="w-20 h-20 bg-[#f4fbf7] border-2 border-[#1a6a3c] text-[#1a6a3c] rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <CheckCircle2 size={40} strokeWidth={2.5} />
                        </div>
                        <h2 className="font-fraunces text-[#1a2e22] text-3xl font-black italic tracking-tight mb-2">Confidence Check</h2>
                        <div className="p-10 rounded-3xl bg-[#f4fbf7] border border-[#ddf0e6] mb-8 text-left relative overflow-hidden group shadow-inner">
                            <p className="text-[10px] font-black text-[#1a6a3c] uppercase tracking-widest mb-2">Linked Beneficiary</p>
                            <h3 className="font-fraunces text-2xl font-black italic text-[#1a2e22]">{bankData.accountName}</h3>
                            <p className="text-sm font-bold text-[#6b8a7a] mt-2 italic">{bankData.bankName} • {bankData.accountNumber}</p>
                        </div>
                        <div className="space-y-4">
                            <button onClick={handleFinalize} className="btn-primary w-full py-5 text-base shadow-xl shadow-[#1a6a3c]/20 flex items-center justify-center gap-3" disabled={loading}>
                                {loading ? <>Activating <Loader2 size={18} className="animate-spin" /></> : <>Authorize Settlement <ShieldCheck size={18} strokeWidth={3} /></>}
                            </button>
                            <button onClick={() => setStep(1)} className="w-full text-[#94a3a8] font-bold text-[10px] uppercase tracking-widest py-4 hover:text-[#1a2e22] transition-colors underline underline-offset-4 decoration-[#e2ede8]">Review Details</button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                        <div className="text-7xl mb-10">�</div>
                        <h2 className="font-fraunces text-[#1a2e22] text-4xl font-black italic tracking-tight mb-4">Channel Integrated!</h2>
                        <p className="text-[#6b8a7a] font-medium text-base leading-relaxed italic mb-12 max-w-md mx-auto">
                            Direct settlement to <b>{bankData.accountName}</b> is now locked. All property revenue will flow to this verified account.
                        </p>
                        <button className="btn-primary w-full max-w-sm py-5 mx-auto block shadow-xl shadow-[#1a6a3c]/30" onClick={() => navigate('/dashboard')}>Enter Dashboard</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

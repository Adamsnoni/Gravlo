// src/pages/SubscriptionPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Crown, Zap, Building2, Sparkles, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { PLANS, PLAN_ORDER, getUserPlan, updateUserPlan, getLocalizedPlans } from '../services/subscription';
import toast from 'react-hot-toast';
import SuccessCelebration from '../components/SuccessCelebration';

const PLAN_ICONS = { free: Building2, pro: Zap, business: Crown };

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4, ease: "easeOut" },
});

export default function SubscriptionPage() {
    const { user } = useAuth();
    const { currencySymbol, countryCode, currency, fmt } = useLocale();
    const [currentPlan, setCurrentPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebratePlanName, setCelebratePlanName] = useState("");

    const localPlans = getLocalizedPlans(countryCode || 'NG', currency || 'NGN');

    useEffect(() => {
        // Inject Paystack Script
        const script = document.createElement("script");
        script.src = "https://js.paystack.co/v1/inline.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (!user) return;
        getUserPlan(user.uid).then(p => {
            setCurrentPlan(localPlans[p.id] || localPlans.free);
            setLoading(false);
        });
    }, [user, countryCode, currency]);

    const handleSelectPlan = async (planId) => {
        if (planId === currentPlan?.id) return;
        const plan = localPlans[planId];

        // For Free plan, update directly
        if (planId === 'free') {
            setSwitching(planId);
            try {
                await updateUserPlan(user.uid, planId);
                setCurrentPlan(plan);
                toast.success('Switched to Free plan.');
            } catch (err) {
                console.error('Update failed:', err);
            } finally {
                setSwitching(null);
            }
            return;
        }

        // For Paid plans (Pro/Business), initiate Paystack
        if (!window.PaystackPop) {
            toast.error("Payment gateway initializing... please wait.");
            return;
        }

        const handler = window.PaystackPop.setup({
            key: "pk_test_458900bfd7817588a60a085f6503371cdecbae8d",
            email: user?.email || "landlord@gravlo.com",
            amount: plan.price * 100, // in kobo
            plan: plan.paystackPlanCode,
            callback: async (response) => {
                setSwitching(planId);
                try {
                    await updateUserPlan(user.uid, planId);
                    setCurrentPlan(plan);
                    setCelebratePlanName(plan.name);
                    setShowCelebration(true);
                } catch (err) {
                    console.error('Subscription update failed:', err);
                    toast.error('Payment verified, but profile update failed. Please contact support.');
                } finally {
                    setSwitching(null);
                }
            },
            onClose: () => {
                toast.error("Transaction suspended.");
            }
        });

        handler.openIframe();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-[#1a6a3c]/10 border-t-[#1a6a3c] rounded-full animate-spin" />
                <p className="font-fraunces italic font-black text-[#1a6a3c] animate-pulse">Syncing Portfolio...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8">
            <AnimatePresence>
                {showCelebration && (
                    <SuccessCelebration
                        planName={celebratePlanName}
                        onComplete={() => {
                            setShowCelebration(false);
                            navigate('/dashboard');
                        }}
                    />
                )}
            </AnimatePresence>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,900&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
            `}</style>

            {/* Header Strategy */}
            <motion.div {...fadeUp(0)} className="text-center mb-16 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 opacity-5 pointer-events-none">
                    <Building2 size={200} />
                </div>

                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="h-px w-8 bg-[#1a6a3c]/20" />
                    <span className="font-jakarta text-[10px] font-black text-[#1a6a3c] uppercase tracking-[0.3em]">Growth Infrastructure</span>
                    <div className="h-px w-8 bg-[#1a6a3c]/20" />
                </div>

                <h1 className="font-fraunces text-4xl sm:text-6xl font-black italic text-[#1a2e22] tracking-tight mb-4 leading-tight">
                    Scale your Rental <br />
                    <span className="text-[#1a6a3c]">Empire with Gravlo</span>
                </h1>

                <p className="font-jakarta text-[#6b8a7a] font-medium text-sm sm:text-base max-w-xl mx-auto italic leading-relaxed">
                    From single units to nationwide portfolios. Select the engineering capacity that matches your property ambitions.
                </p>
            </motion.div>

            {/* Plans Deck */}
            <div className="grid lg:grid-cols-3 gap-8 px-4">
                {PLAN_ORDER.map((planId, i) => {
                    const plan = localPlans[planId];
                    const isCurrent = currentPlan?.id === planId;
                    const Icon = PLAN_ICONS[planId];
                    const isPremium = planId === 'business' || plan.popular;

                    return (
                        <motion.div
                            key={planId}
                            {...fadeUp(0.1 + i * 0.1)}
                            className={`relative group card p-10 flex flex-col transition-all duration-500 rounded-[32px] overflow-hidden ${isPremium
                                ? 'bg-white border-2 border-[#1a6a3c] shadow-2xl shadow-[#1a6a3c]/5'
                                : 'bg-[#fcfdfc] border border-[#e2ede8] hover:border-[#1a6a3c]/30'
                                }`}
                        >
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a6a3c]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            {plan.popular && (
                                <div className="absolute top-6 right-6">
                                    <span className="bg-[#1a3c2e] text-[#7fffd4] text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                        Best Performance
                                    </span>
                                </div>
                            )}

                            <div className="relative z-10 flex-1 flex flex-col">
                                {/* Plan Identity */}
                                <div className="flex items-start justify-between mb-8">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isPremium ? 'bg-[#1a3c2e] text-[#7fffd4]' : 'bg-white border border-[#e2ede8] text-[#1a6a3c]'
                                        } shadow-sm transform group-hover:scale-110 transition-transform duration-500`}>
                                        <Icon size={28} strokeWidth={isPremium ? 2.5 : 2} />
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-fraunces text-2xl font-black italic ${isPremium ? 'text-[#1a3c2e]' : 'text-[#6b8a7a]'}`}>{plan.name}</p>
                                        {isCurrent && (
                                            <span className="text-[9px] font-black text-[#1a6a3c] uppercase tracking-tighter bg-[#f4fbf7] px-2 py-0.5 rounded-full border border-[#ddf0e6]">Current Protocol</span>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Pricing */}
                                <div className="mb-10">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-fraunces text-5xl font-black text-[#1a2e22] italic leading-none">
                                            {plan.price === 0 ? 'Free' : fmt(plan.price)}
                                        </span>
                                        {plan.price !== 0 && (
                                            <span className="font-jakarta text-[#94a3a8] font-bold text-xs uppercase tracking-widest">/ {plan.period}</span>
                                        )}
                                    </div>
                                    <p className="font-jakarta text-[11px] text-[#6b8a7a] font-black uppercase tracking-[0.1em] mt-3">{plan.description}</p>
                                </div>

                                <div className="h-px w-full bg-[#1a6a3c]/5 mb-8" />

                                {/* Features HUD */}
                                <div className="flex-1 space-y-4 mb-10">
                                    {plan.features.map(({ label, included }) => (
                                        <div key={label} className="flex items-center gap-3 group/item">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${included ? 'bg-[#f4fbf7] text-[#1a6a3c]' : 'bg-[#fff9f9] text-[#94a3a8] opacity-40'
                                                }`}>
                                                {included ? <Check size={12} strokeWidth={4} /> : <X size={10} strokeWidth={3} />}
                                            </div>
                                            <span className={`font-jakarta text-xs font-bold leading-tight ${included ? 'text-[#1a2e22]' : 'text-[#94a3a8] line-through decoration-1 opacity-50'
                                                }`}>
                                                {label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Core */}
                                <button
                                    onClick={() => handleSelectPlan(planId)}
                                    disabled={isCurrent || switching !== null}
                                    className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 relative ${isCurrent
                                        ? 'bg-[#fcfdfc] border-2 border-[#e2ede8] text-[#94a3a8] cursor-not-allowed'
                                        : isPremium
                                            ? 'bg-[#1a3c2e] text-[#7fffd4] hover:shadow-2xl hover:shadow-[#1a3c2e]/20 hover:-translate-y-1'
                                            : 'bg-white border-2 border-[#1a6a3c] text-[#1a6a3c] hover:bg-[#1a6a3c] hover:text-white'
                                        } disabled:opacity-50`}
                                >
                                    {switching === planId ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : isCurrent ? (
                                        <span className="flex items-center gap-2">Protocol Active</span>
                                    ) : (
                                        <>Deploy {plan.name} <ArrowRight size={16} /></>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Verification Footer */}
            <motion.div {...fadeUp(0.5)} className="mt-20 flex flex-col items-center gap-6">
                <div className="flex items-center gap-8 px-8 py-4 rounded-3xl bg-[#f4fbf7]/50 border border-[#ddf0e6] shadow-sm">
                    <div className="flex items-center gap-2 text-[#1a6a3c]">
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Encrypted Checkout</span>
                    </div>
                    <div className="h-4 w-px bg-[#1a6a3c]/10" />
                    <div className="flex items-center gap-2 text-[#6b8a7a]">
                        <Zap size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Instant Fulfillment</span>
                    </div>
                </div>
                <p className="font-jakarta text-[11px] text-[#94a3a8] font-bold text-center max-w-sm leading-relaxed px-4">
                    Subscription lifecycle managed by Gravlo Core. <br />
                    Taxes may apply based on your localized regional standards.
                </p>
            </motion.div>
        </div>
    );
}

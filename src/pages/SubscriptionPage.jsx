// src/pages/SubscriptionPage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Crown, Zap, Building2, Sparkles, Loader2, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { PLANS, PLAN_ORDER, getUserPlan, updateUserPlan, getLocalizedPlans } from '../services/subscription';
import toast from 'react-hot-toast';

const PLAN_ICONS = { free: Building2, pro: Zap, business: Crown };

export default function SubscriptionPage() {
    const { user } = useAuth();
    const { currencySymbol, countryCode, currency, fmt } = useLocale();
    const [currentPlan, setCurrentPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(null);

    const localPlans = getLocalizedPlans(countryCode || 'NG', currency || 'NGN');

    useEffect(() => {
        if (!user) return;
        getUserPlan(user.uid).then(p => {
            setCurrentPlan(localPlans[p.id] || localPlans.free);
            setLoading(false);
        });
    }, [user, countryCode, currency]);

    const handleSelectPlan = async (planId) => {
        if (planId === currentPlan?.id) return;
        setSwitching(planId);
        try {
            await updateUserPlan(user.uid, planId);
            setCurrentPlan(localPlans[planId]);
            const plan = localPlans[planId];
            toast.success(`Switched to ${plan.name} plan!`);
        } catch {
            toast.error('Failed to update plan.');
        } finally {
            setSwitching(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 size={40} className="text-[#52b788] animate-spin mb-4" />
                <p className="font-body text-[#4a5568] text-[11px] uppercase tracking-widest font-bold">Synchronizing Pricing Tiers...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 max-w-6xl mx-auto py-8 animate-in fade-in duration-500">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1a3c2e]/20 border border-[#2d6a4f]/30 mb-6">
                    <Sparkles size={14} className="text-[#52b788]" />
                    <span className="font-body text-[10px] font-bold text-[#52b788] uppercase tracking-wider">Premium Infrastructure</span>
                </div>
                <h1 className="font-display text-[#e8e4de] text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
                    Scale Your Operations
                </h1>
                <p className="font-body text-[#4a5568] text-sm max-w-lg mx-auto font-medium leading-relaxed">
                    Select a tier that aligns with your portfolio size. All tiers including enterprise support.
                </p>
            </motion.div>

            {/* Plan Cards */}
            <div className="grid lg:grid-cols-3 gap-8">
                {PLAN_ORDER.map((planId, i) => {
                    const plan = localPlans[planId];
                    const isCurrent = currentPlan?.id === planId;
                    const Icon = PLAN_ICONS[planId];
                    const currentIdx = PLAN_ORDER.indexOf(currentPlan?.id);
                    const thisIdx = PLAN_ORDER.indexOf(planId);
                    const isUpgrade = thisIdx > currentIdx;

                    return (
                        <motion.div
                            key={planId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.1 }}
                            className={`relative card flex flex-col overflow-hidden bg-[#0d1215] transition-all duration-500 ${plan.popular
                                ? 'border-[#52b788]/40 shadow-2xl scale-105 z-10'
                                : isCurrent
                                    ? 'border-[#52b788]/20'
                                    : 'border-[#1e2a2e] hover:border-[#1e2a2e]/80'
                                }`}
                        >
                            {/* Popular badge */}
                            {plan.popular && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-[#1a3c2e] text-[#52b788] font-body text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl border-l border-b border-[#2d6a4f]/30 shadow-lg">
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            <div className="p-8 flex-1 flex flex-col">
                                {/* Plan header */}
                                <div className="mb-8">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-transform duration-500 hover:rotate-3 ${planId === 'business' ? 'bg-[#2d2510]/10 border-[#3d3215]/30 text-[#f0c040]' : planId === 'pro' ? 'bg-[#1a3c2e]/10 border-[#2d6a4f]/30 text-[#52b788]' : 'bg-[#141b1e] border-[#1e2a2e] text-[#4a5568]'
                                        }`}>
                                        <Icon size={28} />
                                    </div>
                                    <h3 className="font-display text-[#e8e4de] text-2xl font-bold tracking-tight mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        {plan.price === 0 ? (
                                            <span className="font-display text-[#e8e4de] text-4xl font-bold tracking-tighter">{currencySymbol}0</span>
                                        ) : (
                                            <span className="font-display text-[#e8e4de] text-4xl font-bold tracking-tighter">{fmt(plan.price)}</span>
                                        )}
                                        <span className="font-body text-[#4a5568] text-sm font-bold uppercase tracking-widest">/ {plan.period}</span>
                                    </div>
                                    <p className="font-body text-xs text-[#4a5568] font-medium leading-relaxed">{plan.description}</p>
                                </div>

                                {/* Features list */}
                                <div className="flex-1 space-y-4 mb-10 pb-8 border-b border-[#1e2a2e]/50">
                                    {plan.features.map(({ label, included }) => (
                                        <div key={label} className="flex items-center gap-3">
                                            {included ? (
                                                <div className="w-5 h-5 rounded-lg bg-[#1a3c2e]/20 flex items-center justify-center flex-shrink-0 border border-[#2d6a4f]/30">
                                                    <Check size={12} className="text-[#52b788]" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-lg bg-[#141b1e] flex items-center justify-center flex-shrink-0 border border-[#1e2a2e]">
                                                    <X size={10} className="text-[#1e2a2e]" />
                                                </div>
                                            )}
                                            <span className={`font-body text-sm font-medium ${included ? 'text-[#8a9ba8]' : 'text-[#303c40]'}`}>
                                                {label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Action button */}
                                <button
                                    onClick={() => handleSelectPlan(planId)}
                                    disabled={isCurrent || switching !== null}
                                    className={`w-full h-14 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isCurrent
                                        ? 'bg-[#141b1e] text-[#4a5568] border border-[#1e2a2e] cursor-default'
                                        : plan.popular
                                            ? 'bg-gradient-to-r from-[#1a3c2e] to-[#2d6a4f] text-[#e8e4de] shadow-lg shadow-[#1a3c2e]/40 hover:scale-[1.02]'
                                            : 'bg-[#141b1e] text-[#e8e4de] border border-[#1e2a2e] hover:border-[#52b788]/40'
                                        } disabled:opacity-60`}
                                >
                                    {switching === planId ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : isCurrent ? (
                                        <><ShieldCheck size={16} /> Current Membership</>
                                    ) : (
                                        <>Upgrade Plan <ArrowRight size={14} /></>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Support Guarantee */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="p-8 rounded-[40px] bg-gradient-to-br from-[#0d1215] to-[#141b1e] border border-[#1e2a2e] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                <div className="flex items-center gap-5 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-[#1a3c2e]/10 border border-[#2d6a4f]/30 flex items-center justify-center text-[#52b788]">
                        <Star size={24} />
                    </div>
                    <div>
                        <h4 className="font-display text-[#e8e4de] font-bold text-xl tracking-tight leading-tight">LeaseEase Guarantee</h4>
                        <p className="font-body text-sm text-[#4a5568] font-medium max-w-sm mt-1">Change your tier at any point. Adjustments are instantly synchronized across your properties.</p>
                    </div>
                </div>
                <div className="px-6 py-4 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] text-xs font-bold uppercase tracking-widest hidden lg:flex items-center gap-4">
                    <Check size={16} className="text-[#52b788]" />
                    Billed via secure payment gateways
                </div>
            </motion.div>
        </div>
    );
}

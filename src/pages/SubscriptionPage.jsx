// src/pages/SubscriptionPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Pricing / subscription management page — landlords only.
// Three tiers: Free, Pro ($7/mo), Business ($20/mo).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Crown, Zap, Building2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { PLANS, PLAN_ORDER, getUserPlan, updateUserPlan, getLocalizedPlans } from '../services/subscription';
import toast from 'react-hot-toast';

const PLAN_ICONS = { free: Building2, pro: Zap, business: Crown };

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4 },
});

export default function SubscriptionPage() {
    const { user } = useAuth();
    const { currencySymbol, countryCode, currency, fmt } = useLocale();
    const [currentPlan, setCurrentPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(null); // planId being switched to

    const localPlans = getLocalizedPlans(countryCode || 'NG', currency || 'NGN');

    useEffect(() => {
        if (!user) return;
        getUserPlan(user.uid).then(p => {
            // Map the current plan to the localized version
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
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <motion.div {...fadeUp(0)} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles size={20} className="text-sage" />
                    <span className="font-body text-xs font-semibold text-sage uppercase tracking-wider">Subscription Plans</span>
                </div>
                <h1 className="font-display text-ink text-3xl sm:text-4xl font-semibold mb-2">
                    Choose your plan
                </h1>
                <p className="font-body text-stone-400 text-sm max-w-md mx-auto">
                    Scale your property management with the right plan. Upgrade or downgrade anytime.
                </p>
            </motion.div>

            {/* Plan Cards */}
            <div className="grid md:grid-cols-3 gap-5">
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
                            {...fadeUp(0.1 + i * 0.08)}
                            className={`relative card flex flex-col overflow-hidden transition-all ${plan.popular
                                ? 'border-2 border-sage shadow-deep'
                                : isCurrent
                                    ? 'border-2 border-sage/30'
                                    : 'border border-stone-200 hover:border-stone-300'
                                }`}
                        >
                            {/* Popular badge */}
                            {plan.popular && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-sage text-cream font-body text-xs font-semibold px-3 py-1 rounded-bl-xl">
                                        Popular
                                    </div>
                                </div>
                            )}

                            <div className="p-6 flex-1 flex flex-col">
                                {/* Plan icon & name */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${planId === 'business' ? 'bg-amber/10' : planId === 'pro' ? 'bg-sage/10' : 'bg-stone-100'
                                        }`}>
                                        <Icon size={20} className={
                                            planId === 'business' ? 'text-amber' : planId === 'pro' ? 'text-sage' : 'text-stone-500'
                                        } />
                                    </div>
                                    <div>
                                        <p className="font-display text-ink text-lg font-semibold">{plan.name}</p>
                                        {isCurrent && (
                                            <span className="font-body text-xs text-sage font-medium">Current plan</span>
                                        )}
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-4">
                                    {plan.price === 0 ? (
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-display text-ink text-4xl font-bold">{currencySymbol}0</span>
                                            <span className="font-body text-stone-400 text-sm">/ forever</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-display text-ink text-4xl font-bold">{fmt(plan.price)}</span>
                                            <span className="font-body text-stone-400 text-sm">/ {plan.period}</span>
                                        </div>
                                    )}
                                    <p className="font-body text-xs text-stone-400 mt-1">{plan.description}</p>
                                </div>

                                {/* Features list */}
                                <div className="flex-1 space-y-2.5 mb-6">
                                    {plan.features.map(({ label, included }) => (
                                        <div key={label} className="flex items-center gap-2.5">
                                            {included ? (
                                                <div className="w-5 h-5 rounded-full bg-sage/10 flex items-center justify-center flex-shrink-0">
                                                    <Check size={12} className="text-sage" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                                                    <X size={10} className="text-stone-300" />
                                                </div>
                                            )}
                                            <span className={`font-body text-sm ${included ? 'text-ink' : 'text-stone-300'}`}>
                                                {label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Action button */}
                                <button
                                    onClick={() => handleSelectPlan(planId)}
                                    disabled={isCurrent || switching !== null}
                                    className={`w-full py-3 rounded-xl text-sm font-body font-semibold transition-all ${isCurrent
                                        ? 'bg-sage/10 text-sage border border-sage/20 cursor-default'
                                        : plan.popular
                                            ? 'bg-sage text-cream hover:bg-sage/90 shadow-sm'
                                            : 'bg-white text-ink border border-stone-200 hover:border-sage hover:text-sage'
                                        } disabled:opacity-60`}
                                >
                                    {switching === planId ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                                    ) : isCurrent ? (
                                        <span className="flex items-center justify-center gap-1.5">
                                            <Check size={14} /> Current Plan
                                        </span>
                                    ) : isUpgrade ? (
                                        `Upgrade to ${plan.name}`
                                    ) : (
                                        `Switch to ${plan.name}`
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer note */}
            <motion.p {...fadeUp(0.4)} className="text-center font-body text-xs text-stone-400">
                Plans can be changed at any time. Changes take effect immediately.
                <br />No credit card required for Free plan.
            </motion.p>
        </div>
    );
}

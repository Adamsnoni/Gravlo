// src/services/subscription.js
// ─────────────────────────────────────────────────────────────────────────────
// Tiered subscription plan definitions, Firestore helpers, and limit checks.
// Plans: free, pro ($7/mo), business ($20/mo) — landlords only.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getSubscriptionPrices } from '../utils/pricing';

// ════════════════════════════════════════════════════════════════════════════
// PLAN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════
export const PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        basePrice: 0,
        period: null,
        maxProperties: 2,
        badge: 'FREE',
        badgeColor: 'bg-stone-100 text-stone-500',
        description: 'Get started with basic property management.',
        features: [
            { label: 'Up to 2 properties', included: true },
            { label: 'Basic property management', included: true },
            { label: 'Tenant invitations', included: true },
            { label: 'Analytics & charts', included: false },
            { label: 'Automated reminders', included: false },
            { label: 'PDF invoice generation', included: false },
            { label: 'Multi-building management', included: false },
            { label: 'Advanced analytics', included: false },
        ],
        featureFlags: {
            analytics: false,
            automatedReminders: false,
            pdfInvoices: false,
            multiBuilding: false,
            advancedAnalytics: false,
        },
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        basePrice: 7,
        period: 'month',
        maxProperties: 20,
        badge: 'PRO',
        badgeColor: 'bg-sage/15 text-sage',
        popular: true,
        description: 'For growing landlords who need more power.',
        features: [
            { label: 'Up to 20 properties', included: true },
            { label: 'Basic property management', included: true },
            { label: 'Tenant invitations', included: true },
            { label: 'Analytics & charts', included: true },
            { label: 'Automated reminders', included: true },
            { label: 'PDF invoice generation', included: true },
            { label: 'Multi-building management', included: false },
            { label: 'Advanced analytics', included: false },
        ],
        featureFlags: {
            analytics: true,
            automatedReminders: true,
            pdfInvoices: true,
            multiBuilding: false,
            advancedAnalytics: false,
        },
    },
    business: {
        id: 'business',
        name: 'Business',
        basePrice: 20,
        period: 'month',
        maxProperties: Infinity,
        badge: 'BIZ',
        badgeColor: 'bg-amber/15 text-amber',
        description: 'For professional property managers at scale.',
        features: [
            { label: 'Unlimited properties', included: true },
            { label: 'Basic property management', included: true },
            { label: 'Tenant invitations', included: true },
            { label: 'Analytics & charts', included: true },
            { label: 'Automated reminders', included: true },
            { label: 'PDF invoice generation', included: true },
            { label: 'Multi-building management', included: true },
            { label: 'Advanced analytics', included: true },
        ],
        featureFlags: {
            analytics: true,
            automatedReminders: true,
            pdfInvoices: true,
            multiBuilding: true,
            advancedAnalytics: true,
        },
    },
};

export const PLAN_ORDER = ['free', 'pro', 'business'];

/**
 * Returns localized versions of the PLANS object with accurately calculated pricing.
 */
export const getLocalizedPlans = (countryCode, currency) => {
    const prices = getSubscriptionPrices(countryCode, currency);

    return {
        free: { ...PLANS.free, price: prices.free },
        pro: { ...PLANS.pro, price: prices.pro },
        business: { ...PLANS.business, price: prices.business },
    };
};

// ════════════════════════════════════════════════════════════════════════════
// FIRESTORE HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get the current plan object for a user. Defaults to 'free'.
 */
export async function getUserPlan(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return PLANS.free;
    const data = snap.data();
    const planId = data.subscription?.planId || 'free';
    return PLANS[planId] || PLANS.free;
}

/**
 * Update a user's subscription plan.
 */
export async function updateUserPlan(uid, planId) {
    if (!PLANS[planId]) throw new Error(`Invalid plan: ${planId}`);
    await updateDoc(doc(db, 'users', uid), {
        subscription: {
            planId,
            updatedAt: serverTimestamp(),
        },
    });
}

/**
 * Check if a user can add another property under their plan.
 */
export async function canAddProperty(uid, currentPropertyCount) {
    const plan = await getUserPlan(uid);
    return currentPropertyCount < plan.maxProperties;
}

/**
 * Check if a plan includes a specific feature.
 */
export function hasFeature(plan, featureKey) {
    return plan?.featureFlags?.[featureKey] ?? false;
}

/**
 * Get the plan that's one tier above the given plan (for upgrade prompts).
 */
export function getUpgradePlan(currentPlanId) {
    const idx = PLAN_ORDER.indexOf(currentPlanId);
    if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
    return PLANS[PLAN_ORDER[idx + 1]];
}

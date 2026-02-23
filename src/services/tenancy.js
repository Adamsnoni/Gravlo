// src/services/tenancy.js
// ─────────────────────────────────────────────────────────────────────────────
// Tenancy lifecycle management.
// Creates/closes tenancy documents when tenants are assigned/removed from units.
//
// Firestore: tenancies/{tenancyId}
// {
//   tenantId, landlordId, propertyId, unitId,
//   tenantName, tenantEmail, unitName, propertyName,
//   rentAmount, billingCycle, currency,
//   status: 'active' | 'closed',
//   startDate, endDate, closedAt,
//   invoiceSchedulingEnabled: true,
//   createdAt, updatedAt,
// }
// ─────────────────────────────────────────────────────────────────────────────
import { db } from './firebase';
import {
    collection, doc, addDoc, updateDoc, getDoc, getDocs,
    query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════════
// CREATE TENANCY — called when landlord assigns a tenant to a unit
// ════════════════════════════════════════════════════════════════════════════
export async function createTenancy({
    tenantId,
    landlordId,
    propertyId,
    unitId,
    tenantName = '',
    tenantEmail = '',
    unitName = '',
    propertyName = '',
    rentAmount,
    billingCycle = 'monthly',
    currency = 'NGN',
}) {
    // Close any existing active tenancy for this unit first
    await closeActiveTenanciesForUnit(landlordId, propertyId, unitId);

    const tenancyData = {
        tenantId: tenantId || null,
        landlordId,
        propertyId,
        unitId,
        tenantName,
        tenantEmail,
        unitName,
        propertyName,
        rentAmount: Number(rentAmount) || 0,
        billingCycle,
        currency,
        status: 'active',
        startDate: serverTimestamp(),
        endDate: null,
        closedAt: null,
        invoiceSchedulingEnabled: true,
        nextInvoiceDate: calculateNextInvoiceDate(billingCycle),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'tenancies'), tenancyData);
    return { id: docRef.id, ...tenancyData };
}

// ════════════════════════════════════════════════════════════════════════════
// CLOSE TENANCY — called when landlord removes a tenant (move-out)
// ════════════════════════════════════════════════════════════════════════════
export async function closeTenancy(tenancyId) {
    await updateDoc(doc(db, 'tenancies', tenancyId), {
        status: 'closed',
        endDate: serverTimestamp(),
        closedAt: serverTimestamp(),
        invoiceSchedulingEnabled: false,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Close all active tenancies for a specific unit.
 * Called before creating a new tenancy to avoid duplicates.
 */
export async function closeActiveTenanciesForUnit(landlordId, propertyId, unitId) {
    const snap = await getDocs(
        query(
            collection(db, 'tenancies'),
            where('landlordId', '==', landlordId),
            where('propertyId', '==', propertyId),
            where('unitId', '==', unitId),
            where('status', '==', 'active'),
        )
    );
    for (const d of snap.docs) {
        await closeTenancy(d.id);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════════════════════════

/** Get the active tenancy for a unit (if any). */
export async function getActiveTenancy(landlordId, propertyId, unitId) {
    const snap = await getDocs(
        query(
            collection(db, 'tenancies'),
            where('landlordId', '==', landlordId),
            where('propertyId', '==', propertyId),
            where('unitId', '==', unitId),
            where('status', '==', 'active'),
        )
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
}

/** Subscribe to all tenancies for a landlord. */
export function subscribeTenancies(landlordId, cb) {
    return onSnapshot(
        query(collection(db, 'tenancies'), where('landlordId', '==', landlordId), orderBy('createdAt', 'desc')),
        (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
}

/** Subscribe to all active tenancies for a specific tenant. */
export function subscribeTenantTenancies(tenantId, cb) {
    return onSnapshot(
        query(collection(db, 'tenancies'), where('tenantId', '==', tenantId), where('status', '==', 'active')),
        (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
}

/** Get full tenancy history for a unit (active + closed). */
export function subscribeUnitTenancyHistory(propertyId, unitId, cb) {
    return onSnapshot(
        query(
            collection(db, 'tenancies'),
            where('propertyId', '==', propertyId),
            where('unitId', '==', unitId),
            orderBy('createdAt', 'desc'),
        ),
        (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function calculateNextInvoiceDate(billingCycle) {
    const now = new Date();
    switch (billingCycle) {
        case 'yearly': return Timestamp.fromDate(new Date(now.getFullYear() + 1, now.getMonth(), 1));
        case 'weekly': return Timestamp.fromDate(new Date(now.getTime() + 7 * 86400000));
        case 'daily': return Timestamp.fromDate(new Date(now.getTime() + 86400000));
        case 'monthly':
        default: return Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    }
}

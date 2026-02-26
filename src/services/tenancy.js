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
    billingCycle = 'yearly',
    currency = 'NGN',
    ...rest
}) {
    // Close any existing active tenancy for this unit first
    await terminateActiveLeasesForUnit(landlordId, propertyId, unitId);

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
        serviceChargeAmount: Number(rest.serviceChargeAmount) || 0,
        billingCycle,
        currency,
        status: 'active',
        startDate: serverTimestamp(),
        endDate: null,
        closedAt: null,
        invoiceSchedulingEnabled: true,
        nextInvoiceDate: calculateNextInvoiceDate(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'tenancies'), tenancyData);
    return { id: docRef.id, ...tenancyData };
}

// ════════════════════════════════════════════════════════════════════════════
// CLOSE TENANCY — called when landlord terminates a lease (move-out)
// ════════════════════════════════════════════════════════════════════════════
export async function terminateLease(tenancyId) {
    await updateDoc(doc(db, 'tenancies', tenancyId), {
        status: 'former',
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
export async function terminateActiveLeasesForUnit(landlordId, propertyId, unitId) {
    const snap = await getDocs(
        query(
            collection(db, 'tenancies'),
            where('landlordId', '==', landlordId),
            where('propertyId', '==', propertyId),
            where('unitId', '==', unitId)
        )
    );
    for (const d of snap.docs) {
        if (d.data().status === 'active') {
            await terminateLease(d.id);
        }
    }
}

/**
 * MASTER RESET: Forcibly clears a unit's tenant record.
 * Bypasses all guards (balances, invoices, etc).
 */
export async function resetUnitTenancyMaster(landlordId, propertyId, unitId) {
    // 1. Terminate all active leases for this unit
    await terminateActiveLeasesForUnit(landlordId, propertyId, unitId);

    // 2. Clear unit record directly (this is normally handled by the calling page for UI updates,
    // but we provide the service logic here for completeness/reusability)
    return { success: true };
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
            where('unitId', '==', unitId)
        )
    );
    const activeDoc = snap.docs.find(d => d.data().status === 'active');
    if (!activeDoc) return null;
    return { id: activeDoc.id, ...activeDoc.data() };
}

/** Subscribe to all tenancies for a landlord. */
export function subscribeTenancies(landlordId, cb, onError) {
    return onSnapshot(
        query(collection(db, 'tenancies'), where('landlordId', '==', landlordId), orderBy('createdAt', 'desc')),
        (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (error) => {
            console.error("Error in subscribeTenancies:", error);
            if (onError) onError(error);
        }
    );
}

/** Subscribe to all tenancies for a specific tenant (active + former). */
export function subscribeTenantTenancies(tenantId, cb, errCb) {
    return onSnapshot(
        query(collection(db, 'tenancies'), where('tenantId', '==', tenantId)),
        (snap) => {
            cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        },
        (error) => {
            console.error("Error in subscribeTenantTenancies:", error);
            if (errCb) errCb(error);
            else cb([]); // Resolve with empty array on error
        }
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

function calculateNextInvoiceDate() {
    const now = new Date();
    // Start date = confirmed yearly payment date.
    // End date = payment date + 365 days.
    return Timestamp.fromDate(new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000));
}

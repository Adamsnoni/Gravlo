// src/services/invoices.js
// ─────────────────────────────────────────────────────────────────────────────
// Invoice management service for the client-side app.
// Handles invoice CRUD, status updates, and subscriptions.
//
// Firestore: invoices/{invoiceId}
// {
//   invoiceNumber, tenancyId, tenantId, landlordId,
//   propertyId, unitId, propertyName, unitName,
//   tenantName, tenantEmail,
//   amount, currency, billingCycle,
//   status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
//   dueDate, paidDate,
//   paymentId, gatewayReference,
//   pdfUrl,
//   createdAt, updatedAt,
// }
// ─────────────────────────────────────────────────────────────────────────────
import { db } from './firebase';
import {
    collection, doc, addDoc, setDoc, updateDoc, getDoc, getDocs,
    query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════════
// INVOICE CREATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate a human-readable invoice number.
 */
export function generateInvoiceNumber() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${date}-${rand}`;
}

/**
 * Create a new invoice from a tenancy.
 * Called by the recurring invoice scheduler (Cloud Function) or manually.
 */
export async function createInvoice({
    tenancyId,
    tenantId,
    landlordId,
    propertyId,
    unitId,
    propertyName = '',
    unitName = '',
    tenantName = '',
    tenantEmail = '',
    amount,
    currency = 'NGN',
    billingCycle = 'yearly',
    dueDate,
}) {
    const invoiceNumber = generateInvoiceNumber();

    const invoiceData = {
        invoiceNumber,
        tenancyId: tenancyId || null,
        tenantId: tenantId || null,
        landlordId,
        propertyId,
        unitId: unitId || null,
        propertyName,
        unitName,
        tenantName,
        tenantEmail,
        amount: Number(amount),
        currency,
        billingCycle,
        status: 'sent',
        dueDate: dueDate instanceof Date ? Timestamp.fromDate(dueDate) : dueDate,
        paidDate: null,
        paymentId: null,
        gatewayReference: null,
        pdfUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
    return { id: docRef.id, invoiceNumber, ...invoiceData };
}

// ════════════════════════════════════════════════════════════════════════════
// INVOICE STATUS UPDATES
// ════════════════════════════════════════════════════════════════════════════

/** Mark an invoice as paid after successful payment. */
export async function markInvoicePaid(invoiceId, { paymentId, gatewayReference, pdfUrl }) {
    await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'paid',
        paidDate: serverTimestamp(),
        paymentId: paymentId || null,
        gatewayReference: gatewayReference || null,
        pdfUrl: pdfUrl || null,
        updatedAt: serverTimestamp(),
    });
}

/** Mark an invoice as overdue. */
export async function markInvoiceOverdue(invoiceId) {
    await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'overdue',
        updatedAt: serverTimestamp(),
    });
}

/** Cancel an invoice (e.g. on tenant move-out). */
export async function cancelInvoice(invoiceId) {
    await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
    });
}

/**
 * Cancel all pending/sent invoices for a tenancy.
 * Called during tenant move-out to stop future invoices.
 */
export async function cancelPendingInvoices(landlordId, tenancyId) {
    const snap = await getDocs(
        query(
            collection(db, 'invoices'),
            where('landlordId', '==', landlordId),
            where('tenancyId', '==', tenancyId)
        )
    );
    const toCancel = snap.docs.filter(d => ['draft', 'sent'].includes(d.data().status));
    const cancels = toCancel.map(d => cancelInvoice(d.id));
    await Promise.all(cancels);
    return toCancel.length;
}

// ════════════════════════════════════════════════════════════════════════════
// INVOICE QUERIES
// ════════════════════════════════════════════════════════════════════════════

/** Subscribe to all invoices for a landlord (all properties). */
export function subscribeLandlordInvoices(landlordId, cb) {
    return onSnapshot(
        query(collection(db, 'invoices'), where('landlordId', '==', landlordId)),
        (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            cb(docs);
        }
    );
}

/** Subscribe to all invoices for a specific tenant. */
export function subscribeTenantInvoices(tenantId, cb) {
    return onSnapshot(
        query(collection(db, 'invoices'), where('tenantId', '==', tenantId)),
        (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            cb(docs);
        }
    );
}

/** Subscribe to invoices for a specific property. */
export function subscribePropertyInvoices(propertyId, cb) {
    return onSnapshot(
        query(collection(db, 'invoices'), where('propertyId', '==', propertyId)),
        (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            cb(docs);
        }
    );
}

/** Subscribe to invoices for a specific unit. */
export function subscribeUnitInvoices(unitId, cb) {
    return onSnapshot(
        query(collection(db, 'invoices'), where('unitId', '==', unitId)),
        (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            cb(docs);
        }
    );
}

/** Get a single invoice by ID. */
export async function getInvoice(invoiceId) {
    const snap = await getDoc(doc(db, 'invoices', invoiceId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get unpaid invoices for a tenant (for payment UI). */
export async function getUnpaidInvoices(tenantId) {
    const snap = await getDocs(
        query(
            collection(db, 'invoices'),
            where('tenantId', '==', tenantId)
        )
    );
    const unpaid = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => ['sent', 'overdue'].includes(d.status));

    return unpaid.sort((a, b) => {
        const ad = a.dueDate?.toMillis?.() || 0;
        const bd = b.dueDate?.toMillis?.() || 0;
        return ad - bd;
    });
}

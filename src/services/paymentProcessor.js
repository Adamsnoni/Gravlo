// src/services/paymentProcessor.js
// ─────────────────────────────────────────────────────────────────────────────
// Post-payment webhook processing pipeline.
// After gateway confirms payment, this orchestrator:
//   ✅ Saves payment invoice record (Firestore)
//   ✅ Generates invoice PDF (client-side download)
//   ✅ Saves tenant receipt
//   ✅ Updates payment history
//   ✅ Updates dashboard analytics (unit status)
//   ✅ Marks rent as PAID
//   ✅ Resets/advances next rent reminder
// ─────────────────────────────────────────────────────────────────────────────
import { addDays, addMonths, addYears } from 'date-fns';
import {
    savePaymentInvoice,
    updateUnit,
    updateReminder,
    addReminder,
    db,
} from './firebase';
import {
    doc, collection, getDocs, query, where, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { generateInvoicePdf } from '../utils/invoicePdf';

/**
 * Generate a unique invoice ID.
 * Format: INV-YYYYMMDD-XXXXX
 */
export function generateInvoiceId() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${date}-${rand}`;
}

/**
 * Generate a unique payment ID.
 * Format: PAY-XXXXXXXXXXXXX
 */
export function generatePaymentId() {
    return `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Calculate the next due date based on billing cycle.
 */
function getNextDueDate(billingCycle, fromDate = new Date()) {
    switch (billingCycle) {
        case 'yearly': return addYears(fromDate, 1);
        case 'weekly': return addDays(fromDate, 7);
        case 'daily': return addDays(fromDate, 1);
        case 'monthly':
        default: return addMonths(fromDate, 1);
    }
}

/**
 * Main post-payment processing pipeline.
 *
 * Call this after webhook confirms payment success.
 * Chains all steps: invoice record → PDF → receipt → analytics → reminder reset.
 *
 * @param {Object} params
 * @param {string} params.landlordId        — property owner UID
 * @param {string} params.tenantId          — tenant UID (or null)
 * @param {string} params.tenantName        — tenant display name
 * @param {string} params.tenantEmail       — tenant email
 * @param {string} params.propertyId        — property document ID
 * @param {string} params.propertyName      — property display name
 * @param {string} params.unitId            — unit document ID
 * @param {string} params.unitName          — unit display name
 * @param {number} params.amount            — payment amount
 * @param {string} params.currency          — currency code (e.g. 'NGN')
 * @param {string} params.billingCycle      — 'monthly' | 'yearly' | 'weekly' | 'daily'
 * @param {string} params.gatewayReference  — payment gateway txn reference
 * @param {string} [params.method]          — payment method (e.g. 'card', 'bank')
 * @param {string} [params.propertyAddress]
 * @param {boolean} [params.downloadPdf]    — whether to trigger PDF download (client-side only)
 * @returns {Object} { invoiceId, paymentId, invoiceData, nextDueDate }
 */
export async function processPaymentWebhook({
    landlordId,
    tenantId,
    tenantName,
    tenantEmail,
    propertyId,
    propertyName,
    unitId,
    unitName,
    amount,
    currency,
    billingCycle = 'monthly',
    gatewayReference,
    method = 'online',
    propertyAddress = '',
    downloadPdf = false,
}) {
    const paymentId = generatePaymentId();
    const invoiceId = generateInvoiceId();

    // ── 1. Save payment invoice record ────────────────────────────────────
    const invoiceData = await savePaymentInvoice({
        landlordId,
        paymentId,
        tenantId,
        unitId,
        propertyId,
        amount,
        currency,
        invoiceId,
        gatewayReference,
        tenantName,
        tenantEmail,
        unitName,
        propertyName,
    });

    // ── 2. Save tenant receipt ────────────────────────────────────────────
    if (tenantId) {
        await setDoc(doc(db, 'users', tenantId, 'receipts', paymentId), {
            paymentId,
            invoiceId,
            propertyId,
            propertyName,
            unitId,
            unitName,
            landlordId,
            amount: Number(amount),
            currency,
            status: 'paid',
            method,
            gatewayReference,
            paidAt: serverTimestamp(),
        });
    }

    // ── 3. Mark unit rent as PAID / update unit status ────────────────────
    if (unitId) {
        await updateUnit(landlordId, propertyId, unitId, {
            lastPaymentId: paymentId,
            lastPaymentDate: serverTimestamp(),
            lastPaymentAmount: Number(amount),
            rentStatus: 'paid',
        });
    }

    // ── 4. Reset / advance rent reminder ──────────────────────────────────
    const nextDueDate = getNextDueDate(billingCycle);
    try {
        // Find and mark existing rent reminders as paid
        const remSnap = await getDocs(
            query(
                collection(db, 'users', landlordId, 'reminders'),
                where('propertyId', '==', propertyId),
                where('status', '!=', 'paid'),
            )
        );
        for (const remDoc of remSnap.docs) {
            await updateReminder(landlordId, remDoc.id, { status: 'paid' });
        }

        // Create next cycle's reminder
        await addReminder(landlordId, {
            title: `Rent due — ${unitName || propertyName}`,
            propertyId,
            unitId: unitId || null,
            dueDate: nextDueDate,
            amount: Number(amount),
            currency,
            type: 'rent',
            tenantName,
            tenantEmail,
        });
    } catch (err) {
        console.warn('Reminder reset warning:', err);
        // Non-blocking — payment is already saved
    }

    // ── 5. Generate invoice PDF (client-side download) ────────────────────
    if (downloadPdf) {
        generateInvoicePdf({
            id: paymentId,
            invoiceNumber: invoiceId,
            propertyId,
            propertyName,
            propertyAddress,
            tenantName,
            tenantEmail,
            amount: Number(amount),
            status: 'paid',
            method,
            paidDate: new Date(),
            recordedAt: new Date(),
            unitNumber: unitName,
        });
    }

    // ── Return summary ────────────────────────────────────────────────────
    return {
        paymentId,
        invoiceId,
        invoiceData,
        nextDueDate,
    };
}

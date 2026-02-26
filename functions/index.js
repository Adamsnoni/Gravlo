// functions/index.js
// ─────────────────────────────────────────────────────────────────────────────
// Gravlo Cloud Functions — Automation Engine
//
// 1. Recurring Invoice Scheduler (runs daily)
// 2. Stripe + Paystack Webhook Handlers
// 3. Reminder Automation (runs daily)
// 4. Overdue Invoice Checker (runs daily)
// 5. Automated Lease Expirations (runs daily)
// 6. Tenancy lifecycle triggers
// ─────────────────────────────────────────────────────────────────────────────
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// ════════════════════════════════════════════════════════════════════════════
// 1. RECURRING INVOICE SCHEDULER
//    Runs daily at 12pm UTC — creates invoices for tenancies due today.
// ════════════════════════════════════════════════════════════════════════════
exports.generateRecurringInvoices = onSchedule('every day 12:00', async (event) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    // Find active tenancies with nextInvoiceDate <= today
    const tenancies = await db.collection('tenancies')
        .where('status', '==', 'active')
        .where('invoiceSchedulingEnabled', '==', true)
        .where('nextInvoiceDate', '<=', admin.firestore.Timestamp.fromDate(todayEnd))
        .get();

    console.log(`Found ${tenancies.size} tenancies needing invoices`);

    const batch = db.batch();
    let count = 0;

    for (const tenancyDoc of tenancies.docs) {
        const t = tenancyDoc.data();
        const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const dueDate = t.nextInvoiceDate;

        // 1. Create Rent Invoice
        const rentInvoiceNumber = `INV-R-${date}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const rentInvoiceRef = db.collection('invoices').doc();
        batch.set(rentInvoiceRef, {
            invoiceNumber: rentInvoiceNumber,
            tenancyId: tenancyDoc.id,
            tenantId: t.tenantId || null,
            landlordId: t.landlordId,
            propertyId: t.propertyId,
            unitId: t.unitId || null,
            propertyName: t.propertyName || '',
            unitName: t.unitName || '',
            tenantName: t.tenantName || '',
            tenantEmail: t.tenantEmail || '',
            amount: t.rentAmount,
            currency: t.currency || 'NGN',
            billingCycle: t.billingCycle || 'monthly',
            type: 'rent',
            status: 'sent',
            dueDate: dueDate,
            paidDate: null,
            paymentId: null,
            gatewayReference: null,
            pdfUrl: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;

        // 2. Create Service Charge Invoice (if enabled)
        if (t.serviceChargeAmount && t.serviceChargeAmount > 0) {
            const scInvoiceNumber = `INV-SC-${date}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
            const scInvoiceRef = db.collection('invoices').doc();
            batch.set(scInvoiceRef, {
                invoiceNumber: scInvoiceNumber,
                tenancyId: tenancyDoc.id,
                tenantId: t.tenantId || null,
                landlordId: t.landlordId,
                propertyId: t.propertyId,
                unitId: t.unitId || null,
                propertyName: t.propertyName || '',
                unitName: t.unitName || '',
                tenantName: t.tenantName || '',
                tenantEmail: t.tenantEmail || '',
                amount: t.serviceChargeAmount,
                currency: t.currency || 'NGN',
                billingCycle: t.billingCycle || 'monthly',
                type: 'service_charge',
                status: 'sent',
                dueDate: dueDate,
                paidDate: null,
                paymentId: null,
                gatewayReference: null,
                pdfUrl: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            count++;
        }

        // Advance nextInvoiceDate on the tenancy
        const nextDate = calculateNextDate(t.billingCycle, dueDate.toDate());
        batch.update(tenancyDoc.ref, {
            nextInvoiceDate: admin.firestore.Timestamp.fromDate(nextDate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Created ${count} invoices`);
    }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. OVERDUE INVOICE CHECKER
//    Runs daily at 7am UTC — marks unpaid invoices past due date as overdue.
// ════════════════════════════════════════════════════════════════════════════
exports.checkOverdueInvoices = onSchedule('every day 07:00', async (event) => {
    const now = admin.firestore.Timestamp.now();

    const invoices = await db.collection('invoices')
        .where('status', '==', 'sent')
        .where('dueDate', '<', now)
        .get();

    console.log(`Found ${invoices.size} overdue invoices`);

    const batch = db.batch();
    for (const invoiceDoc of invoices.docs) {
        batch.update(invoiceDoc.ref, {
            status: 'overdue',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    if (!invoices.empty) {
        await batch.commit();
    }
});

// ════════════════════════════════════════════════════════════════════════════
// 3. AUTOMATED LEASE EXPIRATIONS
//    Runs daily at midnight UTC — terminates active leases if endDate has passed.
// ════════════════════════════════════════════════════════════════════════════
exports.checkExpiredLeases = onSchedule('every day 00:00', async (event) => {
    const now = admin.firestore.Timestamp.now();

    // Query active tenancies where the endDate is tightly defined and exists
    const tenancies = await db.collection('tenancies')
        .where('status', '==', 'active')
        .where('endDate', '<=', now)
        .get();

    console.log(`Found ${tenancies.size} expired tenancies`);

    const batch = db.batch();
    let count = 0;

    for (const docSnap of tenancies.docs) {
        const t = docSnap.data();

        // 1) Terminate the lease
        batch.update(docSnap.ref, {
            status: 'closed',
            closedAt: admin.firestore.FieldValue.serverTimestamp(),
            invoiceSchedulingEnabled: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2) Free up the unit in the landlord's subcollection
        if (t.landlordId && t.propertyId && t.unitId) {
            const unitRef = db.collection('users').doc(t.landlordId)
                .collection('properties').doc(t.propertyId)
                .collection('units').doc(t.unitId);

            batch.update(unitRef, {
                status: 'vacant',
                tenantId: null,
                tenantName: '',
                tenantEmail: '',
                rentStatus: null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // 3) Push a dashboard notification to the Landlord
        if (t.landlordId) {
            const notifRef = db.collection('users').doc(t.landlordId).collection('notifications').doc();
            batch.set(notifRef, {
                title: 'Lease Automatically Expired',
                message: `The lease for ${t.tenantName || 'Tenant'} at ${t.unitName || t.propertyName} has ended and the unit is now vacant.`,
                type: 'lease_end',
                propertyId: t.propertyId,
                unitId: t.unitId || null,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        count++;
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Terminated ${count} expired leases`);
    }
});

// ════════════════════════════════════════════════════════════════════════════
// 4. REMINDER AUTOMATION
//    Runs daily at 8am UTC — creates reminders for invoices due in 30/7/1 days.
// ════════════════════════════════════════════════════════════════════════════
exports.scheduleReminders = onSchedule('every day 08:00', async (event) => {
    const now = new Date();
    const intervals = [30, 7, 1]; // days before due date

    for (const daysBefore of intervals) {
        const targetDate = new Date(now.getTime() + daysBefore * 86400000);
        const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const targetEnd = new Date(targetStart.getTime() + 86400000);

        // Find invoices due on targetDate that are unpaid
        const invoices = await db.collection('invoices')
            .where('status', 'in', ['sent', 'overdue'])
            .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(targetStart))
            .where('dueDate', '<', admin.firestore.Timestamp.fromDate(targetEnd))
            .get();

        for (const invoiceDoc of invoices.docs) {
            const inv = invoiceDoc.data();

            // Check if we've already created a reminder for this interval
            const existingReminder = await db.collection('users')
                .doc(inv.landlordId)
                .collection('reminders')
                .where('invoiceId', '==', invoiceDoc.id)
                .where('daysBefore', '==', daysBefore)
                .get();

            if (!existingReminder.empty) continue;

            const typeLabel = inv.type === 'service_charge' ? 'Service Charge' : 'Rent';

            // Create landlord reminder
            await db.collection('users').doc(inv.landlordId).collection('reminders').add({
                title: `${typeLabel} due ${label} — ${inv.unitName || inv.propertyName}`,
                propertyId: inv.propertyId,
                unitId: inv.unitId || null,
                invoiceId: invoiceDoc.id,
                tenancyId: inv.tenancyId || null,
                dueDate: inv.dueDate,
                amount: inv.amount,
                currency: inv.currency || 'NGN',
                type: inv.type || 'rent',
                daysBefore,
                tenantName: inv.tenantName || '',
                tenantEmail: inv.tenantEmail || '',
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Create tenant reminder (if tenantId exists)
            if (inv.tenantId) {
                await db.collection('users').doc(inv.tenantId).collection('reminders').add({
                    title: `${typeLabel} payment due ${label} — ${inv.unitName || inv.propertyName}`,
                    propertyId: inv.propertyId,
                    unitId: inv.unitId || null,
                    invoiceId: invoiceDoc.id,
                    tenancyId: inv.tenancyId || null,
                    dueDate: inv.dueDate,
                    amount: inv.amount,
                    currency: inv.currency || 'NGN',
                    type: inv.type || 'rent',
                    daysBefore,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
    }

    console.log('Reminder scheduling complete');
});

// ════════════════════════════════════════════════════════════════════════════
// 5. CREATE CHECKOUT SESSION
//    Unified endpoint to generate Paystack checkout URLs.
// ════════════════════════════════════════════════════════════════════════════
const cors = require('cors')({ origin: true });

exports.createCheckoutSession = onRequest(async (req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
        try {
            const {
                gateway, landlordId, propertyId, tenantEmail, amount, currency,
                successUrl, cancelUrl, metadata
            } = req.body;

            const safeAmount = Number(amount);
            if (!safeAmount || safeAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });

            if (gateway === 'paystack') {
                const secret = process.env.PAYSTACK_SECRET_KEY || '';
                const response = await fetch('https://api.paystack.co/transaction/initialize', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${secret}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: tenantEmail,
                        amount: Math.round(safeAmount * 100), // Paystack expects kobo/cents
                        currency: currency.toUpperCase(),
                        callback_url: successUrl,
                        metadata: {
                            landlordId,
                            propertyId,
                            type: metadata.type || 'rent',
                            ...metadata
                        },
                    })
                });
                const data = await response.json();
                if (!data.status) throw new Error(data.message || 'Paystack initialization failed');
                return res.status(200).json({ url: data.data.authorization_url });
            }

            return res.status(400).json({ error: 'Unsupported gateway' });

        } catch (error) {
            console.error('Checkout error:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. PAYSTACK WEBHOOK
// ════════════════════════════════════════════════════════════════════════════
exports.paystackWebhook = onRequest({ cors: false }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    // Verify Paystack signature
    const crypto = require('crypto');
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
        console.error('Paystack signature verification failed');
        res.status(400).send('Invalid signature');
        return;
    }

    const { event: eventType, data } = req.body;

    if (eventType === 'charge.success') {
        const metadata = data.metadata || {};

        await handleSuccessfulPayment({
            invoiceId: metadata.invoiceId || metadata.invoice_id,
            tenantId: metadata.tenantId || metadata.tenant_id,
            landlordId: metadata.landlordId || metadata.landlord_id,
            propertyId: metadata.propertyId || metadata.property_id,
            unitId: metadata.unitId || metadata.unit_id,
            amount: data.amount / 100,
            currency: (data.currency || 'NGN').toUpperCase(),
            type: metadata.type || 'rent',
            gatewayReference: data.reference,
            gateway: 'paystack',
        });
    }

    res.status(200).json({ status: 'ok' });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. TENANCY CLOSE TRIGGER — stops future invoices when tenancy closes
// ════════════════════════════════════════════════════════════════════════════
exports.onTenancyClosed = onDocumentUpdated('tenancies/{tenancyId}', async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only fire when status transitions to 'closed'
    if (before.status === 'closed' || after.status !== 'closed') return;

    const tenancyId = event.params.tenancyId;
    console.log(`Tenancy ${tenancyId} closed — cancelling pending invoices`);

    // Cancel all pending/sent invoices for this tenancy
    const invoices = await db.collection('invoices')
        .where('tenancyId', '==', tenancyId)
        .where('status', 'in', ['draft', 'sent'])
        .get();

    const batch = db.batch();
    for (const invoiceDoc of invoices.docs) {
        batch.update(invoiceDoc.ref, {
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    if (!invoices.empty) {
        await batch.commit();
        console.log(`Cancelled ${invoices.size} pending invoices for tenancy ${tenancyId}`);
    }
});

// ════════════════════════════════════════════════════════════════════════════
//  SHARED — handleSuccessfulPayment
// ════════════════════════════════════════════════════════════════════════════
async function handleSuccessfulPayment({
    invoiceId, tenantId, landlordId, propertyId, unitId,
    amount, currency, type = 'rent', gatewayReference, gateway,
}) {
    // 0) Idempotency Check — protect against duplicate webhooks
    if (gatewayReference) {
        const existingPayments = await db.collection('payments')
            .where('gatewayReference', '==', gatewayReference)
            .limit(1).get();

        if (!existingPayments.empty) {
            console.log(`Payment with reference ${gatewayReference} already processed. Skipping.`);
            return existingPayments.docs[0].id;
        }
    }

    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // 1) Mark invoice as paid
    if (invoiceId) {
        const invoiceRef = db.collection('invoices').doc(invoiceId);
        const invoiceSnap = await invoiceRef.get();
        if (invoiceSnap.exists) {
            const inv = invoiceSnap.data();

            if (inv.status === 'paid') {
                console.log(`Invoice ${invoiceId} is already marked paid. Proceeding to just log payment if not exists.`);
            }

            landlordId = landlordId || inv.landlordId;
            tenantId = tenantId || inv.tenantId;
            propertyId = propertyId || inv.propertyId;
            unitId = unitId || inv.unitId;
            amount = amount || inv.amount;
            currency = currency || inv.currency;

            await invoiceRef.update({
                status: 'paid',
                paidDate: admin.firestore.FieldValue.serverTimestamp(),
                paymentId,
                gatewayReference,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }

    // 2) Create payment record
    const paymentData = {
        paymentId,
        invoiceId: invoiceId || null,
        tenantId: tenantId || null,
        landlordId: landlordId || null,
        propertyId: propertyId || null,
        unitId: unitId || null,
        amount: Number(amount),
        currency,
        type: type || 'rent',
        status: 'paid',
        gateway,
        gatewayReference,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Global payments collection
    await db.collection('payments').doc(paymentId).set(paymentData);

    // Also write into property's payments subcollection (for existing UI)
    if (landlordId && propertyId) {
        await db.collection('users').doc(landlordId)
            .collection('properties').doc(propertyId)
            .collection('payments').doc(paymentId)
            .set({
                ...paymentData,
                paidDate: admin.firestore.FieldValue.serverTimestamp(),
                recordedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
    }

    // 3) Save tenant receipt
    if (tenantId) {
        await db.collection('users').doc(tenantId).collection('receipts').doc(paymentId).set({
            ...paymentData,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // 4) Update unit status
    if (landlordId && propertyId && unitId) {
        const unitUpdate = type === 'service_charge'
            ? {
                lastServiceChargeId: paymentId,
                lastServiceChargeDate: admin.firestore.FieldValue.serverTimestamp(),
                lastServiceChargeAmount: Number(amount),
                serviceChargeStatus: 'paid',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }
            : {
                lastPaymentId: paymentId,
                lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
                lastPaymentAmount: Number(amount),
                rentStatus: 'paid',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

        await db.collection('users').doc(landlordId)
            .collection('properties').doc(propertyId)
            .collection('units').doc(unitId)
            .update(unitUpdate);
    }

    // 5) Mark existing rent reminders as paid
    if (landlordId) {
        const remSnap = await db.collection('users').doc(landlordId).collection('reminders')
            .where('invoiceId', '==', invoiceId)
            .where('status', '!=', 'paid')
            .get();
        for (const rem of remSnap.docs) {
            await rem.ref.update({ status: 'paid' });
        }
    }

    // 6) Generate invoice PDF and store in Firebase Storage
    try {
        const pdfBuffer = generateInvoicePdfBuffer({
            invoiceNumber: invoiceId,
            paymentId,
            amount,
            currency,
            gatewayReference,
            paidDate: new Date(),
        });

        const bucket = storage.bucket();
        const filePath = `invoices/${landlordId}/${propertyId}/${paymentId}.pdf`;
        const file = bucket.file(filePath);
        await file.save(pdfBuffer, { contentType: 'application/pdf' });
        await file.makePublic();

        const pdfUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        // Update invoice with PDF URL
        if (invoiceId) {
            await db.collection('invoices').doc(invoiceId).update({ pdfUrl });
        }
    } catch (err) {
        console.warn('PDF generation warning:', err.message);
        // Non-blocking — payment record is already saved
    }

    console.log(`Payment ${paymentId} processed successfully (${gateway})`);
    return paymentId;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function calculateNextDate(billingCycle, fromDate) {
    const d = new Date(fromDate);
    switch (billingCycle) {
        case 'yearly': return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
        case 'weekly': return new Date(d.getTime() + 7 * 86400000);
        case 'daily': return new Date(d.getTime() + 86400000);
        case 'monthly':
        default: return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
}

/**
 * Server-side PDF generation (minimal — returns a Buffer).
 * Uses jsPDF in Node.js to generate a basic invoice PDF.
 */
function generateInvoicePdfBuffer({ invoiceNumber, paymentId, amount, currency, gatewayReference, paidDate }) {
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF();

    let y = 20;
    doc.setFontSize(18);
    doc.text('Gravlo Rent Invoice', 20, y); y += 10;

    doc.setFontSize(11);
    doc.text(`Invoice #: ${invoiceNumber || 'N/A'}`, 20, y); y += 6;
    doc.text(`Payment ID: ${paymentId}`, 20, y); y += 6;
    doc.text(`Date: ${paidDate.toISOString().slice(0, 10)}`, 20, y); y += 10;

    doc.setFontSize(12);
    doc.text('Payment Summary:', 20, y); y += 7;
    doc.setFontSize(11);
    doc.text(`Amount: ${currency} ${Number(amount).toLocaleString()}`, 20, y); y += 6;
    doc.text(`Status: PAID`, 20, y); y += 6;
    doc.text(`Reference: ${gatewayReference || 'N/A'}`, 20, y); y += 10;

    doc.setFontSize(9);
    doc.text('Thank you for your payment. Keep this invoice for your records.', 20, 275);

    return Buffer.from(doc.output('arraybuffer'));
}

// ════════════════════════════════════════════════════════════════════════════
// 8. ACCEPT UNIT INVITE — Callable Function
//    Called from AcceptInvitePage when the tenant clicks "Accept & Join".
//    Validates token server-side and assigns tenant to the unit atomically.
// ════════════════════════════════════════════════════════════════════════════
const { onCall, HttpsError } = require('firebase-functions/v2/https');

exports.acceptUnitInvite = onCall({ enforceAppCheck: false }, async (request) => {
    const { token } = request.data;
    const callerUid = request.auth?.uid;

    if (!callerUid) throw new HttpsError('unauthenticated', 'You must be signed in to accept an invite.');
    if (!token) throw new HttpsError('invalid-argument', 'Missing invite token.');

    const tokenRef = db.collection('inviteTokens').doc(token);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) throw new HttpsError('not-found', 'Invite token not found.');

    const data = tokenSnap.data();

    // Guard: already accepted
    if (data.status === 'accepted') {
        throw new HttpsError('already-exists', 'This invite has already been accepted.');
    }

    // Guard: explicitly expired
    if (data.status === 'expired') {
        throw new HttpsError('deadline-exceeded', 'This invite link has expired.');
    }

    // Guard: wall-clock expiry
    const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt._seconds * 1000);
    if (new Date() > expiresAt) {
        await tokenRef.update({ status: 'expired' });
        throw new HttpsError('deadline-exceeded', 'This invite link has expired.');
    }

    // Guard: landlord cannot accept their own invite
    if (callerUid === data.landlordUid) {
        throw new HttpsError('permission-denied', 'You cannot accept your own invite.');
    }

    const { landlordUid, propertyId, unitId, unitName, propertyName } = data;

    // Guard: unit must not already be occupied
    const unitRef = db.collection('users').doc(landlordUid)
        .collection('properties').doc(propertyId)
        .collection('units').doc(unitId);

    const unitSnap = await unitRef.get();
    if (unitSnap.exists) {
        const unitData = unitSnap.data();
        if (unitData.status === 'occupied' && unitData.tenantId) {
            throw new HttpsError('already-exists', 'This unit already has a tenant assigned.');
        }
    }

    // Get caller display info
    const callerRecord = await admin.auth().getUser(callerUid);
    const callerEmail = callerRecord.email || '';
    const callerName = callerRecord.displayName || '';

    // Close any stale active tenancies for this unit (safety net)
    const staleTenancies = await db.collection('tenancies')
        .where('landlordId', '==', landlordUid)
        .where('propertyId', '==', propertyId)
        .where('unitId', '==', unitId)
        .where('status', '==', 'active')
        .get();

    // Atomic batch: token + unit + tenancy + stale cleanups
    const batch = db.batch();

    for (const staleDoc of staleTenancies.docs) {
        batch.update(staleDoc.ref, {
            status: 'closed',
            endDate: admin.firestore.FieldValue.serverTimestamp(),
            closedAt: admin.firestore.FieldValue.serverTimestamp(),
            invoiceSchedulingEnabled: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    const unitData = unitSnap.exists ? unitSnap.data() : {};

    // Security: Use rentAmount and billingCycle directly from the token payload (`data`)
    // rather than the live unit database to prevent bait-and-switch pricing
    const rentAmount = data.rentAmount || unitData.rentAmount || 0;
    const billingCycle = data.billingCycle || unitData.billingCycle || 'monthly';

    // Calculate nextInvoiceDate
    const now = new Date();
    let nextInvoiceDate;
    switch (billingCycle) {
        case 'yearly': nextInvoiceDate = new Date(now.getFullYear() + 1, now.getMonth(), 1); break;
        case 'weekly': nextInvoiceDate = new Date(now.getTime() + 7 * 86400000); break;
        case 'daily': nextInvoiceDate = new Date(now.getTime() + 86400000); break;
        default: nextInvoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    batch.update(tokenRef, {
        status: 'accepted',
        acceptedBy: callerUid,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.update(unitRef, {
        tenantId: callerUid,
        tenantName: callerName,
        tenantEmail: callerEmail,
        status: 'occupied',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create tenancy record (enables recurring invoice scheduling)
    const tenancyRef = db.collection('tenancies').doc();
    batch.set(tenancyRef, {
        tenantId: callerUid,
        landlordId: landlordUid,
        propertyId,
        unitId,
        tenantName: callerName,
        tenantEmail: callerEmail,
        unitName: unitName || unitData.unitName || '',
        propertyName: propertyName || '',
        rentAmount,
        billingCycle,
        currency: unitData.currency || 'NGN',
        status: 'active',
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        endDate: null,
        closedAt: null,
        invoiceSchedulingEnabled: true,
        nextInvoiceDate: admin.firestore.Timestamp.fromDate(nextInvoiceDate),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log(`Invite ${token} accepted by ${callerUid} for unit ${unitId} — tenancy ${tenancyRef.id} created`);

    return { success: true, propertyId, unitId, landlordUid, tenancyId: tenancyRef.id };
});

// ════════════════════════════════════════════════════════════════════════════
// 9. APPROVE TENANT REQUEST — Callable Function
//    Called by Landlords from PropertiesPage or Dashboard.
//    Atomicly sets unit to occupied, creates tenancy, and clears notifications.
// ════════════════════════════════════════════════════════════════════════════
exports.approveTenantRequest = onCall({ enforceAppCheck: false }, async (request) => {
    const { propertyId, unitId, tenantId } = request.data;
    const landlordUid = request.auth?.uid;

    if (!landlordUid) throw new HttpsError('unauthenticated', 'You must be signed in.');
    if (!propertyId || !unitId || !tenantId) throw new HttpsError('invalid-argument', 'Missing fields.');

    const unitRef = db.collection('users').doc(landlordUid)
        .collection('properties').doc(propertyId)
        .collection('units').doc(unitId);

    const unitSnap = await unitRef.get();
    if (!unitSnap.exists) throw new HttpsError('not-found', 'Unit not found.');

    const unitData = unitSnap.data();
    if (unitData.landlordId !== landlordUid) throw new HttpsError('permission-denied', 'Ownership mismatch.');
    if (unitData.pendingTenantId !== tenantId) throw new HttpsError('failed-precondition', 'Tenant ID mismatch or request no longer pending.');

    // Fetch tenant display info
    const tenantRecord = await admin.auth().getUser(tenantId);
    const tenantEmail = tenantRecord.email || '';
    const tenantName = tenantRecord.displayName || '';

    // Fetch property info for denormalization
    const propSnap = await db.collection('users').doc(landlordUid).collection('properties').doc(propertyId).get();
    const propData = propSnap.exists ? propSnap.data() : {};

    // Atomic Batch
    const batch = db.batch();

    // 1) Update Unit
    batch.update(unitRef, {
        status: 'occupied',
        tenantId: tenantId,
        tenantName: tenantName,
        tenantEmail: tenantEmail,
        pendingTenantId: null,
        pendingTenantName: null,
        pendingTenantEmail: null,
        pendingRequestedAt: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2) Create Tenancy
    const billingCycle = unitData.billingCycle || 'monthly';
    const now = new Date();
    let nextInvoiceDate;
    switch (billingCycle) {
        case 'yearly': nextInvoiceDate = new Date(now.getFullYear() + 1, now.getMonth(), 1); break;
        case 'weekly': nextInvoiceDate = new Date(now.getTime() + 7 * 86400000); break;
        case 'daily': nextInvoiceDate = new Date(now.getTime() + 86400000); break;
        default: nextInvoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    const tenancyRef = db.collection('tenancies').doc();
    batch.set(tenancyRef, {
        tenantId: tenantId,
        landlordId: landlordUid,
        propertyId,
        unitId,
        tenantName: tenantName,
        tenantEmail: tenantEmail,
        unitName: unitData.name || unitData.unitNumber || '',
        propertyName: propData.name || '',
        address: propData.address || '',
        rentAmount: unitData.price || unitData.rentAmount || 0,
        billingCycle: billingCycle,
        currency: unitData.currency || propData.currency || 'NGN',
        status: 'active',
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        endDate: null,
        closedAt: null,
        invoiceSchedulingEnabled: true,
        nextInvoiceDate: admin.firestore.Timestamp.fromDate(nextInvoiceDate),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        welcomeMessageSent: true,
        welcomeMessageDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3) Clear Notifications for this specific request
    const notifSnap = await db.collection('users').doc(landlordUid).collection('notifications')
        .where('type', '==', 'unit_request')
        .where('unitId', '==', unitId)
        .where('tenantId', '==', tenantId)
        .get();

    notifSnap.docs.forEach(d => batch.delete(d.ref));

    await batch.commit();

    console.log(`Landlord ${landlordUid} approved request for unit ${unitId} by tenant ${tenantId}. Tenancy ${tenancyRef.id} created.`);
    return { success: true, tenancyId: tenancyRef.id };
});


// src/services/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// Replace the firebaseConfig values with your project credentials from:
// https://console.firebase.google.com → Project Settings → Your apps
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  serverTimestamp, Timestamp, writeBatch,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export { serverTimestamp };

// 🔴 Replace with your Firebase project config
const firebaseConfig = {
  apiKey: 'AIzaSyAUoBd0RUQgHCmC5gVh3CcAU6rNgjW00nw',
  authDomain: 'leaseease-updated.firebaseapp.com',
  projectId: 'leaseease-updated',
  storageBucket: 'leaseease-updated.firebasestorage.app',
  messagingSenderId: '608675835471',
  appId: '1:608675835471:web:6e1ee6d75c1eed7a39c43a',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════
export const registerUser = async ({ email, password, fullName, phone, countryCode, role = 'landlord' }) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: fullName });
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid, email, fullName, phone: phone || '',
    countryCode: countryCode || 'NG',
    role,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return user;
};

export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => fbSignOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const listenAuth = (cb) => onAuthStateChanged(auth, cb);

// ════════════════════════════════════════════════════════════════════════════
// USER PROFILE
// ════════════════════════════════════════════════════════════════════════════
export const getProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = (uid, data) =>
  updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });

// ════════════════════════════════════════════════════════════════════════════
// PROPERTIES
// ════════════════════════════════════════════════════════════════════════════
export const addProperty = (uid, data) =>
  addDoc(collection(db, 'users', uid, 'properties'), {
    ...data, ownerId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

export const updateProperty = (uid, id, data) =>
  updateDoc(doc(db, 'users', uid, 'properties', id), { ...data, updatedAt: serverTimestamp() });

export const deleteProperty = async (uid, id) => {
  // Hard constraint: Cannot delete a property if it has active tenancies
  const activeTenancies = await getDocs(
    query(
      collection(db, 'tenancies'),
      where('landlordId', '==', uid),
      where('propertyId', '==', id),
      where('status', '==', 'active')
    )
  );
  if (!activeTenancies.empty) {
    throw new Error('Cannot delete property: There are still active leases attached. Please move out tenants first.');
  }

  return deleteDoc(doc(db, 'users', uid, 'properties', id));
};

export const subscribeProperties = (uid, cb) =>
  onSnapshot(query(collection(db, 'users', uid, 'properties'), orderBy('createdAt', 'desc')), (snap) =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

/**
 * One-shot check if a landlord has any properties.
 * Used for onboarding redirect logic.
 */
export const checkPropertiesExist = async (uid) => {
  const qArr = query(collection(db, 'users', uid, 'properties'), limit(1));
  const snap = await getDocs(qArr);
  return !snap.empty;
};

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════════════════════
export const addPayment = (uid, propId, data) =>
  addDoc(collection(db, 'users', uid, 'properties', propId, 'payments'), {
    ...data, recordedAt: serverTimestamp(),
  });

export const updatePayment = (uid, propId, payId, data) =>
  updateDoc(doc(db, 'users', uid, 'properties', propId, 'payments', payId), data);

export const deletePayment = (uid, propId, payId) =>
  deleteDoc(doc(db, 'users', uid, 'properties', propId, 'payments', payId));

export const subscribePayments = (uid, propId, cb) =>
  onSnapshot(query(collection(db, 'users', uid, 'properties', propId, 'payments'), orderBy('paidDate', 'desc')), (snap) =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

// For tenants: watch all payments across landlords/properties for this tenant UID
export const subscribeTenantPayments = (tenantId, cb) =>
  onSnapshot(
    query(
      collectionGroup(db, 'payments'),
      where('tenantId', '==', tenantId)
    ),
    (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.paidDate?.toMillis?.() || 0) - (a.paidDate?.toMillis?.() || 0));
      cb(docs);
    },
    (error) => console.error("Error subscribing to payments:", error)
  );

// ════════════════════════════════════════════════════════════════════════════
// INVOICES  (top-level collection for global lookups)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Save a structured invoice record after successful payment.
 * Writes to:
 *   1) Top-level `invoices/{invoiceId}` — for global lookups
 *   2) `users/{uid}/properties/{propertyId}/payments/{paymentId}` — for property payment history
 *
 * @param {Object} params
 * @param {string} params.landlordId  — property owner UID
 * @param {string} params.paymentId   — unique payment ID (from gateway or generated)
 * @param {string} params.tenantId    — tenant UID or null
 * @param {string} params.unitId      — unit document ID
 * @param {string} params.propertyId  — property document ID
 * @param {number} params.amount      — amount paid
 * @param {string} params.currency    — currency code (e.g. 'NGN', 'USD')
 * @param {string} params.invoiceId   — generated invoice number
 * @param {string} params.gatewayReference — payment gateway reference/txn ID
 * @param {string} [params.tenantName]
 * @param {string} [params.tenantEmail]
 * @param {string} [params.unitName]
 * @param {string} [params.propertyName]
 */
export const savePaymentInvoice = async ({
  landlordId, paymentId, tenantId, unitId, propertyId,
  amount, currency, invoiceId, gatewayReference,
  tenantName = '', tenantEmail = '', unitName = '', propertyName = '',
}) => {
  const invoiceData = {
    paymentId,
    tenantId: tenantId || null,
    unitId: unitId || null,
    propertyId,
    landlordId,
    amount: Number(amount),
    currency,
    invoiceId,
    status: 'paid',
    timestamp: serverTimestamp(),
    gatewayReference: gatewayReference || '',
    // Denormalized display fields
    tenantName,
    tenantEmail,
    unitName,
    propertyName,
  };

  // 1) Top-level invoices collection (global lookups)
  await setDoc(doc(db, 'invoices', invoiceId), invoiceData);

  // 2) Property payments subcollection (property payment history)
  await setDoc(doc(db, 'users', landlordId, 'properties', propertyId, 'payments', paymentId), {
    ...invoiceData,
    paidDate: serverTimestamp(),
    recordedAt: serverTimestamp(),
  });

  return invoiceData;
};

/**
 * Retrieve a single invoice by its ID.
 */
export const getInvoice = async (invoiceId) => {
  const snap = await getDoc(doc(db, 'invoices', invoiceId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/**
 * Subscribe to all invoices for a specific tenant.
 */
export const subscribeInvoicesByTenant = (tenantId, cb) =>
  onSnapshot(
    query(collection(db, 'invoices'), where('tenantId', '==', tenantId)),
    (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      cb(docs);
    },
    (error) => console.error("Error subscribing to invoices:", error)
  );

// ════════════════════════════════════════════════════════════════════════════
// REMINDERS
// ════════════════════════════════════════════════════════════════════════════
export const addReminder = (uid, data) =>
  addDoc(collection(db, 'users', uid, 'reminders'), {
    ...data, createdAt: serverTimestamp(), status: 'pending',
  });

export const updateReminder = (uid, id, data) =>
  updateDoc(doc(db, 'users', uid, 'reminders', id), data);

export const deleteReminder = (uid, id) =>
  deleteDoc(doc(db, 'users', uid, 'reminders', id));

export const subscribeReminders = (uid, cb) =>
  onSnapshot(query(collection(db, 'users', uid, 'reminders'), orderBy('dueDate', 'asc')), (snap) =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

// ════════════════════════════════════════════════════════════════════════════
// MAINTENANCE
// ════════════════════════════════════════════════════════════════════════════
export const addMaintenance = (uid, propId, data) =>
  addDoc(collection(db, 'users', uid, 'properties', propId, 'maintenance'), {
    ...data, createdAt: serverTimestamp(), status: 'open',
  });

export const updateMaintenance = (uid, propId, id, data) =>
  updateDoc(doc(db, 'users', uid, 'properties', propId, 'maintenance', id), data);

export const subscribeMaintenance = (uid, propId, cb) =>
  onSnapshot(query(collection(db, 'users', uid, 'properties', propId, 'maintenance'), orderBy('createdAt', 'desc')), (snap) =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

// For tenants: watch all maintenance tickets where tenantId matches
export const subscribeTenantMaintenance = (tenantId, cb) =>
  onSnapshot(
    query(
      collectionGroup(db, 'maintenance'),
      where('tenantId', '==', tenantId)
    ),
    (snap) => {
      const docs = snap.docs.map(d => {
        const pathSegments = d.ref.path.split('/');
        return {
          id: d.id,
          landlordId: pathSegments[1],
          propertyId: pathSegments[3],
          ...d.data()
        };
      });
      docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      cb(docs);
    }
  );

// ════════════════════════════════════════════════════════════════════════════
// UNITS  (properties/{propertyId}/units/{unitId})
// ════════════════════════════════════════════════════════════════════════════
export const addUnit = (uid, propId, data) =>
  addDoc(collection(db, 'users', uid, 'properties', propId, 'units'), {
    ...data, landlordId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

export const updateUnit = (uid, propId, unitId, data) =>
  updateDoc(doc(db, 'users', uid, 'properties', propId, 'units', unitId), {
    ...data, updatedAt: serverTimestamp(),
  });

export const deleteUnit = async (uid, propId, unitId) => {
  // Hard constraint: Cannot delete a unit if it has an active tenancy
  const activeTenancies = await getDocs(
    query(
      collection(db, 'tenancies'),
      where('landlordId', '==', uid),
      where('unitId', '==', unitId),
      where('status', '==', 'active')
    )
  );
  if (!activeTenancies.empty) {
    throw new Error('Cannot delete unit: There is an active lease attached. Please move out the tenant first.');
  }

  return deleteDoc(doc(db, 'users', uid, 'properties', propId, 'units', unitId));
};

export const subscribeUnits = (uid, propId, cb) =>
  onSnapshot(
    query(collection(db, 'users', uid, 'properties', propId, 'units'), orderBy('createdAt', 'desc')),
    (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
  );

export const subscribeTenantProperties = (email, cb) =>
  onSnapshot(
    query(collectionGroup(db, 'units'), where('tenantEmail', '==', email)),
    (snap) => cb(snap.docs.map(d => {
      const segments = d.ref.path.split('/');
      return {
        id: d.id,
        propertyId: segments.length > 3 ? segments[3] : '',
        ...d.data()
      };
    })),
    (err) => console.error(err)
  );

export const subscribePendingUnitsCount = (uid, cb) =>
  onSnapshot(
    query(
      collectionGroup(db, 'units'),
      where('landlordId', '==', uid),
      where('status', '==', 'pending_approval'),
    ),
    (snap) => cb(snap.size)
  );

/**
 * Subscribe to all units with status 'pending_approval' owned by the landlord.
 * Uses collectionGroup — requires a Firestore composite index on (landlordId, status).
 * If the console shows an index link, click it to create it automatically.
 */
export const subscribePendingUnits = (uid, cb) =>
  onSnapshot(
    query(
      collectionGroup(db, 'units'),
      where('landlordId', '==', uid),
      where('status', '==', 'pending_approval'),
    ),
    (snap) => cb(snap.docs.map(d => {
      // Path: users/{uid}/properties/{propertyId}/units/{unitId}
      const pathSegments = d.ref.path.split('/');
      const propertyId = pathSegments[3];
      return { id: d.id, propertyId, ...d.data() };
    })),
  );


/**
 * Create multiple units in a single atomic batch write.
 *
 * @param {string}   uid            — landlord UID
 * @param {string}   propId         — property document ID
 * @param {string[]} unitNamesArray — array of unit name strings (e.g. ['Unit 1A', 'Unit 1B'])
 * @param {Object}   [baseData={}]  — shared fields merged into every unit (e.g. { rent, currency })
 * @returns {Promise<string[]>}     — array of newly created unit document IDs
 */
export const addUnitsBatch = async (uid, propId, unitNamesArray, baseData = {}) => {
  if (!unitNamesArray || unitNamesArray.length === 0) return [];

  const batch = writeBatch(db);
  const unitsCol = collection(db, 'users', uid, 'properties', propId, 'units');
  const now = serverTimestamp();
  const refs = [];

  for (const name of unitNamesArray) {
    const ref = doc(unitsCol);          // auto-generated ID
    refs.push(ref);
    batch.set(ref, {
      ...baseData,
      name,
      status: 'vacant',
      landlordId: uid,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  return refs.map(r => r.id);
};

// ════════════════════════════════════════════════════════════════════════════
// UNIT APPROVAL FLOW  (building-portal / tenant self-selection)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all vacant units for a property (one-shot read).
 * @param {string} landlordUid
 * @param {string} propertyId
 * @returns {Promise<Array>}
 */
export const getVacantUnits = async (landlordUid, propertyId) => {
  const snap = await getDocs(
    query(
      collection(db, 'users', landlordUid, 'properties', propertyId, 'units'),
      where('status', '==', 'vacant'),
    )
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

/**
 * Tenant requests to join a specific vacant unit.
 * Sets the unit to status:'pending_approval' and writes a landlord notification.
 *
 * @param {string} landlordUid
 * @param {string} propertyId
 * @param {string} unitId
 * @param {{ uid, displayName, email }} tenantUser
 */
export const requestUnitApproval = async (landlordUid, propertyId, unitId, tenantUser) => {
  const unitRef = doc(db, 'users', landlordUid, 'properties', propertyId, 'units', unitId);
  const unitSnap = await getDoc(unitRef);
  if (!unitSnap.exists()) throw new Error('Unit not found.');

  const unit = unitSnap.data();
  if (unit.status !== 'vacant') throw new Error('Unit is no longer available.');

  // Mark unit as pending
  await updateDoc(unitRef, {
    status: 'pending_approval',
    pendingTenantId: tenantUser.uid,
    pendingTenantName: tenantUser.displayName || '',
    pendingTenantEmail: tenantUser.email || '',
    pendingRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Write a notification for the landlord
  await addDoc(collection(db, 'users', landlordUid, 'notifications'), {
    type: 'unit_request',
    propertyId,
    unitId,
    unitName: unit.name || unitId,
    tenantId: tenantUser.uid,
    tenantName: tenantUser.displayName || '',
    tenantEmail: tenantUser.email || '',
    createdAt: serverTimestamp(),
    read: false,
  });
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════════
export const subscribeNotifications = (uid, cb) =>
  onSnapshot(
    query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
    (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const markNotificationRead = (uid, notifId) =>
  updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true });

export const deleteNotification = (uid, notifId) =>
  deleteDoc(doc(db, 'users', uid, 'notifications', notifId));

export const clearUnitRequestNotifications = async (landlordId, propertyId, unitId, tenantId) => {
  if (!landlordId || !propertyId || !unitId || !tenantId) return;
  const q = query(
    collection(db, 'users', landlordId, 'notifications'),
    where('type', '==', 'unit_request')
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batchOp = writeBatch(db);
  let hasDeletes = false;

  snap.docs.forEach(d => {
    const data = d.data();
    if (data.propertyId === propertyId && data.unitId === unitId && data.tenantId === tenantId) {
      batchOp.delete(d.ref);
      hasDeletes = true;
    }
  });

  if (hasDeletes) {
    await batchOp.commit();
  }
};

export const subscribeUnreadNotificationsCount = (uid, cb) =>
  onSnapshot(
    query(collection(db, 'users', uid, 'notifications'), where('read', '==', false)),
    (snap) => cb(snap.size)
  );

/**
 * Bulk actions for notifications pane
 */
export const markAllNotificationsRead = async (uid) => {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'notifications'), where('read', '==', false))
  );
  if (snap.empty) return;
  const batchOp = writeBatch(db);
  snap.docs.forEach(d => batchOp.update(d.ref, { read: true }));
  await batchOp.commit();
};

export const clearAllNotifications = async (uid) => {
  const snap = await getDocs(collection(db, 'users', uid, 'notifications'));
  if (snap.empty) return;
  const batchOp = writeBatch(db);
  // Note: Firestore limits batches to 500 ops. In reality we cap UI fetch at 50, 
  // but if many exist, we take the top 500.
  snap.docs.slice(0, 500).forEach(d => batchOp.delete(d.ref));
  await batchOp.commit();
};

// ════════════════════════════════════════════════════════════════════════════
// CLOUD FUNCTIONS (Secure RPCs)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Accept a unit invite link (Securely handled on server)
 */
export const callAcceptUnitInvite = (data) => httpsCallable(functions, 'acceptUnitInvite')(data);

/**
 * Approve a tenant join request (Securely handled on server)
 */
export const callApproveTenantRequest = (data) => httpsCallable(functions, 'approveTenantRequest')(data);

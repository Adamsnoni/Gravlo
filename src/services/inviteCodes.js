// src/services/inviteCodes.js
// ─────────────────────────────────────────────────────────────────────────────
// Invite-code generation, persistence (Firestore) and validation.
// Codes are 6-char uppercase alphanumeric (ambiguous chars excluded).
// ─────────────────────────────────────────────────────────────────────────────
import {
    db,
} from './firebase';
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, query, where, getDocs,
    serverTimestamp,
} from 'firebase/firestore';

// Characters used — excludes 0/O, 1/I/L to avoid visual confusion
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a cryptographically-random 6-char invite code.
 */
export function generateInviteCode(length = 6) {
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join('');
}

/**
 * Create an invite code for a property and persist it.
 * - Writes a top-level `inviteCodes/{code}` doc (for tenant lookup).
 * - Denormalises the code onto the property doc (`inviteCode` field).
 *
 * Returns the generated code string.
 */
export async function createInviteCode(landlordUid, propertyId, propertyName) {
    let code = generateInviteCode();

    // Retry (extremely unlikely collision) until we get a unique code
    let exists = await getDoc(doc(db, 'inviteCodes', code));
    let attempts = 0;
    while (exists.exists() && attempts < 5) {
        code = generateInviteCode();
        exists = await getDoc(doc(db, 'inviteCodes', code));
        attempts++;
    }

    // Write top-level invite doc (keyed by code for O(1) lookup)
    await setDoc(doc(db, 'inviteCodes', code), {
        code,
        landlordUid,
        propertyId,
        propertyName: propertyName || '',
        status: 'active',
        createdAt: serverTimestamp(),
    });

    // Denormalise onto the property document
    const propRef = doc(db, 'users', landlordUid, 'properties', propertyId);
    await updateDoc(propRef, { inviteCode: code });

    return code;
}

/**
 * Fetch the active invite code for a given property (if any).
 * Returns the code string or null.
 */
export async function getInviteCodeForProperty(landlordUid, propertyId) {
    try {
        // Try the composite query first
        const q = query(
            collection(db, 'inviteCodes'),
            where('landlordUid', '==', landlordUid),
            where('propertyId', '==', propertyId),
            where('status', '==', 'active'),
        );
        const snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].data().code;
    } catch (err) {
        // Query may fail if composite index is not yet deployed — fall back
        console.warn('inviteCodes composite query failed, falling back to property doc:', err.message);
    }

    // Fallback: read the denormalized inviteCode field from the property doc
    try {
        const propSnap = await getDoc(doc(db, 'users', landlordUid, 'properties', propertyId));
        if (propSnap.exists()) {
            const inviteCode = propSnap.data().inviteCode;
            if (inviteCode) {
                // Verify the code doc still exists and is active
                const codeSnap = await getDoc(doc(db, 'inviteCodes', inviteCode));
                if (codeSnap.exists() && codeSnap.data().status === 'active') {
                    return inviteCode;
                }
            }
        }
    } catch (err) {
        console.warn('Fallback invite code read failed:', err.message);
    }

    return null;
}

/**
 * Validate an invite code.
 * Returns the invite doc data if active, otherwise null.
 */
export async function validateInviteCode(code) {
    if (!code || code.length !== 6) return null;
    const snap = await getDoc(doc(db, 'inviteCodes', code.toUpperCase()));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.status === 'active' ? data : null;
}

/**
 * Revoke an existing invite code.
 */
export async function revokeInviteCode(code) {
    const ref = doc(db, 'inviteCodes', code);
    await updateDoc(ref, { status: 'revoked' });
}

/**
 * Regenerate: revoke the current code (if any) and create a fresh one.
 * Returns the new code string.
 */
export async function regenerateInviteCode(landlordUid, propertyId, propertyName) {
    const oldCode = await getInviteCodeForProperty(landlordUid, propertyId);
    if (oldCode) {
        await revokeInviteCode(oldCode);
    }
    return createInviteCode(landlordUid, propertyId, propertyName);
}

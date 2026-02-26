// src/services/inviteTokens.js
// ─────────────────────────────────────────────────────────────────────────────
// Secure per-unit invite link system.
// Tokens are UUID-v4 strings, stored in `inviteTokens/{token}`.
// Links expire after 24 hours.  Auto-assigns tenant on acceptance.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from './firebase';
import {
    doc, getDoc, setDoc, updateDoc, collection,
    query, where, getDocs, Timestamp,
} from 'firebase/firestore';
import { updateUnit } from './firebase';
import { createTenancy, terminateActiveLeasesForUnit } from './tenancy';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a URL-friendly slug from text */
function generateSlug(text) {
    return (text || 'invite')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumerics with hyphens
        .replace(/^-+|-+$/g, '');    // trim leading/trailing hyphens
}

/** Build the full invite URL from a token */
export function buildInviteLink(token) {
    return `${window.location.origin}/join/${token}`;
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new invite token for a specific unit.
 * Revokes any existing pending token for the same unit first.
 * Returns { token, link, expiresAt }
 */
export async function createInviteToken({
    landlordUid, propertyId, unitId = null, unitName = '', propertyName,
}) {
    // Revoke existing pending tokens for this unit (if unit-specific)
    if (unitId) {
        await revokePendingTokensForUnit(propertyId, unitId);
    }

    // Generate a unique slug: property-name-random6
    const slugBase = generateSlug(propertyName);
    const shortRandom = crypto.randomUUID().split('-')[0].substring(0, 6); // 6-char random
    const token = `${slugBase}-${shortRandom}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

    await setDoc(doc(db, 'inviteTokens', token), {
        token,
        landlordUid,
        propertyId,
        unitId,
        unitName: unitName || '',
        propertyName: propertyName || '',
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        status: 'pending',
        acceptedBy: null,
    });

    return { token, link: buildInviteLink(token), expiresAt };
}

// ── Fetch & Validate ──────────────────────────────────────────────────────────

/**
 * Fetch an invite token doc and check validity.
 * Returns { data, valid, reason }
 * reason: 'ok' | 'not_found' | 'expired' | 'already_used' | 'unit_occupied'
 */
export async function fetchInviteToken(token) {
    if (!token) return { data: null, valid: false, reason: 'not_found' };

    const snap = await getDoc(doc(db, 'inviteTokens', token));
    if (!snap.exists()) return { data: null, valid: false, reason: 'not_found' };

    const data = snap.data();

    if (data.status === 'accepted') {
        return { data, valid: false, reason: 'already_used' };
    }

    if (data.status === 'expired') {
        return { data, valid: false, reason: 'expired' };
    }

    // Wall-clock expiry check
    const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
    if (new Date() > expiresAt) {
        await updateDoc(doc(db, 'inviteTokens', token), { status: 'expired' });
        return { data, valid: false, reason: 'expired' };
    }

    // Guard: check if the unit is already occupied (only for unit-specific tokens)
    if (data.unitId) {
        const unitRef = doc(db, 'users', data.landlordUid, 'properties', data.propertyId, 'units', data.unitId);
        const unitSnap = await getDoc(unitRef);
        if (unitSnap.exists()) {
            const unit = unitSnap.data();
            if (unit.status === 'occupied' && unit.tenantId) {
                return { data, valid: false, reason: 'unit_occupied' };
            }
        }
    }

    return { data, valid: true, reason: 'ok' };
}

// ── Accept ────────────────────────────────────────────────────────────────────

/**
 * Accept an invite.  (Now securely handled via Cloud Function)
 *
 * @param {string} token
 * @param {{ uid, displayName, email }} tenantUser
 */
export async function acceptInviteToken(token, tenantUser) {
    const { callAcceptUnitInvite } = await import('./firebase');
    const response = await callAcceptUnitInvite({ token });
    return response.data;
}

// ── Revoke ────────────────────────────────────────────────────────────────────

export async function revokeToken(token) {
    await updateDoc(doc(db, 'inviteTokens', token), { status: 'expired' });
}

export async function revokePendingTokensForUnit(propertyId, unitId) {
    try {
        const q = query(
            collection(db, 'inviteTokens'),
            where('propertyId', '==', propertyId),
            where('unitId', '==', unitId),
            where('status', '==', 'pending'),
        );
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => updateDoc(d.ref, { status: 'expired' })));
    } catch (err) {
        console.warn('revokePendingTokensForUnit query failed (add composite index):', err.message);
    }
}

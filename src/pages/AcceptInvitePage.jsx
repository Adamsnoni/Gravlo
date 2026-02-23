// src/pages/AcceptInvitePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public page — validates a unit invite token and lets the tenant accept it.
// Works for both logged-in users and new users (redirect to register).
// Route: /invite/:token
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Check, Clock, AlertTriangle, KeyRound, Loader2, DoorOpen, UserX } from 'lucide-react';
import { fetchInviteToken, acceptInviteToken } from '../services/inviteTokens';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const INVITE_TOKEN_KEY = 'leaseease_pending_invite';

/** Store token so it survives the register/login redirect */
export function savePendingInvite(token) {
    sessionStorage.setItem(INVITE_TOKEN_KEY, token);
}

export function consumePendingInvite() {
    const t = sessionStorage.getItem(INVITE_TOKEN_KEY);
    sessionStorage.removeItem(INVITE_TOKEN_KEY);
    return t;
}

export default function AcceptInvitePage() {
    const { token } = useParams();
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    const [status, setStatus] = useState('loading'); // loading | valid | expired | used | occupied | error | accepting | done
    const [inviteData, setInviteData] = useState(null);
    const [expiresAt, setExpiresAt] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const { data, valid, reason } = await fetchInviteToken(token);
                if (valid) {
                    setInviteData(data);
                    const exp = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
                    setExpiresAt(exp);
                    setStatus('valid');
                } else {
                    if (reason === 'already_used') setStatus('used');
                    else if (reason === 'expired') setStatus('expired');
                    else if (reason === 'unit_occupied') setStatus('occupied');
                    else setStatus('error');
                    setInviteData(data);
                }
            } catch {
                setStatus('error');
            }
        })();
    }, [token]);

    const handleAccept = async () => {
        if (!user) {
            // Not logged in — save token and redirect to register
            savePendingInvite(token);
            navigate(`/register?invite=${token}`, { replace: true });
            return;
        }

        // Tenant must not be the landlord
        if (user.uid === inviteData?.landlordUid) {
            toast.error("You can't accept your own invite.");
            return;
        }

        setStatus('accepting');
        try {
            await acceptInviteToken(token, user);
            setStatus('done');
            toast.success('You\'ve been added to the unit!');
        } catch (err) {
            toast.error('Failed to accept invite: ' + err.message);
            setStatus('valid');
        }
    };

    // ── Done ──────────────────────────────────────────────────────────────────
    if (status === 'done') {
        return (
            <PageShell>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-sage/15 flex items-center justify-center">
                        <Check size={36} className="text-sage" />
                    </div>
                    <h2 className="font-display text-ink text-2xl font-semibold">You're in!</h2>
                    <p className="font-body text-stone-500 text-sm max-w-xs">
                        You've been assigned to <strong>{inviteData?.unitName}</strong> at <strong>{inviteData?.propertyName}</strong>.
                    </p>
                    <button onClick={() => navigate('/tenant')} className="btn-primary mt-2">
                        <Home size={16} /> Go to My Homes
                    </button>
                </motion.div>
            </PageShell>
        );
    }

    // ── Unit already occupied ─────────────────────────────────────────────────
    if (status === 'occupied') {
        return (
            <PageShell>
                <StatusCard
                    icon={UserX} iconClass="text-amber"
                    title="Unit Already Taken"
                    message={`${inviteData?.unitName ? `"${inviteData.unitName}" at ` : ''}${inviteData?.propertyName || 'this property'} already has a tenant assigned. Contact your landlord if you believe this is an error.`}
                />
            </PageShell>
        );
    }

    // ── Expired ───────────────────────────────────────────────────────────────
    if (status === 'expired') {
        return (
            <PageShell>
                <StatusCard
                    icon={Clock} iconClass="text-amber"
                    title="Link Expired"
                    message="This invite link has expired (links are valid for 24 hours). Please ask your landlord to send a new one."
                />
            </PageShell>
        );
    }

    // ── Already used ──────────────────────────────────────────────────────────
    if (status === 'used') {
        return (
            <PageShell>
                <StatusCard
                    icon={Check} iconClass="text-sage"
                    title="Already Accepted"
                    message="This invite has already been used. If you think this is a mistake, contact your landlord."
                    action={user ? <button onClick={() => navigate('/tenant')} className="btn-primary mt-2"><Home size={15} /> My Homes</button> : null}
                />
            </PageShell>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (status === 'error') {
        return (
            <PageShell>
                <StatusCard
                    icon={AlertTriangle} iconClass="text-rust"
                    title="Invalid Link"
                    message="This invite link doesn't exist or has been revoked. Please ask your landlord for a new invite."
                />
            </PageShell>
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <PageShell>
                <Loader2 size={32} className="text-sage animate-spin" />
                <p className="font-body text-sm text-stone-400 mt-4">Checking your invite…</p>
            </PageShell>
        );
    }

    // ── Valid ─────────────────────────────────────────────────────────────────
    return (
        <PageShell>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm space-y-5">

                {/* Property card */}
                <div className="card overflow-hidden">
                    <div className="bg-gradient-to-br from-ink to-ink/90 p-6 relative">
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #F5F0E8 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
                        <div className="relative flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-sage/20 border border-sage/30 flex items-center justify-center flex-shrink-0">
                                <DoorOpen size={24} className="text-sage" />
                            </div>
                            <div>
                                <p className="font-body text-stone-400 text-xs uppercase tracking-wider mb-0.5">Unit Invite</p>
                                <h2 className="font-display text-cream text-xl font-semibold">{inviteData?.unitName}</h2>
                                <p className="font-body text-stone-400 text-sm">{inviteData?.propertyName}</p>
                            </div>
                        </div>
                    </div>
                    <div className="px-5 py-4 flex items-center gap-2">
                        <Clock size={13} className="text-stone-400 flex-shrink-0" />
                        <span className="font-body text-xs text-stone-400">
                            {expiresAt ? `Expires ${formatDistanceToNow(expiresAt, { addSuffix: true })}` : ''}
                        </span>
                    </div>
                </div>

                {/* User state info */}
                {user ? (
                    <p className="font-body text-sm text-stone-500 text-center">
                        Accepting as <strong className="text-ink">{user.email}</strong>
                    </p>
                ) : (
                    <p className="font-body text-sm text-stone-500 text-center">
                        You'll need to sign in or create an account to accept this invite.
                    </p>
                )}

                {/* CTA */}
                <button
                    onClick={handleAccept}
                    disabled={status === 'accepting'}
                    className="btn-primary w-full"
                >
                    {status === 'accepting'
                        ? <><Loader2 size={16} className="animate-spin" /> Accepting…</>
                        : user
                            ? <><Check size={16} /> Accept & Join Unit</>
                            : <><KeyRound size={16} /> Sign In / Sign Up to Accept</>
                    }
                </button>

                {!user && (
                    <p className="font-body text-xs text-stone-400 text-center">
                        Already have an account?{' '}
                        <Link to={`/login?invite=${token}`} onClick={() => savePendingInvite(token)}
                            className="text-sage font-medium hover:underline">Sign in</Link>
                    </p>
                )}
            </motion.div>
        </PageShell>
    );
}

// ── Shared layout ─────────────────────────────────────────────────────────────
function PageShell({ children }) {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
            <div className="mb-8 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center shadow-sm">
                    <KeyRound size={17} className="text-cream" />
                </div>
                <span className="font-display font-semibold text-ink text-xl">LeaseEase</span>
            </div>
            {children}
        </div>
    );
}

function StatusCard({ icon: Icon, iconClass, title, message, action }) {
    return (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card p-8 max-w-sm w-full flex flex-col items-center text-center gap-3">
            <div className={`w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center`}>
                <Icon size={28} className={iconClass} />
            </div>
            <h2 className="font-display text-ink text-xl font-semibold">{title}</h2>
            <p className="font-body text-stone-500 text-sm">{message}</p>
            {action}
        </motion.div>
    );
}

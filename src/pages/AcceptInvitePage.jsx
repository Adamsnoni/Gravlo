// src/pages/AcceptInvitePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public page — validates a unit invite token and lets the tenant accept it.
// Works for both logged-in users and new users (redirect to register).
// Route: /invite/:token
//
// Flow:
//   token has unitId  → single-unit accept
//   token has no unitId → building portal: show vacant unit grid → request approval
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Check, Clock, AlertTriangle, KeyRound, Loader2,
    DoorOpen, UserX, Building2, ChevronRight, BellRing,
} from 'lucide-react';
import { fetchInviteToken, acceptInviteToken } from '../services/inviteTokens';
import { getVacantUnits, requestUnitApproval } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const INVITE_TOKEN_KEY = 'gravlo_pending_invite';

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
    const { user } = useAuth();
    const navigate = useNavigate();

    // Core invite state
    const [status, setStatus] = useState('loading');
    // loading | valid | expired | used | occupied | error | accepting | done
    // picking | submitting | pending_approval
    const [inviteData, setInviteData] = useState(null);
    const [expiresAt, setExpiresAt] = useState(null);

    // Unit picker state (building-portal path)
    const [vacantUnits, setVacantUnits] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [selectedUnitId, setSelectedUnitId] = useState(null);

    /* ── Load & validate token ─────────────────────────────────────────────── */
    useEffect(() => {
        (async () => {
            try {
                const { data, valid, reason } = await fetchInviteToken(token);
                if (valid) {
                    setInviteData(data);
                    const exp = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
                    setExpiresAt(exp);

                    // If token has no specific unit → building portal (picker flow)
                    if (!data.unitId) {
                        setStatus('picking');
                        setLoadingUnits(true);
                        try {
                            const units = await getVacantUnits(data.landlordUid, data.propertyId);
                            setVacantUnits(units);
                        } catch {
                            toast.error('Could not load available units.');
                        } finally {
                            setLoadingUnits(false);
                        }
                    } else {
                        setStatus('valid');
                    }
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

    /* ── Single-unit accept (original flow) ────────────────────────────────── */
    const handleAccept = async () => {
        if (!user) {
            savePendingInvite(token);
            navigate(`/register?invite=${token}`, { replace: true });
            return;
        }
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

    /* ── Building-portal: request approval for selected unit ───────────────── */
    const handleRequestApproval = async () => {
        if (!user) {
            savePendingInvite(token);
            navigate(`/register?invite=${token}`, { replace: true });
            return;
        }
        if (!selectedUnitId) return;
        if (user.uid === inviteData?.landlordUid) {
            toast.error("You can't request your own unit.");
            return;
        }
        setStatus('submitting');
        try {
            await requestUnitApproval(inviteData.landlordUid, inviteData.propertyId, selectedUnitId, user);
            const chosen = vacantUnits.find(u => u.id === selectedUnitId);
            setInviteData(d => ({ ...d, unitName: chosen?.name || selectedUnitId }));
            setStatus('pending_approval');
            toast.success('Request sent to your landlord!');
        } catch (err) {
            toast.error(err.message || 'Failed to submit. Please try again.');
            setStatus('picking');
        }
    };

    /* ── Done (single-unit accepted) ─────────────────────────────────────── */
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

    /* ── Pending approval (building-portal path success) ─────────────────── */
    if (status === 'pending_approval') {
        return (
            <PageShell>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center text-center gap-4 max-w-sm">
                    <div className="w-20 h-20 rounded-full bg-sage/15 flex items-center justify-center">
                        <BellRing size={36} className="text-sage" />
                    </div>
                    <h2 className="font-display text-ink text-2xl font-semibold">Request Sent!</h2>
                    <p className="font-body text-stone-500 text-sm">
                        Your request for <strong>{inviteData?.unitName}</strong> at <strong>{inviteData?.propertyName}</strong> has been sent to your landlord.
                        You'll be notified once they confirm.
                    </p>
                    <div className="w-full p-4 rounded-xl bg-sage/8 border border-sage/20 text-left">
                        <p className="font-body text-xs text-sage font-semibold uppercase tracking-wider mb-1">What happens next?</p>
                        <p className="font-body text-xs text-stone-500">Your landlord will review and approve your request. Once approved, you'll see the unit in your Homes dashboard.</p>
                    </div>
                    <button onClick={() => navigate('/tenant')} className="btn-primary mt-2 w-full justify-center">
                        <Home size={16} /> Go to My Homes
                    </button>
                </motion.div>
            </PageShell>
        );
    }

    /* ── Unit picker (building-portal path) ──────────────────────────────── */
    if (status === 'picking' || status === 'submitting') {
        return (
            <PageShell>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-5">

                    {/* Property header */}
                    <div className="card overflow-hidden">
                        <div className="bg-gradient-to-br from-ink to-ink/90 p-6 relative">
                            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #F5F0E8 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
                            <div className="relative flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-sage/20 border border-sage/30 flex items-center justify-center flex-shrink-0">
                                    <Building2 size={24} className="text-sage" />
                                </div>
                                <div>
                                    <p className="font-body text-stone-400 text-xs uppercase tracking-wider mb-0.5">Building Portal</p>
                                    <h2 className="font-display text-cream text-xl font-semibold">{inviteData?.propertyName}</h2>
                                    <p className="font-body text-stone-400 text-sm">Select your unit to request access</p>
                                </div>
                            </div>
                        </div>
                        {expiresAt && (
                            <div className="px-5 py-3 flex items-center gap-2">
                                <Clock size={13} className="text-stone-400 flex-shrink-0" />
                                <span className="font-body text-xs text-stone-400">
                                    Invite expires {formatDistanceToNow(expiresAt, { addSuffix: true })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Logged-in as */}
                    {user && (
                        <p className="font-body text-sm text-stone-500 text-center">
                            Requesting as <strong className="text-ink">{user.email}</strong>
                        </p>
                    )}

                    {/* Unit grid */}
                    <div>
                        <p className="font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                            Available Units
                        </p>

                        {loadingUnits ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 size={28} className="text-sage animate-spin" />
                            </div>
                        ) : vacantUnits.length === 0 ? (
                            <div className="card p-6 text-center">
                                <DoorOpen size={28} className="text-stone-300 mx-auto mb-2" />
                                <p className="font-body text-sm text-stone-400">No vacant units available right now.</p>
                                <p className="font-body text-xs text-stone-300 mt-1">Contact your landlord directly.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <AnimatePresence>
                                    {vacantUnits.map((unit, i) => {
                                        const isSelected = selectedUnitId === unit.id;
                                        return (
                                            <motion.button
                                                key={unit.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                type="button"
                                                onClick={() => setSelectedUnitId(isSelected ? null : unit.id)}
                                                className={`relative text-left p-4 rounded-2xl border-2 transition-all ${isSelected
                                                    ? 'border-sage bg-sage/8 shadow-md'
                                                    : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-sage flex items-center justify-center">
                                                        <Check size={11} className="text-white" />
                                                    </div>
                                                )}
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${isSelected ? 'bg-sage/20' : 'bg-stone-100'}`}>
                                                    <DoorOpen size={17} className={isSelected ? 'text-sage' : 'text-stone-400'} />
                                                </div>
                                                <p className={`font-body text-sm font-semibold ${isSelected ? 'text-ink' : 'text-stone-700'}`}>
                                                    {unit.name}
                                                </p>
                                                {unit.rentAmount > 0 && (
                                                    <p className="font-body text-xs text-stone-400 mt-0.5">
                                                        {unit.rentAmount?.toLocaleString()} / {unit.billingCycle || 'mo'}
                                                    </p>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleRequestApproval}
                        disabled={!selectedUnitId || status === 'submitting' || !user}
                        className="btn-primary w-full py-3 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {status === 'submitting'
                            ? <><Loader2 size={16} className="animate-spin" /> Sending Request…</>
                            : !user
                                ? <><KeyRound size={16} /> Sign In / Sign Up to Continue</>
                                : <><ChevronRight size={16} /> Request to Join{selectedUnitId ? ` · ${vacantUnits.find(u => u.id === selectedUnitId)?.name}` : ''}</>
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

    /* ── Unit already occupied ───────────────────────────────────────────── */
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

    /* ── Expired ─────────────────────────────────────────────────────────── */
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

    /* ── Already used ───────────────────────────────────────────────────── */
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

    /* ── Error ───────────────────────────────────────────────────────────── */
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

    /* ── Loading ─────────────────────────────────────────────────────────── */
    if (status === 'loading') {
        return (
            <PageShell>
                <Loader2 size={32} className="text-sage animate-spin" />
                <p className="font-body text-sm text-stone-400 mt-4">Checking your invite…</p>
            </PageShell>
        );
    }

    /* ── Valid: single-unit invite ──────────────────────────────────────── */
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

// ── Shared layout ──────────────────────────────────────────────────────────────
function PageShell({ children }) {
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
            <div className="mb-8 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center shadow-sm">
                    <KeyRound size={17} className="text-cream" />
                </div>
                <span className="font-display font-semibold text-ink text-xl">Gravlo</span>
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

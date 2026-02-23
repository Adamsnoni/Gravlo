// src/pages/ProfilePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dedicated personal profile page — identity, contact, subscription.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Crown, Shield, Check, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getFlag } from '../utils/countries';
import { resetPassword } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { PLANS } from '../services/subscription';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { user, profile, logout } = useAuth();
    const { country, currencyName, currencySymbol } = useLocale();
    const navigate = useNavigate();
    const [resetSent, setResetSent] = React.useState(false);

    const handleLogout = async () => {
        await logout();
        toast.success('Signed out.');
        navigate('/login');
    };

    const handleResetPassword = async () => {
        try {
            await resetPassword(user.email);
            setResetSent(true);
            toast.success('Password reset email sent!');
        } catch {
            toast.error('Failed to send reset email.');
        }
    };

    const initials = (profile?.fullName || user?.displayName || 'U')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const memberSince = user?.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—';

    const role = profile?.role || 'landlord';
    const userPlan = PLANS[profile?.subscription?.planId || 'free'] || PLANS.free;

    return (
        <div className="space-y-6 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="font-display text-ink text-3xl font-semibold">Profile</h1>
                <p className="font-body text-stone-400 text-sm mt-0.5">Your personal identity and account details</p>
            </motion.div>

            {/* Hero Card */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="card overflow-hidden">
                <div className="bg-gradient-to-br from-ink to-ink-light p-6 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #F5F0E8 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
                    <div className="absolute top-0 right-0 w-40 h-40 bg-sage/10 rounded-full blur-2xl" />
                    <div className="relative flex items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl bg-sage/20 border-2 border-sage/40 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="font-display font-bold text-sage text-3xl">{initials}</span>
                        </div>
                        <div>
                            <h2 className="font-display text-cream text-2xl font-semibold">
                                {profile?.fullName || user?.displayName || 'User'}
                            </h2>
                            <p className="font-body text-stone-400 text-sm mt-0.5">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-body font-semibold capitalize ${role === 'tenant' ? 'bg-sage/15 text-sage' : 'bg-amber/15 text-amber'
                                    }`}>
                                    {role}
                                </span>
                                {role !== 'tenant' && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-body font-semibold ${userPlan.badgeColor}`}>
                                        <Crown size={10} /> {userPlan.badge}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detail grid */}
                <div className="p-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <ProfileField icon={User} label="Full Name" value={profile?.fullName || user?.displayName || '—'} />
                        <ProfileField icon={Mail} label="Email" value={user?.email || '—'} />
                        <ProfileField icon={Phone} label="Phone" value={profile?.phone || '—'} />
                        <ProfileField icon={MapPin} label="Country"
                            value={country ? `${getFlag(country.code)} ${country.name}` : '—'} />
                        <ProfileField icon={Calendar} label="Member Since" value={memberSince} />
                        <ProfileField
                            label="Currency"
                            value={country ? `${country.currencyName} (${country.symbol})` : '—'}
                            icon={() => <span className="text-sm font-semibold text-stone-400">{currencySymbol}</span>}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Subscription — landlords only */}
            {role !== 'tenant' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-6">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-100">
                        <Crown size={16} className="text-stone-400" />
                        <h3 className="font-body font-semibold text-ink text-sm">Subscription</h3>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="font-body font-semibold text-ink text-lg">{userPlan.name}</p>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-body font-semibold ${userPlan.badgeColor}`}>
                                    <Crown size={10} /> {userPlan.badge}
                                </span>
                            </div>
                            <p className="font-body text-xs text-stone-400">
                                {userPlan.price === 0 ? 'Free forever' : `$${userPlan.price}/${userPlan.period}`}
                                {' · '}
                                {userPlan.maxProperties === Infinity ? 'Unlimited' : `Up to ${userPlan.maxProperties}`} properties
                            </p>
                        </div>
                        <Link to="/subscription" className="btn-secondary text-sm">
                            {userPlan.id === 'free' ? 'Upgrade' : 'Manage Plan'}
                        </Link>
                    </div>
                </motion.div>
            )}

            {/* Security */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-100">
                    <Shield size={16} className="text-stone-400" />
                    <h3 className="font-body font-semibold text-ink text-sm">Security</h3>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-body font-medium text-sm text-ink">Password</p>
                        <p className="font-body text-xs text-stone-400 mt-0.5">Send a reset link to your email</p>
                    </div>
                    <button onClick={handleResetPassword} disabled={resetSent} className="btn-secondary text-sm">
                        {resetSent ? <><Check size={14} className="text-sage" /> Email Sent</> : 'Reset Password'}
                    </button>
                </div>
            </motion.div>

            {/* Sign Out */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-stone-100">
                    <LogOut size={16} className="text-stone-400" />
                    <h3 className="font-body font-semibold text-ink text-sm">Account</h3>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="font-body font-medium text-sm text-ink">{profile?.fullName || user?.displayName || 'User'}</p>
                        <p className="font-body text-xs text-stone-400 mt-0.5">{user?.email}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-body font-semibold capitalize ${profile?.role === 'tenant' ? 'bg-sage/10 text-sage' : 'bg-amber/10 text-amber'
                        }`}>{profile?.role || 'landlord'}</span>
                </div>
                <button onClick={handleLogout} className="btn-danger w-full">
                    <LogOut size={15} /> Sign Out
                </button>
            </motion.div>
        </div>
    );
}

function ProfileField({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                {typeof Icon === 'function' && Icon.length === 0 ? <Icon /> : <Icon size={14} className="text-stone-400" />}
            </div>
            <div className="min-w-0">
                <p className="font-body text-[11px] text-stone-400 uppercase tracking-wider font-semibold">{label}</p>
                <p className="font-body text-sm text-ink font-medium mt-0.5 truncate">{value}</p>
            </div>
        </div>
    );
}

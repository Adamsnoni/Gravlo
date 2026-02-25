// src/pages/ProfilePage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Crown, Shield, Check, LogOut, ArrowRight, Activity, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getFlag } from '../utils/countries';
import { resetPassword } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { PLANS } from '../services/subscription';
import toast from 'react-hot-toast';

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.3, ease: "easeOut" },
});

export default function ProfilePage() {
    const { user, profile, logout } = useAuth();
    const { country, currencyName, currencySymbol } = useLocale();
    const navigate = useNavigate();
    const [resetSent, setResetSent] = React.useState(false);

    const handleLogout = async () => {
        await logout();
        toast.success('Safe travels!');
        navigate('/login');
    };

    const handleResetPassword = async () => {
        try {
            await resetPassword(user.email);
            setResetSent(true);
            toast.success('Security link dispatched!');
        } catch {
            toast.error('Failed to initiate reset.');
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
        <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-slide-up">
            {/* Page Header */}
            <motion.div {...fadeUp(0)}>
                <p className="text-[#6b8a7a] font-bold text-xs uppercase tracking-[0.15em] mb-2">Account Identity</p>
                <h1 className="font-fraunces text-[#1a2e22] text-4xl font-black tracking-tight leading-none italic">
                    Personal Profile
                </h1>
            </motion.div>

            {/* Profile Identity Card */}
            <motion.div {...fadeUp(0.05)} className="card overflow-hidden bg-white border-[#f0f7f2] shadow-xl relative">
                <div className="h-1.5 w-full bg-[#1a6a3c]" />
                <div className="p-8 sm:p-10 bg-gradient-to-br from-[#fcfdfc] to-white">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-[2rem] bg-[#1a3c2e] flex items-center justify-center shadow-2xl transform group-hover:rotate-6 transition-transform duration-500">
                                <span className="font-fraunces font-black text-white text-3xl italic">{initials}</span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white border border-[#ddf0e6] shadow-lg flex items-center justify-center text-[#1a6a3c]">
                                <Shield size={18} strokeWidth={2.5} />
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h2 className="font-fraunces text-[#1a2e22] text-3xl font-black mb-2 tracking-tight">
                                {profile?.fullName || user?.displayName || 'Registry Member'}
                            </h2>
                            <p className="text-[#6b8a7a] font-semibold text-sm mb-4">{user?.email}</p>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${role === 'tenant' ? 'bg-[#e8f5ee] border-[#ddf0e6] text-[#1a6a3c]' : 'bg-[#fef9ed] border-[#f5e0b8] text-[#c8691a]'}`}>
                                    {role}
                                </span>
                                {role !== 'tenant' && (
                                    <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#1a3c2e] text-white shadow-md">
                                        <Crown size={12} strokeWidth={2.5} /> {userPlan.badge}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 sm:p-10 border-t border-[#f0f7f2]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <ProfileField icon={User} label="Full Legal Name" value={profile?.fullName || user?.displayName || '—'} />
                        <ProfileField icon={Mail} label="Verified Email" value={user?.email || '—'} />
                        <ProfileField icon={Phone} label="Contact Number" value={profile?.phone || '—'} />
                        <ProfileField icon={MapPin} label="Operating Region" value={country ? `${getFlag(country.code)} ${country.name}` : '—'} />
                        <ProfileField icon={Calendar} label="Member Since" value={memberSince} />
                        <ProfileField icon={Activity} label="Standard Currency" value={country ? `${country.currencyName} (${country.symbol})` : '—'} />
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Subscription - Landlords */}
                {role !== 'tenant' && (
                    <motion.div {...fadeUp(0.1)} className="card p-8 bg-[#1a3c2e] text-white relative overflow-hidden group">
                        <div className="absolute top-[-30px] right-[-30px] opacity-[0.05] transform rotate-12 transition-transform group-hover:rotate-45 duration-700">
                            <Crown size={180} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                    <Zap size={20} className="text-[#52b788]" />
                                </div>
                                <h3 className="font-fraunces text-xl font-black italic">Plan Membership</h3>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <p className="font-fraunces text-2xl font-black italic tracking-wide">{userPlan.name}</p>
                                    <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 text-[9px] font-black uppercase tracking-widest">{userPlan.badge}</span>
                                </div>
                                <p className="text-white/70 text-sm font-medium">
                                    {userPlan.price === 0 ? 'Enterprise Free Edition' : `${currencySymbol}${userPlan.price}/${userPlan.period}`}
                                    {' · '}
                                    {userPlan.maxProperties === Infinity ? 'Unlimited' : `Capacity: ${userPlan.maxProperties} Assets`}
                                </p>
                            </div>

                            <Link to="/subscription" className="inline-flex items-center gap-2 bg-white text-[#1a3c2e] font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-[#f4fbf7] active:scale-95 transition-all shadow-xl">
                                {userPlan.id === 'free' ? 'Upgrade Tier' : 'Manage Subscription'}
                                <ArrowRight size={16} strokeWidth={3} />
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* Security Section */}
                <motion.div {...fadeUp(0.15)} className="card p-8 bg-white border-[#f0f7f2] shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-[#f4fbf7] border border-[#ddf0e6] flex items-center justify-center text-[#1a6a3c]">
                            <Shield size={20} strokeWidth={2.5} />
                        </div>
                        <h3 className="font-fraunces text-xl font-black italic text-[#1a2e22]">Security Protocol</h3>
                    </div>

                    <div className="p-6 rounded-2xl bg-[#fcfdfc] border border-[#f0f7f2] mb-8">
                        <h4 className="font-bold text-[#1a2e22] text-sm mb-1">Passcode Management</h4>
                        <p className="text-[#6b8a7a] text-xs font-medium italic">Authorize a security reset link to your registered email address.</p>
                    </div>

                    <button
                        onClick={handleResetPassword}
                        disabled={resetSent}
                        className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${resetSent ? 'bg-[#e8f5ee] text-[#1a6a3c] border-[#ddf0e6]' : 'bg-white border-[#ddf0e6] text-[#6b8a7a] hover:border-[#1a6a3c] hover:text-[#1a6a3c] shadow-sm'}`}
                    >
                        {resetSent ? <><Check size={16} strokeWidth={3} /> Check Your Inbox</> : 'Initiate Password Reset'}
                    </button>
                </motion.div>
            </div>

            {/* Account Management */}
            <motion.div {...fadeUp(0.2)} className="card p-8 bg-[#fff5f5] border-[#fee2e2] shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[#fee2e2] flex items-center justify-center text-[#e74c3c] shadow-sm">
                            <LogOut size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h4 className="font-fraunces text-[#1a2e22] text-lg font-black italic mb-0.5">Session Termination</h4>
                            <p className="text-[#94a3a8] text-xs font-bold uppercase tracking-widest">Sign out of this workspace</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full sm:w-auto btn-danger px-10 py-4 shadow-xl shadow-red-100">
                        Sign Out Now
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function ProfileField({ icon: Icon, label, value }) {
    return (
        <div className="group flex flex-col gap-2">
            <label className="text-[9px] font-black text-[#94a3a8] uppercase tracking-[0.2em]">{label}</label>
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#f4fbf7] flex items-center justify-center text-[#1a6a3c] flex-shrink-0">
                    <Icon size={14} strokeWidth={2.5} />
                </div>
                <p className="text-[#1a2e22] font-bold text-sm truncate">{value}</p>
            </div>
        </div>
    );
}

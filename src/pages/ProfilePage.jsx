// src/pages/ProfilePage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Crown, Shield, Check, LogOut, ArrowUpRight, AtSign } from 'lucide-react';
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
        <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tight">Identity</h1>
                <p className="font-body text-[#4a5568] text-sm mt-1 uppercase tracking-widest font-bold">Your personal footprint on the platform</p>
            </motion.div>

            {/* Profile Hero Card */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e] shadow-2xl">
                <div className="bg-gradient-to-br from-[#141b1e] to-[#0a0f12] p-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #e8e4de 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#52b788]/5 rounded-full blur-[80px] -mr-32 -mt-32" />

                    <div className="relative flex flex-col sm:flex-row items-center gap-8">
                        <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] border-4 border-[#1e2a2e] flex items-center justify-center flex-shrink-0 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                            <span className="font-display font-bold text-[#52b788] text-4xl">{initials}</span>
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="font-display text-[#e8e4de] text-3xl font-bold tracking-tight">
                                {profile?.fullName || user?.displayName || 'Resident User'}
                            </h2>
                            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-[#4a5568]">
                                <AtSign size={14} className="text-[#52b788]" />
                                <p className="font-body text-sm font-medium">{user?.email}</p>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-3 mt-6">
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm ${role === 'tenant' ? 'bg-[#1a3c2e]/20 border-[#2d6a4f]/30 text-[#52b788]' : 'bg-[#2d2510]/20 border-[#3d3215]/30 text-[#f0c040]'}`}>
                                    {role}
                                </span>
                                {role !== 'tenant' && (
                                    <Link to="/subscription" className="group flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[10px] font-bold text-[#e8e4de] uppercase tracking-widest hover:border-[#52b788]/30 transition-all">
                                        <Crown size={12} className="text-[#f0c040]" />
                                        {userPlan.badge}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-4 bg-[#0d1215]">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <ProfileField icon={User} label="Legal Name" value={profile?.fullName || user?.displayName || '—'} />
                        <ProfileField icon={Mail} label="Primary Contact" value={user?.email || '—'} />
                        <ProfileField icon={Phone} label="Mobile Access" value={profile?.phone || '—'} />
                        <ProfileField icon={MapPin} label="Operating Region"
                            value={country ? `${getFlag(country.code)} ${country.name}` : '—'} />
                        <ProfileField icon={Calendar} label="Join Date" value={memberSince} />
                        <ProfileField
                            label="Local Currency"
                            value={country ? `${country.currencyName} (${country.symbol})` : '—'}
                            icon={() => <span className="text-xs font-bold text-[#52b788]">{currencySymbol}</span>}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Account Contexts */}
            <div className="grid sm:grid-cols-2 gap-6">
                {/* Subscription Card */}
                {role !== 'tenant' && (
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="card p-8 bg-[#0d1215] border border-[#1e2a2e] group hover:border-[#52b788]/20 transition-all">
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#f0c040]">
                                <Crown size={24} />
                            </div>
                            <Link to="/subscription" className="text-[#4a5568] group-hover:text-[#e8e4de] transition-colors">
                                <ArrowUpRight size={20} />
                            </Link>
                        </div>
                        <h3 className="font-display text-[#e8e4de] text-xl font-bold mb-2 tracking-tight">{userPlan.name} Plan</h3>
                        <p className="font-body text-sm text-[#4a5568] font-medium leading-relaxed mb-6">
                            {userPlan.maxProperties === Infinity ? 'Unlimited' : `Up to ${userPlan.maxProperties}`} Active Properties. {userPlan.price === 0 ? 'Forever Free' : `${currencySymbol}${userPlan.price}/${userPlan.period}`}.
                        </p>
                        <Link to="/subscription" className="btn-secondary w-full text-[11px] font-bold uppercase tracking-widest py-3">
                            Manage Billing
                        </Link>
                    </motion.div>
                )}

                {/* Security Card */}
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }} className="card p-8 bg-[#0d1215] border border-[#1e2a2e] group hover:border-[#52b788]/20 transition-all">
                    <div className="flex items-center justify-between mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#52b788]">
                            <Shield size={24} />
                        </div>
                    </div>
                    <h3 className="font-display text-[#e8e4de] text-xl font-bold mb-2 tracking-tight">Security Access</h3>
                    <p className="font-body text-sm text-[#4a5568] font-medium leading-relaxed mb-6">
                        Authorized email for account recovery. Ensure your password is rotated frequently.
                    </p>
                    <button onClick={handleResetPassword} disabled={resetSent} className="btn-secondary w-full text-[11px] font-bold uppercase tracking-widest py-3">
                        {resetSent ? <><Check size={14} className="text-[#52b788]" /> Link Dispatched</> : 'Reset Password'}
                    </button>
                </motion.div>
            </div>

            {/* Logout Action */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="pt-8 border-t border-[#1e2a2e]">
                <button onClick={handleLogout} className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-[#2d1a1a]/10 border border-[#3d2020] text-[#e74c3c] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#2d1a1a]/20 transition-all shadow-lg shadow-[#2d1a1a]/5">
                    <LogOut size={16} /> End Session
                </button>
            </motion.div>
        </div>
    );
}

function ProfileField({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#141b1e]/50 border border-[#1e2a2e] hover:border-[#52b788]/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#0d1215] border border-[#1e2a2e] flex items-center justify-center flex-shrink-0 text-[#4a5568]">
                {typeof Icon === 'function' && Icon.length === 0 ? <Icon /> : <Icon size={16} />}
            </div>
            <div className="min-w-0">
                <p className="font-body text-[10px] text-[#4a5568] uppercase tracking-[0.15em] font-bold">{label}</p>
                <p className="font-body text-sm text-[#e8e4de] font-bold mt-1 truncate tracking-tight">{value}</p>
            </div>
        </div>
    );
}

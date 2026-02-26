// src/pages/TenantSignupPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, KeyRound, User, Phone, CheckCircle2,
    ArrowRight, ChevronRight, Eye, EyeOff, ShieldCheck
} from 'lucide-react';
import { registerUser } from '../services/firebase';
import { consumePendingInvite } from './AcceptInvitePage';
import { acceptInviteToken } from '../services/inviteTokens';
import toast from 'react-hot-toast';

export default function TenantSignupPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/tenant';

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        agreed: false
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const validatePhone = (phone) => {
        // Exactly 10 digits (excluding lead 0) or 11 digits
        const regex = /^(?:\d{10}|\d{11})$/;
        return regex.test(phone.replace(/\s/g, ''));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!form.email.trim()) newErrors.email = 'Email is required';
        if (!form.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!validatePhone(form.phone)) {
            newErrors.phone = 'Enter a valid Nigerian phone (10 or 11 digits)';
        }
        if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!form.agreed) newErrors.agreed = 'You must agree to the terms';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            await registerUser({
                email: form.email.trim().toLowerCase(),
                password: form.password,
                fullName: form.fullName.trim(),
                phone: `+234${form.phone.trim().replace(/^0/, '')}`, // Ensure it doesn't have duplicate lead 0 if 11 digits
                countryCode: 'NG',
                role: 'tenant'
            });

            toast.success('Account created successfully!');

            // Process pending invite if it exists
            const pendingToken = consumePendingInvite();
            if (pendingToken) {
                try {
                    await acceptInviteToken(pendingToken, {
                        uid: user.uid,
                        email: form.email.trim().toLowerCase(),
                        displayName: form.fullName.trim()
                    });
                    toast.success('You have been added to your unit!');
                } catch (inviteErr) {
                    console.error('Pending invite accept failed:', inviteErr);
                    // Non-blocking but warn user
                    toast.error('Failed to auto-join unit. Redirecting to dashboard.');
                }
            }

            // Redirect back to context or tenant portal
            navigate(redirectPath);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const set = k => v => {
        setForm(f => ({ ...f, [k]: v }));
        if (errors[k]) setErrors(prev => {
            const n = { ...prev };
            delete n[k];
            return n;
        });
    };

    return (
        <div className="min-h-screen bg-[#F5F2ED] flex flex-col lg:flex-row overflow-hidden font-dm-sans">
            {/* Branding Sidebar - Desktop Only */}
            <div className="hidden lg:flex lg:w-[45%] bg-[#1A3C2E] relative overflow-hidden flex-col justify-between p-16">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#52B788]/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#40916C]/10 rounded-full blur-[80px] -ml-40 -mb-40" />

                {/* Logo & Brand */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 bg-[#F5F2ED] rounded-2xl flex items-center justify-center shadow-lg">
                            <KeyRound size={24} className="text-[#1A3C2E]" />
                        </div>
                        <span className="text-2xl font-fraunces font-black text-[#F5F2ED] tracking-tight">Gravlo</span>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-5xl font-fraunces font-black text-[#F5F2ED] leading-[1.1] italic">
                            Your new home,<br />
                            <span className="text-[#52B788]">digitally managed.</span>
                        </h1>
                        <p className="text-[#A7C4B5] text-lg leading-relaxed max-w-md">
                            Join thousands of tenants using Gravlo to pay rent easily, manage maintenance, and communicate with landlords — all in one place.
                        </p>
                    </div>
                </div>

                {/* Testimonial/Trust Badge */}
                <div className="relative z-10 p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="flex gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-4 h-4 text-amber-400 fill-current">★</div>
                        ))}
                    </div>
                    <p className="text-[#F5F2ED] font-medium leading-relaxed italic mb-4">
                        "The easiest way to manage my rent payments. No more bank transfers or manual receipts!"
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#52B788] flex items-center justify-center text-[#1A3C2E] font-bold">
                            TD
                        </div>
                        <div>
                            <p className="text-[#F5F2ED] font-bold text-sm">Tobi Daniel</p>
                            <p className="text-[#A7C4B5] text-xs">Verified Tenant</p>
                        </div>
                    </div>
                </div>

                {/* Abstract Decorative Leaf (Simple CSS/SVG) */}
                <svg className="absolute bottom-10 right-10 w-64 h-64 text-[#52B788]/20 opacity-30 transform rotate-12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C12,14.76 14,10.67 17,8M18.86,4.47C14.84,4.47 11.3,6.23 8,9C11.3,6.23 14.84,4.47 18.86,4.47Z" />
                </svg>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-12 lg:p-20 flex flex-col items-center justify-center">
                <div className="w-full max-w-[480px]">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-[#1A3C2E] rounded-xl flex items-center justify-center">
                            <KeyRound size={20} className="text-[#F5F2ED]" />
                        </div>
                        <span className="text-xl font-fraunces font-black text-[#1A1612]">Gravlo</span>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl lg:text-4xl font-fraunces font-black text-[#1A1612] mb-3">Create your account</h2>
                        <p className="text-[#8B8B8B] font-medium">Join the portal as a prospective tenant.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B8B8B] px-1">Full Name</label>
                                <div className={`relative flex items-center h-14 bg-white rounded-2xl border-2 transition-all ${errors.fullName ? 'border-red-100 ring-2 ring-red-50' : 'border-[#F0EFEA] focus-within:border-[#1A3C2E] focus-within:ring-4 focus-within:ring-[#1A3C2E]/5'}`}>
                                    <User className={`ml-4 ${errors.fullName ? 'text-red-400' : 'text-[#AFAFAF]'}`} size={18} />
                                    <input
                                        type="text"
                                        placeholder="James Adenuga"
                                        className="flex-1 h-full px-3 bg-transparent outline-none text-[15px] font-bold text-[#1A1612] placeholder:text-[#C1C1C1] placeholder:font-medium"
                                        value={form.fullName}
                                        onChange={(e) => set('fullName')(e.target.value)}
                                    />
                                </div>
                                {errors.fullName && <p className="text-[11px] font-bold text-red-500 px-1 mt-1">{errors.fullName}</p>}
                            </div>

                            {/* Email Address */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B8B8B] px-1">Email Address</label>
                                <div className={`relative flex items-center h-14 bg-white rounded-2xl border-2 transition-all ${errors.email ? 'border-red-100 ring-2 ring-red-50' : 'border-[#F0EFEA] focus-within:border-[#1A3C2E] focus-within:ring-4 focus-within:ring-[#1A3C2E]/5'}`}>
                                    <Mail className={`ml-4 ${errors.email ? 'text-red-400' : 'text-[#AFAFAF]'}`} size={18} />
                                    <input
                                        type="email"
                                        placeholder="james@example.com"
                                        className="flex-1 h-full px-3 bg-transparent outline-none text-[15px] font-bold text-[#1A1612] placeholder:text-[#C1C1C1] placeholder:font-medium"
                                        value={form.email}
                                        onChange={(e) => set('email')(e.target.value)}
                                    />
                                </div>
                                {errors.email && <p className="text-[11px] font-bold text-red-500 px-1 mt-1">{errors.email}</p>}
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B8B8B] px-1">Mobile Number</label>
                                <div className={`relative flex items-center h-14 bg-white rounded-2xl border-2 transition-all ${errors.phone ? 'border-red-100 ring-2 ring-red-50' : 'border-[#F0EFEA] focus-within:border-[#1A3C2E] focus-within:ring-4 focus-within:ring-[#1A3C2E]/5'}`}>
                                    <div className="h-full px-4 flex items-center border-r-2 border-[#F0EFEA] gap-2">
                                        <span className="text-[15px] font-bold text-[#1A1612]">+234</span>
                                    </div>
                                    <Phone className={`ml-3 ${errors.phone ? 'text-red-400' : 'text-[#AFAFAF]'}`} size={18} />
                                    <input
                                        type="tel"
                                        placeholder="801 234 5678"
                                        className="flex-1 h-full px-3 bg-transparent outline-none text-[15px] font-bold text-[#1A1612] placeholder:text-[#C1C1C1] placeholder:font-medium"
                                        value={form.phone}
                                        onChange={(e) => set('phone')(e.target.value)}
                                    />
                                </div>
                                {errors.phone && <p className="text-[11px] font-bold text-red-500 px-1 mt-1">{errors.phone}</p>}
                            </div>

                            {/* Passwords - Grid for Desktop */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B8B8B] px-1">Password</label>
                                    <div className={`relative flex items-center h-14 bg-white rounded-2xl border-2 transition-all ${errors.password ? 'border-red-100 ring-2 ring-red-50' : 'border-[#F0EFEA] focus-within:border-[#1A3C2E] focus-within:ring-4 focus-within:ring-[#1A3C2E]/5'}`}>
                                        <KeyRound className={`ml-4 ${errors.password ? 'text-red-400' : 'text-[#AFAFAF]'}`} size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="flex-1 h-full px-3 bg-transparent outline-none text-[15px] font-bold text-[#1A1612] placeholder:text-[#C1C1C1]"
                                            value={form.password}
                                            onChange={(e) => set('password')(e.target.value)}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="mr-3 text-[#AFAFAF] hover:text-[#1A3C2E]">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-[11px] font-bold text-red-500 px-1 mt-1">{errors.password}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B8B8B] px-1">Confirm</label>
                                    <div className={`relative flex items-center h-14 bg-white rounded-2xl border-2 transition-all ${errors.confirmPassword ? 'border-red-100 ring-2 ring-red-50' : 'border-[#F0EFEA] focus-within:border-[#1A3C2E] focus-within:ring-4 focus-within:ring-[#1A3C2E]/5'}`}>
                                        <ShieldCheck className={`ml-4 ${errors.confirmPassword ? 'text-red-400' : 'text-[#AFAFAF]'}`} size={18} />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="flex-1 h-full px-3 bg-transparent outline-none text-[15px] font-bold text-[#1A1612] placeholder:text-[#C1C1C1]"
                                            value={form.confirmPassword}
                                            onChange={(e) => set('confirmPassword')(e.target.value)}
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="mr-3 text-[#AFAFAF] hover:text-[#1A3C2E]">
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <p className="text-[11px] font-bold text-red-500 px-1 mt-1">{errors.confirmPassword}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="space-y-3">
                            <label className="relative flex items-start gap-3 cursor-pointer group">
                                <div className="mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={form.agreed}
                                        onChange={(e) => set('agreed')(e.target.checked)}
                                    />
                                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${errors.agreed ? 'border-red-200' : 'border-[#F0EFEA] peer-checked:border-[#1A3C2E] peer-checked:bg-[#1A3C2E]'}`}>
                                        <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white transform -rotate-45 mb-0.5 opacity-0 peer-checked:opacity-100" />
                                    </div>
                                </div>
                                <span className="text-[13px] font-medium text-[#8B8B8B] leading-relaxed group-hover:text-[#1A1612]">
                                    I agree to Gravlo's <Link to="/terms" className="text-[#1A3C2E] font-black underline decoration-[#1A3C2E]/20 hover:decoration-[#1A3C2E]">Terms of Service</Link> and <Link to="/privacy" className="text-[#1A3C2E] font-black underline decoration-[#1A3C2E]/20 hover:decoration-[#1A3C2E]">Privacy Policy</Link>.
                                </span>
                            </label>
                            {errors.agreed && <p className="text-[11px] font-bold text-red-500 px-1">{errors.agreed}</p>}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 bg-[#1A3C2E] rounded-[1.25rem] text-[#F5F2ED] text-[15px] font-black uppercase tracking-widest shadow-xl shadow-[#1A3C2E]/20 hover:shadow-2xl hover:bg-[#153125] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-[#F5F2ED]/30 border-t-[#F5F2ED] rounded-full animate-spin" />
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ChevronRight size={20} strokeWidth={3} />
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <p className="text-[13px] font-medium text-[#8B8B8B]">
                                Already have a tenant account? <Link to="/login" className="text-[#1A3C2E] font-black hover:underline">Sign In</Link>
                            </p>
                        </div>
                    </form>

                    {/* Footer Legal */}
                    <div className="mt-16 pt-10 border-t border-[#F0EFEA] flex flex-wrap justify-center gap-x-8 gap-y-4">
                        <Link to="/help" className="text-[11px] font-black uppercase tracking-widest text-[#AFAFAF] hover:text-[#1A1612] transition-colors">Help Center</Link>
                        <Link to="/contact" className="text-[11px] font-black uppercase tracking-widest text-[#AFAFAF] hover:text-[#1A1612] transition-colors">Contact Support</Link>
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#AFAFAF]/40">© 2026 Gravlo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

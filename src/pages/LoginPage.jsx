// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound, ArrowRight } from 'lucide-react';
import { loginUser, getProfile } from '../services/firebase';
import { consumePendingInvite } from './AcceptInvitePage';
import { acceptInviteToken } from '../services/inviteTokens';
import PasswordInput from '../components/PasswordInput';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      const cred = await loginUser(form.email.trim().toLowerCase(), form.password);
      const profile = await getProfile(cred.user.uid);
      const role = profile?.role || 'landlord';

      // Auto-complete pending invite (stored via AcceptInvitePage → register redirect)
      const pendingToken = consumePendingInvite();
      if (pendingToken && role === 'tenant') {
        try {
          await acceptInviteToken(pendingToken, cred.user);
          toast.success('Welcome back! You\'ve been added to your unit.');
          navigate('/tenant');
          return;
        } catch (err) {
          console.warn('Pending invite accept failed:', err.message);
        }
      }

      toast.success('Welcome back!');
      navigate(role === 'tenant' ? '/tenant' : '/dashboard');
    } catch (err) {
      const msg =
        err.code === 'auth/user-not-found' ? 'No account found with this email.' :
          err.code === 'auth/wrong-password' ? 'Incorrect password. Please try again.' :
            err.code === 'auth/invalid-email' ? 'Please enter a valid email address.' :
              err.code === 'auth/too-many-requests' ? 'Too many attempts. Please wait a moment.' :
                err.code === 'auth/invalid-credential' ? 'Invalid email or password.' :
                  'Sign in failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream flex">
      {/* Left — Illustration panel */}
      <div className="hidden lg:flex w-[48%] bg-ink relative overflow-hidden flex-col justify-between p-12">
        {/* Background texture pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #F5F0E8 1px, transparent 0)`, backgroundSize: '32px 32px' }}
        />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-sage/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-amber/15 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center">
            <KeyRound size={18} className="text-cream" />
          </div>
          <span className="font-display font-semibold text-cream text-xl">Gravlo</span>
        </div>

        {/* Headline */}
        <div className="relative">
          <p className="font-body text-sage text-sm font-medium tracking-widest uppercase mb-4">
            Smart Property Management
          </p>
          <h1 className="font-display text-cream text-4xl leading-tight mb-6">
            Every property,<br />
            <em className="text-sage">perfectly</em> managed.
          </h1>
          <p className="font-body text-stone-400 text-base leading-relaxed max-w-sm">
            Track rent payments, manage tenants, set automated reminders, and monitor maintenance — all in one elegant platform.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['Rent Tracking', 'Push Reminders', 'Tenant Portal', 'Analytics'].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-full border border-stone-700 text-stone-400 font-body text-xs">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative font-body text-xs text-stone-600">
          © 2026 Gravlo · Trusted by property managers
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center">
              <KeyRound size={16} className="text-cream" />
            </div>
            <span className="font-display font-semibold text-ink text-xl">Gravlo</span>
          </div>

          <h2 className="font-display text-ink text-3xl font-semibold mb-1">Welcome back</h2>
          <p className="font-body text-stone-400 text-sm mb-8">Sign in to your property dashboard</p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-rust/8 border border-rust/20 text-rust rounded-xl p-3.5 mb-6 text-sm font-body"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rust flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  className="input-base pl-10"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-body text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="font-body text-xs text-forgot hover:text-forgot-hover transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forgot rounded"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="login-password"
                value={form.password}
                onChange={set('password')}
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-3 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center font-body text-sm text-stone-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-sage font-semibold hover:text-sage-light transition-colors">
              Create one to get started
            </Link>
          </p>

          {/* Removed duplicate/incomplete "create an account" info box */}
        </motion.div>
      </div>
    </div>
  );
}

// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, KeyRound, ArrowRight, ArrowLeft, Globe } from 'lucide-react';
import { registerUser } from '../services/firebase';
import { consumePendingInvite } from './AcceptInvitePage';
import PasswordInput from '../components/PasswordInput';
import { useLocale } from '../context/LocaleContext';
import { getFlag } from '../utils/countries';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { countries, changeCountry, country } = useLocale();

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirm: '',
    countryCode: country.code,
    accountType: 'landlord',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCountryChange = (e) => {
    const code = e.target.value;
    setForm(f => ({ ...f, countryCode: code }));
    changeCountry(code);
  };

  // --- Real-time password match validation ---
  const passwordsMatch = form.confirm === '' || form.password === form.confirm;
  const canSubmit = !loading && form.password.length >= 8 && form.confirm.length >= 8 && form.password === form.confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullName, email, password, confirm, countryCode, accountType } = form;
    if (!fullName || !email || !password) { setError('All required fields must be filled.'); return; }
    if (!countryCode) { setError('Please select your country.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true); setError('');
    try {
      await registerUser({
        ...form,
        email: email.trim().toLowerCase(),
        countryCode,
        role: accountType === 'tenant' ? 'tenant' : 'landlord',
      });
      changeCountry(countryCode);

      // Auto-complete any pending unit invite
      const pendingToken = consumePendingInvite();
      if (pendingToken && accountType === 'tenant') {
        try {
          // Need the user credential — re-fetch
          const { user: newUser } = await getProfile ? { user: { uid: (await getProfile(form.email))?.uid } } : {};
          // acceptInviteToken needs a user object with uid — we'll handle this via the AcceptInvitePage flow
          toast.success('Account created! Complete your unit invite to finish setup.');
          navigate(`/invite/${pendingToken}`);
          return;
        } catch {
          // Fall through to normal redirect
        }
      }

      toast.success('Account created! Welcome to LeaseEase.');
      // Landlords → onboarding wizard; tenants → My Homes
      navigate(accountType === 'tenant' ? '/tenant' : '/onboarding');
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'This email is already registered.' :
          err.code === 'auth/invalid-email' ? 'Please enter a valid email.' :
            err.code === 'auth/weak-password' ? 'Password is too weak.' :
              'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = countries.find(c => c.code === form.countryCode);

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center p-6 sm:p-12">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="w-full max-w-lg">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-body text-stone-400 hover:text-ink transition-colors mb-8">
          <ArrowLeft size={15} /> Back to sign in
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center">
            <KeyRound size={18} className="text-cream" />
          </div>
          <div>
            <h1 className="font-display text-ink text-2xl font-semibold">Create your account</h1>
            <p className="font-body text-stone-400 text-xs mt-0.5">Start managing your properties in minutes</p>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-rust/8 border border-rust/20 text-rust rounded-xl p-3.5 mb-6 text-sm font-body">
              <div className="w-1.5 h-1.5 rounded-full bg-rust flex-shrink-0" />{error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type */}
            <div>
              <label className="block font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                I am a *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'landlord', label: 'Landlord / Manager', helper: 'Manage properties and tenants' },
                  { value: 'tenant', label: 'Tenant', helper: 'Pay rent and view history' },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, accountType: opt.value }))}
                    className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-colors ${form.accountType === opt.value
                      ? 'border-sage bg-sage/10 text-ink'
                      : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300'
                      }`}
                  >
                    <span className="font-body text-sm font-medium">{opt.label}</span>
                    <span className="font-body text-xs text-stone-400 mt-0.5">{opt.helper}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Full Name */}
            <div>
              <label className="block font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input type="text" className="input-base pl-10" placeholder="John Doe" value={form.fullName} onChange={set('fullName')} autoComplete="name" required />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input type="email" className="input-base pl-10" placeholder="john@example.com" value={form.email} onChange={set('email')} autoComplete="email" required />
              </div>
            </div>

            {/* Country & Currency */}
            <div>
              <label className="block font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Country & Currency *</label>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
                <select className="input-base pl-10 appearance-none" value={form.countryCode} onChange={handleCountryChange} required>
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{getFlag(c.code)} {c.name} — {c.currency} ({c.symbol})</option>
                  ))}
                </select>
              </div>
              {selectedCountry && (
                <p className="font-body text-xs text-stone-400 mt-1.5">
                  {getFlag(selectedCountry.code)} Prices will show in <strong className="text-sage">{selectedCountry.currencyName} ({selectedCountry.symbol})</strong>
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Phone </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input type="tel" className="input-base pl-10" placeholder="+1 555 000 0000" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </div>
            </div>

            <PasswordInput id="reg-password" label="Password *" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" autoComplete="new-password" required />

            {/* Confirm password with inline match error */}
            <div>
              <PasswordInput id="reg-confirm" label="Confirm Password *" value={form.confirm} onChange={set('confirm')} placeholder="Min. 8 characters" autoComplete="new-password" required />
              {!passwordsMatch && (
                <p className="mt-1.5 font-body text-xs text-rust flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rust inline-block flex-shrink-0" />
                  Passwords do not match.
                </p>
              )}
            </div>

            <div className="pt-2">
              <button type="submit" disabled={!canSubmit} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" /> : <><span>Create Account</span><ArrowRight size={16} /></>}
              </button>
            </div>
          </form>

          <p className="text-center font-body text-sm text-stone-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-sage font-semibold hover:text-sage-light transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

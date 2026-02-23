// src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound, ArrowLeft, ArrowRight } from 'lucide-react';
import { resetPassword } from '../services/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      const msg =
        err.code === 'auth/user-not-found' ? 'No account found with this email.' :
          err.code === 'auth/invalid-email' ? 'Please enter a valid email address.' :
            'Failed to send reset email. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center p-6 sm:p-12">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Back */}
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-body text-stone-400 hover:text-ink transition-colors mb-8">
          <ArrowLeft size={15} /> Back to sign in
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center">
            <KeyRound size={18} className="text-cream" />
          </div>
          <div>
            <h1 className="font-display text-ink text-2xl font-semibold">Reset your password</h1>
            <p className="font-body text-stone-400 text-xs mt-0.5">We'll send a reset link to your email</p>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          {/* Success state */}
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-14 h-14 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-sage" />
              </div>
              <h2 className="font-display text-ink text-xl font-semibold mb-2">Check your inbox</h2>
              <p className="font-body text-stone-400 text-sm leading-relaxed mb-6">
                We sent a password reset link to <span className="font-semibold text-ink">{email}</span>.
                Check your spam folder if you don't see it.
              </p>
              <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                Back to Sign In <ArrowRight size={16} />
              </Link>
            </motion.div>
          ) : (
            <>
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
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                    : <><span>Send Reset Link</span><ArrowRight size={16} /></>
                  }
                </button>
              </form>

              <p className="text-center font-body text-sm text-stone-400 mt-5">
                Remembered it?{' '}
                <Link to="/login" className="text-sage font-semibold hover:text-sage-light transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

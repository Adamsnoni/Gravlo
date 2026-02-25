// src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/firebase';
import { useLocale } from '../context/LocaleContext';
import toast from 'react-hot-toast';

// ============================================================
// GRAVLO — Landlord Registration Wizard
// 3 screens · Animated · Production-ready
// ============================================================

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦', phone: '+234' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: 'GH₵', phone: '+233' },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh', phone: '+254' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', phone: '+27' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', phone: '+44' },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', phone: '+1' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'CA$', phone: '+1' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', phone: '+61' },
];

const ACCOUNT_TYPES = [
  {
    id: 'individual',
    icon: '🏠',
    label: 'Individual Landlord',
    desc: 'I own properties and rent them directly',
  },
  {
    id: 'manager',
    icon: '🏢',
    label: 'Property Manager',
    desc: 'I manage properties on behalf of owners',
  },
  {
    id: 'agency',
    icon: '🏗️',
    label: 'Real Estate Agency',
    desc: "We manage multiple clients' portfolios",
  },
];

const PORTFOLIO_SIZES = [
  { id: '1-5', label: '1–5 units', plan: 'Starter', price: 'Free' },
  { id: '6-15', label: '6–15 units', plan: 'Landlord', price: '₦3,500/mo' },
  { id: '16-50', label: '16–50 units', plan: 'Estate', price: '₦9,000/mo' },
  { id: '50+', label: '50+ units', plan: 'Enterprise', price: 'Custom' },
];

// ── Icons (inline SVG, zero dependencies) ───────────────────
const EyeIcon = ({ open }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ── Progress Bar ─────────────────────────────────────────────
const ProgressBar = ({ step, total }) => (
  <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          height: 3,
          flex: 1,
          borderRadius: 99,
          background: i < step ? '#1a3c2e' : '#e5e0d8',
          transition: 'background 0.4s ease',
        }}
      />
    ))}
  </div>
);

// ── Input Field ──────────────────────────────────────────────
const Field = ({ label, error, children, hint }) => (
  <div style={{ marginBottom: 20 }}>
    <label
      style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#6b6460',
        marginBottom: 8,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
    </label>
    {children}
    {hint && !error && (
      <p style={{ fontSize: 12, color: '#9e9994', marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>
        {hint}
      </p>
    )}
    {error && (
      <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>
        {error}
      </p>
    )}
  </div>
);

const Input = ({ type = 'text', placeholder, value, onChange, suffix, prefix, style: extraStyle, autoComplete }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: `1.5px solid ${focused ? '#1a3c2e' : '#ddd8d0'}`,
        borderRadius: 10,
        background: '#fff',
        transition: 'border-color 0.2s',
        overflow: 'hidden',
        ...extraStyle,
      }}
    >
      {prefix && (
        <span
          style={{
            padding: '0 12px',
            color: '#9e9994',
            fontSize: 14,
            borderRight: '1.5px solid #ddd8d0',
            background: '#faf8f5',
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          padding: '13px 14px',
          fontSize: 15,
          background: 'transparent',
          color: '#1a1614',
          fontFamily: "'DM Sans', sans-serif",
        }}
      />
      {suffix && (
        <span style={{ padding: '0 14px', color: '#9e9994', cursor: 'pointer' }}>
          {suffix}
        </span>
      )}
    </div>
  );
};

// ── Screen 1 — Account Basics ────────────────────────────────
const Screen1 = ({ data, onChange, errors }) => {
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const pwStrength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const strength = pwStrength(data.password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#e74c3c', '#f39c12', '#2ecc71', '#1a3c2e'];

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 32,
          fontWeight: 700,
          color: '#1a1614',
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        Create your account
      </h1>
      <p
        style={{
          color: '#6b6460',
          fontSize: 15,
          marginBottom: 32,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Get started in under 2 minutes.
      </p>

      {/* Google OAuth (Mock UI) */}
      <button
        type="button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '13px 20px',
          border: '1.5px solid #ddd8d0',
          borderRadius: 10,
          background: '#fff',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 500,
          color: '#1a1614',
          marginBottom: 24,
          fontFamily: "'DM Sans', sans-serif",
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onClick={() => toast.error('Google Sign-in is coming soon.')}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ flex: 1, height: 1, background: '#e5e0d8' }} />
        <span
          style={{
            fontSize: 12,
            color: '#9e9994',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          or continue with email
        </span>
        <div style={{ flex: 1, height: 1, background: '#e5e0d8' }} />
      </div>

      <Field label="Full Name" error={errors.fullName}>
        <Input
          placeholder="Chidi Okafor"
          value={data.fullName}
          autoComplete="name"
          onChange={(v) => onChange('fullName', v)}
        />
      </Field>

      <Field label="Email Address" error={errors.email}>
        <Input
          type="email"
          placeholder="chidi@example.com"
          value={data.email}
          autoComplete="email"
          onChange={(v) => onChange('email', v)}
        />
      </Field>

      <Field label="Password" error={errors.password}>
        <Input
          type={showPw ? 'text' : 'password'}
          placeholder="Min. 8 characters"
          value={data.password}
          autoComplete="new-password"
          onChange={(v) => onChange('password', v)}
          suffix={
            <span onClick={() => setShowPw(!showPw)} style={{ color: '#9e9994', display: 'flex', alignItems: 'center' }}>
              <EyeIcon open={showPw} />
            </span>
          }
        />
        {data.password && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 99,
                    background: i <= strength ? strengthColors[strength] : '#e5e0d8',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
            </div>
            <p
              style={{
                fontSize: 11,
                color: strengthColors[strength],
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {strengthLabels[strength]}
            </p>
          </div>
        )}
      </Field>

      <Field label="Confirm Password" error={errors.confirmPassword}>
        <Input
          type={showCpw ? 'text' : 'password'}
          placeholder="Repeat your password"
          value={data.confirmPassword}
          autoComplete="new-password"
          onChange={(v) => onChange('confirmPassword', v)}
          suffix={
            <span onClick={() => setShowCpw(!showCpw)} style={{ color: '#9e9994', display: 'flex', alignItems: 'center' }}>
              <EyeIcon open={showCpw} />
            </span>
          }
        />
      </Field>
    </div>
  );
};

// ── Screen 2 — Localization ──────────────────────────────────
const Screen2 = ({ data, onChange, errors }) => {
  const [countryOpen, setCountryOpen] = useState(false);
  const selectedCountry = COUNTRIES.find((c) => c.code === data.country) || COUNTRIES[0];

  const handleCountrySelect = (country) => {
    onChange('country', country.code);
    onChange('currency', country.currency);
    onChange('currencySymbol', country.symbol);
    onChange('phonePrefix', country.phone);
    setCountryOpen(false);
  };

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 32,
          fontWeight: 700,
          color: '#1a1614',
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        Where are you based?
      </h1>
      <p
        style={{
          color: '#6b6460',
          fontSize: 15,
          marginBottom: 32,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        We'll set your currency and notifications to match.
      </p>

      {/* Country Selector */}
      <Field label="Country" error={errors.country}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setCountryOpen(!countryOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 14px',
              border: `1.5px solid ${countryOpen ? '#1a3c2e' : '#ddd8d0'}`,
              borderRadius: 10,
              background: '#fff',
              cursor: 'pointer',
              fontSize: 15,
              color: '#1a1614',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'border-color 0.2s',
            }}
          >
            <span>{selectedCountry.name}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9e9994"
              strokeWidth="2"
              style={{
                transform: countryOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {countryOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1.5px solid #ddd8d0',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'slideDown 0.15s ease',
              }}
            >
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    border: 'none',
                    background:
                      country.code === data.country ? '#f5f2ed' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#1a1614',
                    fontFamily: "'DM Sans', sans-serif",
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#f5f2ed')
                  }
                  onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    country.code === data.country ? '#f5f2ed' : 'transparent')
                  }
                >
                  <span>{country.name}</span>
                  <span style={{ color: '#9e9994', fontSize: 13 }}>
                    {country.symbol} {country.currency}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      {/* Currency display — read only */}
      <Field label="Currency" hint="Auto-set based on your country">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '13px 14px',
            border: '1.5px solid #e5e0d8',
            borderRadius: 10,
            background: '#faf8f5',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1a3c2e',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {selectedCountry.symbol}
          </span>
          <span
            style={{
              fontSize: 15,
              color: '#6b6460',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {selectedCountry.currency} — {selectedCountry.name}
          </span>
        </div>
      </Field>

      {/* Phone */}
      <Field label="Phone Number" error={errors.phone} hint="For instant rent payment alerts">
        <Input
          type="tel"
          placeholder="8012345678"
          value={data.phone}
          autoComplete="tel"
          onChange={(v) => onChange('phone', v)}
          prefix={selectedCountry.phone}
        />
      </Field>
    </div>
  );
};

// ── Screen 3 — Profile ───────────────────────────────────────
const Screen3 = ({ data, onChange, errors }) => (
  <div>
    <h1
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 32,
        fontWeight: 700,
        color: '#1a1614',
        marginBottom: 8,
        lineHeight: 1.2,
      }}
    >
      Tell us about yourself
    </h1>
    <p
      style={{
        color: '#6b6460',
        fontSize: 15,
        marginBottom: 32,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      We'll tailor your dashboard to fit.
    </p>

    {/* Account Type */}
    <Field label="What best describes you?" error={errors.accountType}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ACCOUNT_TYPES.map((type) => {
          const selected = data.accountType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange('accountType', type.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                border: `1.5px solid ${selected ? '#1a3c2e' : '#ddd8d0'}`,
                borderRadius: 12,
                background: selected ? '#f0f7f4' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 22 }}>{type.icon}</span>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1a1614',
                    margin: 0,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {type.label}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: '#9e9994',
                    margin: '2px 0 0',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {type.desc}
                </p>
              </div>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${selected ? '#1a3c2e' : '#ddd8d0'}`,
                  background: selected ? '#1a3c2e' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  color: '#fff',
                }}
              >
                {selected && <CheckIcon />}
              </div>
            </button>
          );
        })}
      </div>
    </Field>

    {/* Portfolio Size */}
    <Field label="How many units are you managing?" error={errors.portfolioSize}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 4,
        }}
      >
        {PORTFOLIO_SIZES.map((size) => {
          const selected = data.portfolioSize === size.id;
          return (
            <button
              key={size.id}
              type="button"
              onClick={() => onChange('portfolioSize', size.id)}
              style={{
                padding: '14px 12px',
                border: `1.5px solid ${selected ? '#1a3c2e' : '#ddd8d0'}`,
                borderRadius: 12,
                background: selected ? '#f0f7f4' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {selected && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#1a3c2e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <CheckIcon />
                </div>
              )}
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#1a1614',
                  margin: '0 0 4px',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {size.label}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: selected ? '#1a3c2e' : '#9e9994',
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {size.plan} · {size.price}
              </p>
            </button>
          );
        })}
      </div>
    </Field>
  </div>
);

// ── Success Screen ───────────────────────────────────────────
const SuccessScreen = ({ name, onStart }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: 400,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s ease',
      }}
    >
      {/* Animated check */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(26,60,46,0.3)',
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 30,
          fontWeight: 700,
          color: '#1a1614',
          marginBottom: 12,
        }}
      >
        Welcome to Gravlo,{' '}
        <span style={{ color: '#1a3c2e' }}>
          {name?.split(' ')[0] || 'friend'}
        </span>
        ! 🎉
      </h1>

      <p
        style={{
          color: '#6b6460',
          fontSize: 16,
          maxWidth: 320,
          lineHeight: 1.6,
          marginBottom: 32,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Your dashboard is ready. Let's set up your first property and start collecting rent digitally.
      </p>

      <button
        type="button"
        onClick={onStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '15px 32px',
          background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: '0 4px 16px rgba(26,60,46,0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,60,46,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,60,46,0.3)';
        }}
      >
        Go to Dashboard
        <ArrowIcon />
      </button>
    </div>
  );
};

// ── Main Register Component ────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate();
  const { changeCountry } = useLocale();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [animDir, setAnimDir] = useState('forward');
  const [contentVisible, setContentVisible] = useState(true);

  const [form, setForm] = useState({
    // Screen 1
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Screen 2
    country: 'NG',
    currency: 'NGN',
    currencySymbol: '₦',
    phonePrefix: '+234',
    phone: '',
    // Screen 3
    accountType: '',
    portfolioSize: '',
  });

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.fullName.trim()) e.fullName = 'Full name is required';
      if (!form.email.includes('@')) e.email = 'Enter a valid email';
      if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    }
    if (step === 2) {
      if (!form.country) e.country = 'Please select your country';
      if (!form.phone.trim()) e.phone = 'Phone number is required';
    }
    if (step === 3) {
      if (!form.accountType) e.accountType = 'Please select an account type';
      if (!form.portfolioSize) e.portfolioSize = 'Please select your portfolio size';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const transition = (direction, callback) => {
    setAnimDir(direction);
    setContentVisible(false);
    setTimeout(() => {
      callback();
      setContentVisible(true);
    }, 250);
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (step < 3) {
      transition('forward', () => setStep((s) => s + 1));
    } else {
      // Final Submission: Firebase Registration
      setLoading(true);
      try {
        await registerUser({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          fullName: form.fullName.trim(),
          phone: `${form.phonePrefix}${form.phone}`,
          countryCode: form.country,
          role: 'landlord', // This wizard is specifically for landlords/managers
          // Profile enrichment fields
          businessType: form.accountType,
          portfolioSize: form.portfolioSize,
          onboardingComplete: true // Mark onboarded immediately
        });

        // Update local state to match selection
        changeCountry(form.country);

        transition('forward', () => setStep(4));
      } catch (err) {
        console.error('Registration failed:', err);
        toast.error(err.message || 'Registration failed. Please try again.');
        setErrors({ email: err.message }); // Generic error placement
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      transition('back', () => setStep((s) => s - 1));
    }
  };

  const STEP_LABELS = ['Account', 'Location', 'Profile'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes popIn {
          0%   { transform: scale(0); }
          80%  { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        @keyframes float {
          from { transform: translateY(0px) rotate(0deg); }
          to   { transform: translateY(-12px) rotate(180deg); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .screen-enter-forward {
          animation: enterForward 0.25s ease forwards;
        }
        .screen-enter-back {
          animation: enterBack 0.25s ease forwards;
        }

        @keyframes enterForward {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        @keyframes enterBack {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: '#f5f2ed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Card */}
        <div
          style={{
            width: '100%',
            maxWidth: 460,
            background: '#fffdf9',
            borderRadius: 20,
            padding: '40px 40px 36px',
            boxShadow:
              '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top decoration */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, #1a3c2e, #2d6a4f, #52b788)',
            }}
          />

          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  fill="white"
                  opacity="0.9"
                />
                <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.6" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                fontWeight: 700,
                color: '#1a1614',
              }}
            >
              Gravlo
            </span>
          </div>

          {/* Progress (only on steps 1-3) */}
          {step <= 3 && (
            <>
              <ProgressBar step={step} total={3} />

              {/* Step labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: -32,
                  marginBottom: 32,
                }}
              >
                {STEP_LABELS.map((label, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      fontWeight: i + 1 <= step ? 600 : 400,
                      color: i + 1 <= step ? '#1a3c2e' : '#c4bfba',
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Screen content */}
          <div
            key={step}
            className={
              contentVisible
                ? animDir === 'forward'
                  ? 'screen-enter-forward'
                  : 'screen-enter-back'
                : ''
            }
            style={{ opacity: contentVisible ? 1 : 0, transition: 'opacity 0.15s' }}
          >
            {step === 1 && (
              <Screen1 data={form} onChange={onChange} errors={errors} />
            )}
            {step === 2 && (
              <Screen2 data={form} onChange={onChange} errors={errors} />
            )}
            {step === 3 && (
              <Screen3 data={form} onChange={onChange} errors={errors} />
            )}
            {step === 4 && <SuccessScreen name={form.fullName} onStart={() => navigate('/dashboard')} />}
          </div>

          {/* Navigation */}
          {step <= 3 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 32,
                gap: 12,
              }}
            >
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '13px 20px',
                    border: '1.5px solid #ddd8d0',
                    borderRadius: 10,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 15,
                    color: '#6b6460',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = '#1a3c2e')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = '#ddd8d0')
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                style={{
                  flex: step === 1 ? 1 : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '13px 28px',
                  background: loading
                    ? '#9e9994'
                    : 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: loading
                    ? 'none'
                    : '0 4px 14px rgba(26,60,46,0.3)',
                  transition: 'all 0.2s',
                  minWidth: 140,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow =
                      '0 6px 20px rgba(26,60,46,0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 14px rgba(26,60,46,0.3)';
                }}
              >
                {loading ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Setting up...
                  </>
                ) : (
                  <>
                    {step === 3 ? 'Create Account' : 'Continue'}
                    <ArrowIcon />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sign in link */}
          {step === 1 && (
            <p
              style={{
                textAlign: 'center',
                marginTop: 20,
                fontSize: 13,
                color: '#9e9994',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: '#1a3c2e',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

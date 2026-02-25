// src/pages/AcceptInvitePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public page — validates a unit invite token and lets the tenant accept it.
// Integrated with a high-fidelity multi-step wizard.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    KeyRound, Home, Check, ArrowRight, ArrowLeft,
    Loader2, AlertTriangle, Clock, UserX, DoorOpen
} from 'lucide-react';
import { fetchInviteToken, acceptInviteToken } from '../services/inviteTokens';
import { getVacantUnits, requestUnitApproval, registerUser } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

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

// ── Icons (inline SVG from user provided design) ───────────────────
const EyeIcon = ({ open }) =>
    open ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );

const CheckIcon = ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const ArrowIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const GoogleIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const fmt = (amount, symbol = '₦') =>
    `${symbol}${Number(amount).toLocaleString()}`;

// ── Shared UI Components ─────────────────────────────────────
const Field = ({ label, error, hint, children }) => (
    <div style={{ marginBottom: 18 }}>
        <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#8a8178',
            marginBottom: 7,
            fontFamily: "'DM Sans', sans-serif",
        }}>
            {label}
        </label>
        {children}
        {hint && !error && (
            <p style={{ fontSize: 12, color: '#b0a89e', marginTop: 5, fontFamily: "'DM Sans', sans-serif" }}>
                {hint}
            </p>
        )}
        {error && (
            <p style={{ fontSize: 12, color: '#c0392b', marginTop: 5, fontFamily: "'DM Sans', sans-serif" }}>
                {error}
            </p>
        )}
    </div>
);

const Input = ({ type = 'text', placeholder, value, onChange, suffix, autoComplete }) => {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            border: `1.5px solid ${focused ? '#c8a951' : '#e0dbd4'}`,
            borderRadius: 10,
            background: '#fff',
            transition: 'border-color 0.2s',
            overflow: 'hidden',
        }}>
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
                <span style={{ padding: '0 14px', color: '#b0a89e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {suffix}
                </span>
            )}
        </div>
    );
};

const PropertyBanner = ({ propertyName, address }) => (
    <div style={{
        background: 'linear-gradient(135deg, #1a3c2e 0%, #2d6a4f 100%)',
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
    }}>
        <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
        }}>
            <Home size={20} />
        </div>
        <div style={{ flex: 1 }}>
            <p style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 3px',
                fontFamily: "'Playfair Display', serif",
            }}>
                {propertyName}
            </p>
            <p style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                margin: 0,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                {address || 'Building Portal'}
            </p>
        </div>
    </div>
);

// ── Screen components ─────────────────────────────────────────

const ScreenUnit = ({ propertyName, address, vacantUnits, loadingUnits, selectedUnit, onSelect }) => (
    <div>
        <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            color: '#1a1614',
            marginBottom: 6,
            lineHeight: 1.2,
        }}>
            Choose your unit
        </h1>
        <p style={{
            color: '#8a8178',
            fontSize: 14,
            marginBottom: 24,
            fontFamily: "'DM Sans', sans-serif",
        }}>
            Select the unit you're moving into.
        </p>

        <PropertyBanner propertyName={propertyName} address={address} />

        {/* Available units */}
        <p style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#8a8178',
            marginBottom: 10,
            fontFamily: "'DM Sans', sans-serif",
        }}>
            Available · {vacantUnits.length} unit{vacantUnits.length !== 1 ? 's' : ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {loadingUnits ? (
                <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
                    <Loader2 size={24} className="animate-spin text-sage" />
                </div>
            ) : vacantUnits.length === 0 ? (
                <div style={{ padding: '20px', border: '1.5px solid #e0dbd4', borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#b0a89e' }}>No vacant units found.</p>
                </div>
            ) : (
                vacantUnits.map((unit) => {
                    const selected = selectedUnit?.id === unit.id;
                    return (
                        <button
                            key={unit.id}
                            type="button"
                            onClick={() => onSelect(unit)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 16px',
                                border: `1.5px solid ${selected ? '#c8a951' : '#e0dbd4'}`,
                                borderRadius: 12,
                                background: selected ? '#fdf8ec' : '#fff',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                boxShadow: selected ? '0 2px 12px rgba(200,169,81,0.15)' : 'none',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: selected ? '#c8a951' : '#f5f0e8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s',
                                    color: selected ? '#fff' : '#8a8178',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    fontFamily: "'DM Sans', sans-serif",
                                }}>
                                    {selected ? <CheckIcon size={16} /> : (unit.name?.match(/\d+/)?.[0] || '1')}
                                </div>
                                <div>
                                    <p style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: '#1a1614',
                                        margin: '0 0 2px',
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}>
                                        {unit.name}
                                    </p>
                                    <p style={{
                                        fontSize: 12,
                                        color: '#b0a89e',
                                        margin: 0,
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}>
                                        {unit.floor || 'Floor'}
                                    </p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: selected ? '#c8a951' : '#1a1614',
                                    margin: '0 0 2px',
                                    fontFamily: "'DM Sans', sans-serif",
                                    transition: 'color 0.2s',
                                }}>
                                    {fmt(unit.rentAmount || 0, unit.currencySymbol || '₦')}
                                </p>
                                <p style={{
                                    fontSize: 11,
                                    color: '#b0a89e',
                                    margin: 0,
                                    fontFamily: "'DM Sans', sans-serif",
                                }}>
                                    /{unit.billingCycle || 'mo'}
                                </p>
                            </div>
                        </button>
                    );
                })
            )}
        </div>
    </div>
);

const ScreenAccount = ({ data, onChange, errors, unit, user }) => {
    const [showPw, setShowPw] = useState(false);
    const [showCpw, setShowCpw] = useState(false);

    return (
        <div>
            <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28,
                fontWeight: 700,
                color: '#1a1614',
                marginBottom: 6,
                lineHeight: 1.2,
            }}>
                {user ? 'Confirm your details' : 'Create your account'}
            </h1>
            <p style={{
                color: '#8a8178',
                fontSize: 14,
                marginBottom: 24,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                {user ? 'You are logged in. Please verify your info before joining.' : 'Almost home. Just set up your tenant account.'}
            </p>

            {/* Selected unit reminder */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: '#fdf8ec',
                border: '1.5px solid #e8d99a',
                borderRadius: 10,
                marginBottom: 24,
            }}>
                <span style={{ fontSize: 18 }}>🏠</span>
                <div style={{ flex: 1 }}>
                    <p style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1a1614',
                        margin: '0 0 1px',
                        fontFamily: "'DM Sans', sans-serif",
                    }}>
                        {unit?.name} · {unit?.floor || 'Ground Floor'}
                    </p>
                    <p style={{
                        fontSize: 12,
                        color: '#b0a89e',
                        margin: 0,
                        fontFamily: "'DM Sans', sans-serif",
                    }}>
                        {fmt(unit?.rentAmount || unit?.rent || 0, unit?.currencySymbol || unit?.symbol || '₦')}/month · Pending approval
                    </p>
                </div>
            </div>

            {user ? (
                <div style={{ padding: '20px', border: '1.5px solid #e0dbd4', borderRadius: 12, background: '#faf8f5', textAlign: 'center', marginBottom: 20 }}>
                    <p style={{ fontSize: 14, color: '#8a8178', fontFamily: "'DM Sans', sans-serif" }}>
                        Signed in as <strong>{user.email}</strong>
                    </p>
                </div>
            ) : (
                <>
                    {/* Google */}
                    <button
                        type="button"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            padding: '13px 20px',
                            border: '1.5px solid #e0dbd4',
                            borderRadius: 10,
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#1a1614',
                            marginBottom: 20,
                            fontFamily: "'DM Sans', sans-serif",
                            transition: 'border-color 0.2s',
                        }}
                        onClick={() => toast.error('Google Sign-in coming soon.')}
                    >
                        <GoogleIcon /> Continue with Google
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ flex: 1, height: 1, background: '#ede8e0' }} />
                        <span style={{ fontSize: 11, color: '#b0a89e', fontFamily: "'DM Sans', sans-serif" }}>
                            or with email
                        </span>
                        <div style={{ flex: 1, height: 1, background: '#ede8e0' }} />
                    </div>

                    <Field label="Full Name" error={errors.fullName}>
                        <Input
                            placeholder="Tunde Bello"
                            value={data.fullName}
                            autoComplete="name"
                            onChange={(v) => onChange('fullName', v)}
                        />
                    </Field>

                    <Field label="Email Address" error={errors.email}>
                        <Input
                            type="email"
                            placeholder="tunde@example.com"
                            value={data.email}
                            autoComplete="email"
                            onChange={(v) => onChange('email', v)}
                        />
                    </Field>

                    <Field label="Phone Number" error={errors.phone} hint="For rent payment reminders">
                        <Input
                            type="tel"
                            placeholder="+234 801 234 5678"
                            value={data.phone}
                            autoComplete="tel"
                            onChange={(v) => onChange('phone', v)}
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
                                <span onClick={() => setShowPw(!showPw)} style={{ display: 'flex' }}>
                                    <EyeIcon open={showPw} />
                                </span>
                            }
                        />
                    </Field>

                    <Field label="Confirm Password" error={errors.confirmPassword}>
                        <Input
                            type={showCpw ? 'text' : 'password'}
                            placeholder="Repeat your password"
                            value={data.confirmPassword}
                            autoComplete="new-password"
                            onChange={(v) => onChange('confirmPassword', v)}
                            suffix={
                                <span onClick={() => setShowCpw(!showCpw)} style={{ display: 'flex' }}>
                                    <EyeIcon open={showCpw} />
                                </span>
                            }
                        />
                    </Field>
                </>
            )}
        </div>
    );
};

const ScreenConfirm = ({ data, unit, propertyName, landlordName }) => (
    <div>
        <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            color: '#1a1614',
            marginBottom: 6,
        }}>
            Review & request
        </h1>
        <p style={{
            color: '#8a8178',
            fontSize: 14,
            marginBottom: 28,
            fontFamily: "'DM Sans', sans-serif",
        }}>
            Confirm your details before sending your join request.
        </p>

        {/* Summary card */}
        <div style={{
            border: '1.5px solid #e0dbd4',
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: 20,
        }}>
            {/* Property */}
            <div style={{
                background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
                padding: '16px 20px',
            }}>
                <p style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.6)',
                    margin: '0 0 4px',
                    fontFamily: "'DM Sans', sans-serif",
                }}>
                    Property
                </p>
                <p style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 0 2px',
                    fontFamily: "'Playfair Display', serif",
                }}>
                    {propertyName}
                </p>
                <p style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                    margin: 0,
                    fontFamily: "'DM Sans', sans-serif",
                }}>
                    Landlord: {landlordName || 'Chidi Okafor'}
                </p>
            </div>

            {/* Details rows */}
            {[
                { label: 'Unit', value: unit?.name },
                { label: 'Floor', value: unit?.floor || 'Ground Floor' },
                { label: 'Monthly Rent', value: fmt(unit?.rentAmount || unit?.rent || 0, unit?.currencySymbol || unit?.symbol || '₦'), highlight: true },
                { label: 'Your Name', value: data.fullName },
                { label: 'Your Email', value: data.email },
                { label: 'Your Phone', value: data.phone },
            ].map((row, i) => (
                <div
                    key={i}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '13px 20px',
                        borderBottom: i < 5 ? '1px solid #f0ece6' : 'none',
                        background: '#fff',
                    }}
                >
                    <span style={{
                        fontSize: 13,
                        color: '#8a8178',
                        fontFamily: "'DM Sans', sans-serif",
                    }}>
                        {row.label}
                    </span>
                    <span style={{
                        fontSize: 14,
                        fontWeight: row.highlight ? 700 : 500,
                        color: row.highlight ? '#c8a951' : '#1a1614',
                        fontFamily: "'DM Sans', sans-serif",
                    }}>
                        {row.value || '—'}
                    </span>
                </div>
            ))}
        </div>

        {/* What happens next */}
        <div style={{
            background: '#faf8f5',
            border: '1.5px solid #ede8e0',
            borderRadius: 12,
            padding: '14px 16px',
        }}>
            <p style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#8a8178',
                margin: '0 0 10px',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
            }}>
                What happens next
            </p>
            {[
                'Your request is sent to the landlord',
                'Landlord reviews and approves you',
                'Your tenant dashboard unlocks instantly',
                'Pay rent digitally from day one',
            ].map((step, i) => (
                <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: i < 3 ? 8 : 0,
                }}>
                    <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#1a3c2e',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0,
                        fontFamily: "'DM Sans', sans-serif",
                    }}>
                        {i + 1}
                    </div>
                    <p style={{
                        fontSize: 13,
                        color: '#6b6460',
                        margin: 0,
                        fontFamily: "'DM Sans', sans-serif",
                    }}>
                        {step}
                    </p>
                </div>
            ))}
        </div>
    </div>
);

const SuccessScreen = ({ name, unitName, propertyName, onDone }) => {
    const [visible, setVisible] = useState(false);
    const [confetti, setConfetti] = useState([]);

    useEffect(() => {
        setTimeout(() => setVisible(true), 100);
        setConfetti(
            Array.from({ length: 12 }, (_, i) => ({
                id: i,
                color: ['#1a3c2e', '#c8a951', '#e74c3c', '#3498db', '#2ecc71', '#f39c12'][i % 6],
                left: `${5 + i * 8}%`,
                delay: `${i * 0.1}s`,
                duration: `${1.2 + (i % 3) * 0.4}s`,
                size: 6 + (i % 3) * 3,
            }))
        );
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            minHeight: 460,
            justifyContent: 'center',
            position: 'relative',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease',
        }}>
            {/* Confetti */}
            {confetti.map((c) => (
                <div key={c.id} style={{
                    position: 'absolute',
                    width: c.size,
                    height: c.size,
                    borderRadius: '50%',
                    background: c.color,
                    top: `${10 + Math.floor(c.id / 3) * 20}%`,
                    left: c.left,
                    animation: `confettiFall ${c.duration} ease-in-out ${c.delay} infinite alternate`,
                    opacity: 0.7,
                }} />
            ))}

            {/* Big animated icon */}
            <div style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #c8a951, #f0c040)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                boxShadow: '0 8px 32px rgba(200,169,81,0.4)',
                animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                fontSize: 40,
            }}>
                🏠
            </div>

            <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28,
                fontWeight: 700,
                color: '#1a1614',
                marginBottom: 10,
                lineHeight: 1.2,
            }}>
                Request sent,{' '}
                <span style={{ color: '#1a3c2e' }}>
                    {name?.split(' ')[0] || 'friend'}
                </span>
                ! 🎉
            </h1>

            <p style={{
                color: '#8a8178',
                fontSize: 15,
                maxWidth: 300,
                lineHeight: 1.65,
                marginBottom: 8,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                Your join request for <strong style={{ color: '#1a1614' }}>{unitName}</strong> at{' '}
                <strong style={{ color: '#1a1614' }}>{propertyName}</strong> has been sent.
            </p>

            <p style={{
                color: '#b0a89e',
                fontSize: 13,
                marginBottom: 32,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                You'll get an email the moment your landlord approves you.
            </p>

            {/* Status pill */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                background: '#fdf8ec',
                border: '1.5px solid #e8d99a',
                borderRadius: 99,
                marginBottom: 32,
            }}>
                <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#c8a951',
                    animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#9a7a28',
                    fontFamily: "'DM Sans', sans-serif",
                }}>
                    Awaiting landlord approval
                </span>
            </div>

            <button
                type="button"
                onClick={onDone}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
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
                View My Dashboard
                <ArrowIcon />
            </button>
        </div>
    );
};

// ── Status screens ────────────────────────────────────────────
const StatusScreen = ({ title, message, icon: Icon, color = '#1a1614' }) => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color }}>
            <Icon size={36} />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#1a1614', marginBottom: 12 }}>{title}</h2>
        <p style={{ fontSize: 15, color: '#8a8178', fontFamily: "'DM Sans', sans-serif", maxWidth: 320, margin: '0 auto' }}>{message}</p>
    </div>
);

// ── Main Page Component ───────────────────────────────────────
export default function AcceptInvitePage() {
    const { token } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(-1); // -1 = initial load
    const [loading, setLoading] = useState(false);
    const [inviteData, setInviteData] = useState(null);
    const [vacantUnits, setVacantUnits] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [errors, setErrors] = useState({});
    const [animDir, setAnimDir] = useState('forward');
    const [visible, setVisible] = useState(true);

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    // Pre-fill if user is logged in
    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                fullName: user.displayName || '',
                email: user.email || '',
            }));
        }
    }, [user]);

    // Load invite data
    useEffect(() => {
        const init = async () => {
            try {
                const { data, valid, reason } = await fetchInviteToken(token);
                if (!valid) {
                    setInviteData({ reason });
                    setStep(-2); // Error state
                    return;
                }

                setInviteData(data);

                // Decide starting step
                if (data.unitId) {
                    setSelectedUnit({ id: data.unitId, name: data.unitName, symbol: '₦' });
                    setStep(1); // Proceed to account
                } else {
                    setStep(0); // Pick a unit
                    setLoadingUnits(true);
                    const units = await getVacantUnits(data.landlordUid, data.propertyId);
                    setVacantUnits(units);
                    setLoadingUnits(false);
                }
            } catch (err) {
                setInviteData({ reason: 'error' });
                setStep(-2);
            }
        };
        init();
    }, [token]);

    const onChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const validate = () => {
        const e = {};
        if (step === 0 && !selectedUnit) {
            e.unit = 'Please select a unit';
        }
        if (step === 1 && !user) {
            if (!form.fullName.trim()) e.fullName = 'Full name is required';
            if (!form.email.includes('@')) e.email = 'Enter a valid email';
            if (!form.phone.trim()) e.phone = 'Phone number is required';
            if (form.password.length < 8) e.password = 'At least 8 characters';
            if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const transition = (dir, cb) => {
        setAnimDir(dir);
        setVisible(false);
        setTimeout(() => { cb(); setVisible(true); }, 220);
    };

    const handleNext = async () => {
        if (!validate()) return;

        // If Step 1 (Account) and NOT logged in -> Register first
        if (step === 1 && !user) {
            setLoading(true);
            try {
                await registerUser({
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    role: 'tenant',
                    countryCode: 'NG', // Default for tenant registration via wizard
                });
                toast.success('Account created!');
                transition('forward', () => setStep(2));
            } catch (err) {
                toast.error(err.message || 'Registration failed.');
                setErrors({ email: err.message });
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step < 2) {
            transition('forward', () => setStep((s) => s + 1));
        } else {
            // Final Step: Submit Request or Accept Directly
            setLoading(true);
            try {
                if (!inviteData.unitId) {
                    // Building portal path -> request approval
                    await requestUnitApproval(inviteData.landlordUid, inviteData.propertyId, selectedUnit.id, user);
                    transition('forward', () => setStep(3));
                } else {
                    // Specific unit path -> direct accept
                    await acceptInviteToken(token, user);
                    transition('forward', () => setStep(3));
                }
            } catch (err) {
                toast.error(err.message || 'Submission failed.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (step > 0) transition('back', () => setStep((s) => s - 1));
    };

    // ── Render Logic ───────────────────────────────────────────

    if (step === -1) {
        return (
            <Layout shell={true}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={32} className="animate-spin text-sage mb-4 mx-auto" />
                    <p style={{ color: '#8a8178', fontFamily: "'DM Sans', sans-serif" }}>Verifying your invite...</p>
                </div>
            </Layout>
        );
    }

    if (step === -2) {
        const r = inviteData?.reason;
        return (
            <Layout shell={true}>
                {r === 'already_used' && <StatusScreen title="Link Used" message="This invite link has already been accepted." icon={Check} color="#4A7C59" />}
                {r === 'expired' && <StatusScreen title="Link Expired" message="This invite has expired. Ask your landlord for a new one." icon={Clock} color="#c8a951" />}
                {r === 'unit_occupied' && <StatusScreen title="Unit Occupied" message="This unit already has a tenant assigned." icon={UserX} color="#B84C3A" />}
                {(r === 'not_found' || r === 'error') && <StatusScreen title="Invalid Link" message="This invite link is invalid or has been revoked." icon={AlertTriangle} color="#B84C3A" />}
                <button onClick={() => navigate('/login')} className="btn-primary mt-6 w-full justify-center">Back to Login</button>
            </Layout>
        );
    }

    const STEPS = ['Choose Unit', 'Your Account', 'Confirm'];
    const showProgress = step < 3 && !inviteData?.unitId;
    const currentTotalSteps = inviteData?.unitId ? 2 : 3;

    return (
        <Layout>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        @keyframes popIn {
          0%   { transform: scale(0); }
          80%  { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes confettiFall {
          from { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          to   { transform: translateY(-16px) rotate(200deg); opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes enterForward {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes enterBack {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .enter-fwd { animation: enterForward 0.22s ease forwards; }
        .enter-bck { animation: enterBack 0.22s ease forwards; }
      `}</style>

            <div style={{
                width: '100%',
                maxWidth: 460,
                background: '#fffdf9',
                borderRadius: 20,
                padding: '38px 38px 34px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.09)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Top accent */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 3,
                    background: 'linear-gradient(90deg, #c8a951, #f0c040, #e8a020)',
                }} />

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.9" />
                            <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.6" />
                        </svg>
                    </div>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#1a1614' }}>Gravlo</span>
                    <span style={{
                        fontSize: 11, fontWeight: 600, color: '#c8a951',
                        background: '#fdf8ec', border: '1px solid #e8d99a',
                        padding: '2px 8px', borderRadius: 99, marginLeft: 4,
                        fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em',
                    }}>Tenant Portal</span>
                </div>

                {/* Progress bar */}
                {step < 3 && (
                    <div style={{ marginBottom: 28 }}>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} style={{
                                    height: 3, flex: 1, borderRadius: 99,
                                    background: i <= step ? '#c8a951' : '#e0dbd4',
                                    transition: 'background 0.4s ease',
                                    opacity: (inviteData?.unitId && i === 0) ? 0 : 1 // Hide first seg for unit-specific
                                }} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {STEPS.map((label, i) => (
                                <span key={i} style={{
                                    fontSize: 10, fontWeight: i <= step ? 700 : 400,
                                    color: i <= step ? '#c8a951' : '#c4bfba',
                                    fontFamily: "'DM Sans', sans-serif",
                                    letterSpacing: '0.06em', textTransform: 'uppercase',
                                    opacity: (inviteData?.unitId && i === 0) ? 0 : 1
                                }}>{label}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Animated screen container */}
                <div key={step} className={visible ? (animDir === 'forward' ? 'enter-fwd' : 'enter-bck') : ''} style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.15s' }}>
                    {step === 0 && <ScreenUnit propertyName={inviteData?.propertyName} address={inviteData?.address} vacantUnits={vacantUnits} loadingUnits={loadingUnits} selectedUnit={selectedUnit} onSelect={setSelectedUnit} />}
                    {step === 1 && <ScreenAccount data={form} onChange={onChange} errors={errors} unit={selectedUnit} user={user} />}
                    {step === 2 && <ScreenConfirm data={form} unit={selectedUnit} propertyName={inviteData?.propertyName} landlordName={inviteData?.landlordName} />}
                    {step === 3 && <SuccessScreen name={form.fullName} unitName={selectedUnit?.name} propertyName={inviteData?.propertyName} onDone={() => navigate('/tenant')} />}
                </div>

                {/* Navigation */}
                {step < 3 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
                        {(step > 0 && !(inviteData?.unitId && step === 1)) ? (
                            <button
                                type="button"
                                onClick={handleBack}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px',
                                    border: '1.5px solid #e0dbd4', borderRadius: 10, background: 'transparent',
                                    cursor: 'pointer', fontSize: 14, color: '#8a8178',
                                    fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#c8a951')}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e0dbd4')}
                            >
                                <ArrowLeft size={15} /> Back
                            </button>
                        ) : <div />}

                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={loading || (step === 0 && !selectedUnit)}
                            style={{
                                flex: (step === 0 || (inviteData?.unitId && step === 1)) ? 1 : 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '13px 26px',
                                background: (loading || (step === 0 && !selectedUnit)) ? '#d4cec7' : 'linear-gradient(135deg, #c8a951, #e0bc5a)',
                                color: (step === 0 && !selectedUnit) ? '#9e9994' : '#1a1614',
                                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                                cursor: (loading || (step === 0 && !selectedUnit)) ? 'not-allowed' : 'pointer',
                                fontFamily: "'DM Sans', sans-serif",
                                boxShadow: (step === 0 && !selectedUnit) ? 'none' : '0 4px 14px rgba(200,169,81,0.35)',
                                transition: 'all 0.2s', minWidth: 140,
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && (step !== 0 || selectedUnit)) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(200,169,81,0.5)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = (step === 0 && !selectedUnit) ? 'none' : '0 4px 14px rgba(200,169,81,0.35)';
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {step === 0 ? 'Continue with selection' : step === 2 ? 'Send Request' : 'Continue'}
                                    <ArrowIcon />
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Bottom login link for fresh users */}
                {step === 0 && !user && (
                    <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#b0a89e', fontFamily: "'DM Sans', sans-serif" }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#1a3c2e', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                )}
            </div>
        </Layout>
    );
}

// ── Layout Wrapper ─────────────────────────────────────────────
function Layout({ children, shell }) {
    return (
        <div style={{
            minHeight: '100vh', background: '#f2ede6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px',
        }}>
            {shell ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 32, justifyContent: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4A7C59', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <KeyRound size={17} className="text-white" />
                        </div>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20 }}>Gravlo</span>
                    </div>
                    {children}
                </div>
            ) : children}
        </div>
    );
}

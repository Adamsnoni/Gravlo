import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Field, Input, GoogleIcon, EyeIcon } from './InviteComponents';

const fmt = (amount, symbol = '₦') =>
    `${symbol}${Number(amount).toLocaleString()}`;

export const ScreenAccount = ({ data, onChange, errors, unit, user }) => {
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

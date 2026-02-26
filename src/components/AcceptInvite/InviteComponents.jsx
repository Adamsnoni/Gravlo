import React, { useState } from 'react';
import { Home, KeyRound } from 'lucide-react';

export const ArrowIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

export const StatusScreen = ({ title, message, icon: Icon, color = '#1a1614' }) => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color }}>
            <Icon size={36} />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#1a1614', marginBottom: 12 }}>{title}</h2>
        <p style={{ fontSize: 15, color: '#8a8178', fontFamily: "'DM Sans', sans-serif", maxWidth: 320, margin: '0 auto' }}>{message}</p>
    </div>
);

export const Layout = ({ children, shell }) => (
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

export const EyeIcon = ({ open }) =>
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

export const CheckIcon = ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const GoogleIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export const Field = ({ label, error, hint, children }) => (
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

export const Input = ({ type = 'text', placeholder, value, onChange, suffix, autoComplete }) => {
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

export const PropertyBanner = ({ propertyName, address }) => (
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

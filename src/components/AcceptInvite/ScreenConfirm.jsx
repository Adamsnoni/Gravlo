import React from 'react';

const fmt = (amount, symbol = '₦') =>
    `${symbol}${Number(amount).toLocaleString()}`;

export const ScreenConfirm = ({ data, unit, propertyName, landlordName }) => (
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

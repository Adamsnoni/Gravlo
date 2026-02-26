import React from 'react';
import { Loader2 } from 'lucide-react';
import { PropertyBanner, CheckIcon } from './InviteComponents';

const fmt = (amount, symbol = '₦') =>
    `${symbol}${Number(amount).toLocaleString()}`;

export const ScreenUnit = ({ propertyName, address, vacantUnits, loadingUnits, selectedUnit, onSelect }) => (
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

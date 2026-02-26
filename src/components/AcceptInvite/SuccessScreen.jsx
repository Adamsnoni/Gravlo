import React, { useState, useEffect } from 'react';

export const SuccessScreen = ({ name, unitName, propertyName, onDone }) => {
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
            </button>
        </div>
    );
};

import React, { useState } from 'react';
import { CornerLeaf } from '../Shared/Branding';

/**
 * StatCard - A high-fidelity card for displaying metrics.
 */
export const StatCard = ({ label, value, sub, subColor, icon, accentBg, accentColor, borderColor, delay = 0 }) => {
    const [hov, setHov] = useState(false);

    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                background: "#fff",
                border: `1.5px solid ${hov ? accentColor + "55" : borderColor || "#e2ede8"}`,
                borderRadius: 20,
                padding: "22px 24px",
                position: "relative",
                overflow: "hidden",
                animation: `slideUp 0.5s ease ${delay}s both`,
                boxShadow: hov ? `0 12px 32px ${accentColor}18` : "0 1px 8px rgba(26,60,46,0.06)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: hov ? "translateY(-3px)" : "translateY(0)",
                cursor: "default",
            }}
        >
            <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }`}</style>
            <CornerLeaf size={56} opacity={0.055} color="#1a3c2e" />
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                borderRadius: "20px 20px 0 0",
                background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40)`
            }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", color: accentColor }}>
                    {icon}
                </div>
                <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94a3b8",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    paddingTop: 4
                }}>{label}</span>
            </div>
            <p style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#0f2318",
                margin: "0 0 6px",
                fontFamily: "'Fraunces', serif",
                lineHeight: 1,
                letterSpacing: "-0.025em"
            }}>{value}</p>
            {sub && <p style={{
                fontSize: 12,
                color: subColor || "#94a3b8",
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500
            }}>{sub}</p>}
        </div>
    );
};

export default StatCard;

import React, { useState } from 'react';
import { CornerLeaf } from '../Shared/Branding';

/**
 * StatCard - A high-fidelity card for displaying metrics.
 */
export const StatCard = ({ label, value, sub, subColor, icon, accentBg, accentColor, borderColor, delay = 0, isLarge = false }) => {
    const [hov, setHov] = useState(false);

    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                background: "#fff",
                border: `1.5px solid ${hov ? accentColor + "55" : borderColor || "#e2ede8"}`,
                borderRadius: 24,
                padding: isLarge ? "32px 36px" : "22px 24px",
                position: "relative",
                overflow: "hidden",
                animation: `slideUp 0.5s ease ${delay}s both`,
                boxShadow: hov ? `0 20px 48px ${accentColor}25` : "0 2px 12px rgba(26,60,46,0.06)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: isLarge ? 24 : 16 }}>
                <div style={{
                    width: isLarge ? 56 : 44,
                    height: isLarge ? 56 : 44,
                    borderRadius: isLarge ? 18 : 14,
                    background: accentBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: accentColor
                }}>
                    {React.cloneElement(icon, { size: isLarge ? 24 : 20 })}
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
                fontSize: isLarge ? 42 : 32,
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

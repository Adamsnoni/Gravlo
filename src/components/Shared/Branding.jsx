import React from 'react';

/**
 * CornerLeaf - A decorative branding element used in card corners.
 */
export const CornerLeaf = ({ size = 64, opacity = 0.07, color = "#1a3c2e" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        style={{ position: "absolute", top: 0, right: 0, pointerEvents: "none" }}
    >
        <path d="M64 0C64 0 42 6 36 22C32 34 40 46 40 46C40 46 56 34 64 18Z" fill={color} opacity={opacity} />
        <path d="M64 0C64 0 58 24 46 32C38 38 26 36 26 36C26 36 40 20 64 0Z" fill={color} opacity={opacity * 0.6} />
    </svg>
);

/**
 * Avatar - Standardized user avatar component.
 */
export const Avatar = ({ initials, size = 36, bg = "#1a3c2e", color = "#7fffd4" }) => (
    <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.33,
        fontWeight: 800,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        letterSpacing: "0.02em"
    }}>
        {initials?.toUpperCase() || '?'}
    </div>
);

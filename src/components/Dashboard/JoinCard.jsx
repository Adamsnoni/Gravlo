import React, { useState } from 'react';
import { Avatar } from '../Shared/Branding';
import toast from 'react-hot-toast';

/**
 * Icon - Simple inline SVG icon wrapper.
 */
const Icon = ({ d, size = 18, stroke = 2 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={d} />
    </svg>
);

const Icons = {
    check: "M20 6L9 17l-5-5",
};

/**
 * JoinCard - A card representing a tenant's request to join a unit.
 */
export const JoinCard = ({ req, onApprove, approvingSaving }) => {
    const [status, setStatus] = useState("pending");

    const handleApprove = async () => {
        if (approvingSaving) return;
        try {
            await onApprove?.(req);
            setStatus("approved");
        } catch (e) {
            toast.error("Approval failed");
        }
    };

    const initials = (req.pendingTenantName || "U")
        .split(" ").map(w => w[0]).join("").slice(0, 2);

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 14,
            padding: "14px 0",
            borderBottom: "1px solid #f0f9f4"
        }}>
            <Avatar
                initials={initials}
                size={40}
                bg={status === "approved" ? "#1a3c2e" : status === "rejected" ? "#fef2f2" : "#e8f5ee"}
                color={status === "approved" ? "#7fffd4" : status === "rejected" ? "#dc2626" : "#1a6a3c"}
            />

            <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                    <p style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0f2318",
                        margin: 0,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                    }}>
                        {req.pendingTenantName}
                    </p>

                    {status !== "pending" && (
                        <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            flexShrink: 0,
                            background: status === "approved" ? "#dcfce7" : "#fef2f2",
                            color: status === "approved" ? "#16a34a" : "#dc2626"
                        }}>
                            {status === "approved" ? "✓ Approved" : "✗ Declined"}
                        </span>
                    )}
                </div>

                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <span style={{ color: "#1a6a3c", fontWeight: 600 }}>{req.unitName || req.name}</span> · {req.propertyName}
                </p>
            </div>

            {status === "pending" && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                        onClick={handleApprove}
                        disabled={approvingSaving}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: "none",
                            background: "#e8f5ee",
                            color: "#1a6a3c",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#1a3c2e";
                            e.currentTarget.style.color = "#7fffd4";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#e8f5ee";
                            e.currentTarget.style.color = "#1a6a3c";
                        }}
                    >
                        {approvingSaving ? (
                            <div className="w-3 h-3 border border-sage border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Icon d={Icons.check} size={14} stroke={2.5} />
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default JoinCard;

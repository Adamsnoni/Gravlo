import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Link2, Loader2, Trash2, ArrowRight } from 'lucide-react';

/**
 * PropertyThumb - A card for the property listing.
 */
export const PropertyThumb = ({ prop, onSelect, onInvite, inviting, delay = 0 }) => {
    const [hov, setHov] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.35 }}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            onClick={onSelect}
            style={{
                background: "#fff",
                borderRadius: "24px",
                padding: "24px",
                border: "1.5px solid",
                borderColor: hov ? "#1a6a3c" : "#e2ede8",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: hov ? "translateY(-5px)" : "translateY(0)",
                boxShadow: hov ? "0 20px 40px rgba(26,60,46,0.08)" : "0 4px 12px rgba(0,0,0,0.02)",
            }}
        >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: prop.color || "#1a3c2e" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "14px",
                        background: `${prop.color || "#1a3c2e"}15`,
                        color: prop.color || "#1a3c2e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        <Building2 size={24} />
                    </div>
                    <div className="min-w-0">
                        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "19px", margin: 0, color: "#1a2e22", fontWeight: 800 }} className="truncate">{prop.name}</h3>
                        <p style={{ fontSize: "12px", color: "#94a3a8", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }} className="truncate">
                            <MapPin size={12} /> {prop.address}
                        </p>
                    </div>
                </div>
                <div className="flex items-center ml-auto">
                    <button
                        onClick={(e) => { e.stopPropagation(); onInvite(prop); }}
                        disabled={inviting}
                        className="p-2 rounded-xl bg-[#f4fbf7] text-[#1a6a3c] hover:bg-[#1a3c2e] hover:text-white transition-all border border-[#ddf0e6] flex-shrink-0"
                        title="Generate Invite Link"
                    >
                        {inviting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    </button>
                    {prop.occupiedCount === 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onInvite(prop, true); }}
                            className="ml-2 p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all border border-red-100 flex-shrink-0"
                            title="Delete Property"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "20px", borderTop: "1.5px solid #f0f9f4" }}>
                <div>
                    <p style={{ fontSize: "10px", fontWeight: 800, color: "#94a3a8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Asset Status</p>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#1a2e22" }}>{prop.unitCount || 0} Units Total</span>
                </div>
                <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "10px", fontWeight: 800, color: "#94a3a8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Activity</p>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#1a6a3c" }}>{prop.occupiedCount || 0} Occupied</span>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[#1a6a3c] group">
                <span className="text-[11px] font-bold uppercase tracking-widest">Manage Portfolio</span>
                <ArrowRight size={14} className={`transition-transform ${hov ? 'translate-x-1' : ''}`} />
            </div>
        </motion.div>
    );
};

export default PropertyThumb;

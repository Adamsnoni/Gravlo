import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ============================================================
// GRAVLO — Landlord Empty State Dashboard
// First screen a new landlord sees after signup
// Goal: guide them to add their first property immediately
// Design: warm, encouraging, clear path forward
// ============================================================

const useBreakpoint = () => {
    const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
    useEffect(() => {
        const fn = () => setW(window.innerWidth);
        window.addEventListener("resize", fn);
        return () => window.removeEventListener("resize", fn);
    }, []);
    return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024, width: w };
};

const Icon = ({ d, size = 18, stroke = 2 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);
const IC = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    building: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    plus: "M12 5v14 M5 12h14",
    trending: "M23 6l-9.5 9.5-5-5L1 18",
    wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    menu: "M3 12h18 M3 6h18 M3 18h18",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
    dollar: "M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    arrow: "M5 12h14 M12 5l7 7-7 7",
    check: "M20 6L9 17l-5-5",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
    share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8 M16 6l-4-4-4 4 M12 2v13",
    lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4",
};

// ── Decoratives ───────────────────────────────────────────────
const CornerLeaf = ({ size = 64, opacity = 0.07, color = "#1a3c2e" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
        style={{ position: "absolute", top: 0, right: 0, pointerEvents: "none" }}>
        <path d="M64 0C64 0 42 6 36 22C32 34 40 46 40 46C40 46 56 34 64 18Z" fill={color} opacity={opacity} />
        <path d="M64 0C64 0 58 24 46 32C38 38 26 36 26 36C26 36 40 20 64 0Z" fill={color} opacity={opacity * 0.6} />
    </svg>
);

const FloatingLeaves = () => (
    <svg width="100%" height="100%" viewBox="0 0 400 500" fill="none"
        style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.12 }}>
        <path d="M350 20C350 20 300 60 290 110C283 145 300 175 300 175C300 175 340 140 350 90Z" fill="#7fffd4" />
        <path d="M380 80C380 80 340 100 330 140C324 165 338 190 338 190C338 190 368 162 380 130Z" fill="#52b788" />
        <path d="M320 150C320 150 280 165 272 200C267 222 278 244 278 244C278 244 308 222 320 190Z" fill="#7fffd4" opacity="0.7" />
        <path d="M30 200C30 200 70 230 80 275C86 305 72 330 72 330C72 330 38 305 30 260Z" fill="#52b788" opacity="0.6" />
        <path d="M10 300C10 300 48 318 55 358C60 382 48 404 48 404C48 404 16 384 10 350Z" fill="#7fffd4" opacity="0.5" />
        <path d="M360 380C360 380 320 390 310 425C304 447 315 468 315 468C315 468 348 450 360 418Z" fill="#52b788" opacity="0.5" />
    </svg>
);

// ── Avatar ────────────────────────────────────────────────────
const Av = ({ init, size = 36, bg = "#1a3c2e", fg = "#7fffd4" }) => (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color: fg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {init}
    </div>
);

// ── Sidebar ───────────────────────────────────────────────────
const Sidebar = ({ active, setActive, collapsed, setCollapsed, mobileOpen, setMobileOpen, bp, onAddProperty, user, profile, logout }) => {
    const nav = [
        { id: "dashboard", label: "Overview", icon: IC.grid },
        { id: "properties", label: "Properties", icon: IC.building },
        { id: "tenants", label: "Tenants", icon: IC.users },
        { id: "payments", label: "Payments", icon: IC.dollar },
        { id: "maintenance", label: "Maintenance", icon: IC.wrench },
        { id: "notifications", label: "Notifications", icon: IC.bell },
        { id: "settings", label: "Settings", icon: IC.settings },
    ];
    const col = bp.isDesktop ? collapsed : false;
    if (bp.isMobile && !mobileOpen) return null;

    return (
        <>
            {bp.isMobile && mobileOpen && (
                <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,35,24,0.5)", zIndex: 99, backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }} />
            )}
            <aside style={{
                width: col ? 72 : 240,
                background: "#fff", borderRight: "1px solid #e2ede8",
                display: "flex", flexDirection: "column",
                transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
                flexShrink: 0, overflow: "hidden",
                boxShadow: "3px 0 20px rgba(26,60,46,0.06)",
                ...(bp.isMobile
                    ? { position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, width: 260, minHeight: "100vh" }
                    : { position: "sticky", top: 0, height: "100vh" }),
            }}>
                {/* Logo */}
                <div style={{ padding: col ? "20px 16px" : "20px", borderBottom: "1px solid #e2ede8", display: "flex", alignItems: "center", justifyContent: col ? "center" : "space-between", background: "linear-gradient(135deg,#f0faf5,#fff)", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                        onClick={() => bp.isMobile ? setMobileOpen(false) : setCollapsed(!collapsed)}>
                        <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: "linear-gradient(135deg,#1a3c2e,#2d6a4f)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(26,60,46,0.3)" }}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95" />
                                <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.6" />
                            </svg>
                        </div>
                        {!col && <span style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 900, color: "#1a3c2e", letterSpacing: "-0.02em" }}>Gravlo</span>}
                    </div>
                    {!col && bp.isDesktop && (
                        <button onClick={() => setCollapsed(true)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4, borderRadius: 6 }}>
                            <Icon d={IC.menu} size={16} />
                        </button>
                    )}
                </div>

                {!col && <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", padding: "18px 20px 8px", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Main Menu</p>}

                <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
                    {nav.map(item => {
                        const isA = active === item.id;
                        const isLocked = item.id !== "dashboard" && item.id !== "settings";
                        return (
                            <button key={item.id}
                                onClick={() => { if (!isLocked) { setActive(item.id); if (bp.isMobile) setMobileOpen(false); } else onAddProperty(); }}
                                title={col ? item.label : ""}
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: col ? 0 : 12, justifyContent: col ? "center" : "flex-start", padding: col ? "12px" : "10px 12px", borderRadius: 12, border: "none", marginBottom: 2, background: isA ? "linear-gradient(135deg,#e8f5ee,#d4f0e2)" : "transparent", color: isA ? "#1a6a3c" : isLocked ? "#c4d6cc" : "#6b8a7a", cursor: "pointer", transition: "all 0.18s", position: "relative", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                                onMouseEnter={e => { if (!isA && !isLocked) { e.currentTarget.style.background = "#f4fbf7"; e.currentTarget.style.color = "#1a6a3c"; } }}
                                onMouseLeave={e => { if (!isA) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = isLocked ? "#c4d6cc" : "#6b8a7a"; } }}
                            >
                                {isA && <div style={{ position: "absolute", left: 0, top: "18%", bottom: "18%", width: 3, borderRadius: "0 3px 3px 0", background: "#1a6a3c" }} />}
                                <Icon d={item.icon} size={18} stroke={isA ? 2.5 : 1.8} />
                                {!col && (
                                    <span style={{ fontSize: 14, fontWeight: isA ? 700 : 500, flex: 1, textAlign: "left" }}>{item.label}</span>
                                )}
                                {!col && isLocked && (
                                    <div style={{ width: 16, height: 16, borderRadius: 4, background: "#f0f9f4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Icon d={IC.lock} size={9} stroke={2} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Add property CTA in sidebar */}
                {!col && (
                    <div style={{ margin: "0 10px 12px", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#1a3c2e,#2d6a4f)", cursor: "pointer", boxShadow: "0 4px 16px rgba(26,60,46,0.25)", transition: "opacity 0.2s" }}
                        onClick={onAddProperty}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                                <Icon d={IC.plus} size={14} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Add Property</span>
                        </div>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.4 }}>Start by adding your first property</p>
                    </div>
                )}

                {/* User */}
                <div style={{ padding: col ? "14px 10px" : "14px 16px", borderTop: "1px solid #e2ede8", display: "flex", alignItems: "center", gap: col ? 0 : 10, justifyContent: col ? "center" : "flex-start", background: "#fafdf9" }}>
                    <Av init={(profile?.fullName || user?.displayName || "U").split(" ").map(n => n[0]).join("").toUpperCase()} size={34} bg="#1a3c2e" fg="#7fffd4" />
                    {!col && (
                        <>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f2318", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.fullName || user?.displayName || "User"}</p>
                                <p style={{ fontSize: 11, color: "#1a6a3c", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>{profile?.role || 'Landlord'} Plan ✦</p>
                            </div>
                            <button onClick={logout} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 6, borderRadius: 8, transition: "color 0.2s" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#e74c3c"}
                                onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
                            ><Icon d={IC.logout} size={15} /></button>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
};

// ── Welcome Modal ─────────────────────────────────────────────
const WelcomeModal = ({ onClose, onAddProperty, userName }) => {
    const [step, setStep] = useState(0);
    const steps = [
        { icon: "🏢", title: "Add your properties", desc: "List every property and unit you manage. Each unit gets its own shareable invite link." },
        { icon: "👥", title: "Invite your tenants", desc: "Share a unit link via WhatsApp, SMS, or email. Tenants request to join and you approve." },
        { icon: "💰", title: "Collect rent online", desc: "Tenants pay directly through Gravlo. You get notified instantly and track everything in one place." },
    ];

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,35,24,0.65)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 0.3s ease" }}>
            <div style={{ background: "#fff", borderRadius: 28, width: "100%", maxWidth: 480, position: "relative", overflow: "hidden", boxShadow: "0 40px 100px rgba(15,35,24,0.3)", animation: "scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>

                {/* Green header */}
                <div style={{ background: "linear-gradient(135deg,#1a3c2e 0%,#2d6a4f 60%,#52b788 100%)", padding: "32px 32px 28px", position: "relative", overflow: "hidden" }}>
                    <FloatingLeaves />
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95" />
                                    <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.6" />
                                </svg>
                            </div>
                            <span style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Gravlo</span>
                        </div>
                        <h2 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: "0 0 8px", fontFamily: "'Fraunces',serif", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
                            Welcome, {userName}! 🎉
                        </h2>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.5 }}>
                            Your Gravlo account is ready. Here's how to get started in 3 steps.
                        </p>
                    </div>
                </div>

                {/* Steps */}
                <div style={{ padding: "28px 32px" }}>
                    {/* Step indicators */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
                        {steps.map((_, i) => (
                            <div key={i} onClick={() => setStep(i)} style={{ height: 4, flex: 1, borderRadius: 99, background: i <= step ? "#1a6a3c" : "#e2ede8", cursor: "pointer", transition: "background 0.3s" }} />
                        ))}
                    </div>

                    {/* Step content */}
                    <div key={step} style={{ animation: "slideUp 0.3s ease both", minHeight: 100 }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                            <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#e8f5ee,#d4f0e2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, border: "1.5px solid #cce8d8" }}>
                                {steps[step].icon}
                            </div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1a6a3c", background: "#e8f5ee", padding: "2px 9px", borderRadius: 99, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Step {step + 1} of {steps.length}</span>
                                </div>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f2318", margin: "0 0 6px", fontFamily: "'Fraunces',serif" }}>{steps[step].title}</h3>
                                <p style={{ fontSize: 14, color: "#6b8a7a", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.6 }}>{steps[step].desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
                        {step < steps.length - 1 ? (
                            <>
                                <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#94a3b8", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all 0.2s" }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = "#cce8d8"}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = "#e2ede8"}
                                >Skip intro</button>
                                <button onClick={() => setStep(step + 1)} style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg,#1a3c2e,#2d6a4f)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(26,60,46,0.25)", transition: "opacity 0.2s" }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                                >Next <Icon d={IC.arrow} size={15} /></button>
                            </>
                        ) : (
                            <button onClick={() => { onClose(); onAddProperty(); }} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#1a3c2e,#2d6a4f)", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 6px 20px rgba(26,60,46,0.3)", transition: "all 0.2s" }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(26,60,46,0.35)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,60,46,0.3)"; }}
                            >
                                <Icon d={IC.building} size={18} /> Add My First Property
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Empty Stat Card ───────────────────────────────────────────
const EmptyStatCard = ({ label, icon, accentBg, accentColor, borderColor, delay = 0 }) => (
    <div style={{ background: "#fff", border: `1.5px solid ${borderColor || "#e2ede8"}`, borderRadius: 20, padding: "22px 24px", position: "relative", overflow: "hidden", animation: `slideUp 0.5s ease ${delay}s both`, boxShadow: "0 1px 8px rgba(26,60,46,0.04)", opacity: 0.55 }}>
        <CornerLeaf size={48} opacity={0.04} color="#1a3c2e" />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "20px 20px 0 0", background: `linear-gradient(90deg, ${accentColor}40, transparent)` }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", color: accentColor }}>{icon}</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#c4d6cc", fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", paddingTop: 4 }}>{label}</span>
        </div>
        <div style={{ height: 28, width: "55%", background: "#f0f9f4", borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 12, width: "75%", background: "#f0f9f4", borderRadius: 6 }} />
    </div>
);

// ── Main Dashboard ────────────────────────────────────────────
export default function GravloLandlordEmptyState({ onAddProperty }) {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();
    const bp = useBreakpoint();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const active = "dashboard";
    const setActive = () => { };

    // Use localStorage to ensure welcome modal only shows once
    const [showWelcome, setShowWelcome] = useState(() => {
        return localStorage.getItem(`gravlo_welcome_shown_${user?.uid}`) !== 'true';
    });

    const [greeting, setGreeting] = useState("Good morning");

    useEffect(() => {
        const h = new Date().getHours();
        if (h >= 12 && h < 17) setGreeting("Good afternoon");
        else if (h >= 17) setGreeting("Good evening");
    }, []);

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        localStorage.setItem(`gravlo_welcome_shown_${user?.uid}`, 'true');
    };

    const handleAddProperty = () => {
        navigate('/properties?add=true&from=dashboard');
    };

    const userName = (profile?.fullName || user?.displayName || "User").split(" ")[0];
    const userInitials = (profile?.fullName || user?.displayName || "U").split(" ").map(n => n[0]).join("").toUpperCase();

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes slideUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn  { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
      `}</style>

            <div style={{ display: "flex", minHeight: "100vh", background: "#f4fbf7", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

                {/* Sidebar */}
                <Sidebar
                    active={active}
                    setActive={setActive}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    mobileOpen={mobileOpen}
                    setMobileOpen={setMobileOpen}
                    bp={bp}
                    onAddProperty={handleAddProperty}
                    user={user}
                    profile={profile}
                    logout={logout}
                />

                {/* Main */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>

                    {/* Topbar */}
                    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(244,251,247,0.95)", backdropFilter: "blur(14px)", borderBottom: "1px solid #ddeee5", padding: bp.isMobile ? "0 16px" : "0 32px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {bp.isMobile && (
                                <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", color: "#6b8a7a", cursor: "pointer", padding: 4, display: "flex" }}>
                                    <Icon d={IC.menu} size={22} />
                                </button>
                            )}
                            {bp.isDesktop && collapsed && (
                                <button onClick={() => setCollapsed(false)} style={{ background: "none", border: "none", color: "#6b8a7a", cursor: "pointer", padding: 4, display: "flex" }}>
                                    <Icon d={IC.menu} size={20} />
                                </button>
                            )}
                            <div>
                                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontWeight: 500, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{greeting},</p>
                                <p style={{ fontSize: bp.isMobile ? 15 : 17, fontWeight: 900, color: "#0f2318", margin: 0, letterSpacing: "-0.015em", lineHeight: 1.2, fontFamily: "'Fraunces',serif" }}>{userName} 👋</p>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {!bp.isMobile && (
                                <button onClick={handleAddProperty} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "linear-gradient(135deg,#1a3c2e,#2d6a4f)", border: "none", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 4px 16px rgba(26,60,46,0.28)", transition: "all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 7px 22px rgba(26,60,46,0.32)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(26,60,46,0.28)"; }}
                                >
                                    <Icon d={IC.plus} size={14} /> Add Property
                                </button>
                            )}
                            <Av init={userInitials} size={36} bg="#1a3c2e" fg="#7fffd4" />
                        </div>
                    </header>

                    {/* Content */}
                    <main style={{ flex: 1, padding: bp.isMobile ? "16px 16px 40px" : bp.isTablet ? "24px 24px 40px" : "28px 32px 48px", overflowY: "auto" }}>

                        {/* Empty stat cards — ghosted */}
                        <div style={{ display: "grid", gridTemplateColumns: bp.isMobile ? "repeat(2,1fr)" : bp.isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: bp.isMobile ? 12 : 16, marginBottom: bp.isMobile ? 20 : 28 }}>
                            <EmptyStatCard label="Monthly Revenue" icon={<Icon d={IC.trending} size={20} />} accentBg="#e8f5ee" accentColor="#1a6a3c" borderColor="#ddeee5" delay={0} />
                            <EmptyStatCard label="Total Units" icon={<Icon d={IC.building} size={20} />} accentBg="#fef9ed" accentColor="#c8691a" borderColor="#f5e8d5" delay={0.05} />
                            <EmptyStatCard label="Occupancy Rate" icon={<Icon d={IC.users} size={20} />} accentBg="#eff6ff" accentColor="#2563eb" borderColor="#dbeafe" delay={0.1} />
                            <EmptyStatCard label="Yearly Revenue" icon={<Icon d={IC.dollar} size={20} />} accentBg="#f5f0ff" accentColor="#7c3aed" borderColor="#e9d5ff" delay={0.15} />
                        </div>

                        {/* ── Hero Empty State ── */}
                        <div style={{ display: "grid", gridTemplateColumns: bp.isDesktop ? "1fr 380px" : "1fr", gap: bp.isMobile ? 16 : 24, marginBottom: bp.isMobile ? 16 : 24 }}>

                            {/* Main CTA card */}
                            <div style={{ background: "#fff", border: "1.5px solid #cce8d8", borderRadius: 24, overflow: "hidden", animation: "slideUp 0.5s ease 0.2s both", boxShadow: "0 4px 24px rgba(26,60,46,0.08)", position: "relative" }}>

                                {/* Green top section */}
                                <div style={{ background: "linear-gradient(135deg,#1a3c2e 0%,#2d6a4f 70%,#3a8a5f 100%)", padding: bp.isMobile ? "28px 24px" : "36px 40px", position: "relative", overflow: "hidden" }}>
                                    <FloatingLeaves />
                                    <div style={{ position: "relative", zIndex: 1 }}>
                                        <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.12)", padding: "4px 14px", borderRadius: 99, marginBottom: 16, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.15)" }}>
                                            Get Started
                                        </span>
                                        <h2 style={{ fontSize: bp.isMobile ? 24 : 32, fontWeight: 900, color: "#fff", margin: "0 0 12px", fontFamily: "'Fraunces',serif", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
                                            Add your first property<br />to unlock everything
                                        </h2>
                                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.6, maxWidth: 480 }}>
                                            Your dashboard is ready — it just needs a property to come alive. Add your first one now and start managing tenants, collecting rent, and tracking everything in one place.
                                        </p>
                                    </div>
                                </div>

                                {/* Bottom section */}
                                <div style={{ padding: bp.isMobile ? "24px" : "32px 40px" }}>

                                    {/* 3-step progress */}
                                    <div style={{ display: "grid", gridTemplateColumns: bp.isMobile ? "1fr" : "repeat(3,1fr)", gap: bp.isMobile ? 12 : 20, marginBottom: 32 }}>
                                        {[
                                            { step: 1, label: "Add a property", desc: "Name, address, property type", done: false, active: true },
                                            { step: 2, label: "Create units", desc: "Floors, unit names, rent amount", done: false, active: false },
                                            { step: 3, label: "Invite tenants", desc: "Share the unit link anywhere", done: false, active: false },
                                        ].map((s, i) => (
                                            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", animation: `slideUp 0.4s ease ${0.25 + i * 0.07}s both` }}>
                                                <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: s.active ? "#1a3c2e" : "#f0f9f4", border: `2px solid ${s.active ? "#1a3c2e" : "#cce8d8"}`, display: "flex", alignItems: "center", justifyContent: "center", color: s.active ? "#7fffd4" : "#94a3b8", fontSize: 13, fontWeight: 800, fontFamily: "'Fraunces',serif", transition: "all 0.3s" }}>
                                                    {s.done ? <Icon d={IC.check} size={16} stroke={2.5} /> : s.step}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 14, fontWeight: 700, color: s.active ? "#0f2318" : "#94a3b8", margin: "0 0 3px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.label}</p>
                                                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={handleAddProperty} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "16px", background: "linear-gradient(135deg,#1a3c2e,#2d6a4f)", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 6px 22px rgba(26,60,46,0.3)", transition: "all 0.2s" }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(26,60,46,0.35)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(26,60,46,0.3)"; }}
                                    >
                                        <Icon d={IC.building} size={20} />
                                        Add My First Property
                                        <Icon d={IC.arrow} size={18} />
                                    </button>

                                    <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: "14px 0 0", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                                        Takes less than 2 minutes · No payment details needed yet
                                    </p>
                                </div>
                            </div>

                            {/* Right: What you'll unlock */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                                {/* Unlock card */}
                                <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 20, padding: "24px", animation: "slideUp 0.5s ease 0.3s both", boxShadow: "0 1px 8px rgba(26,60,46,0.05)", position: "relative", overflow: "hidden" }}>
                                    <CornerLeaf size={56} opacity={0.065} color="#1a3c2e" />
                                    <p style={{ fontSize: 12, fontWeight: 800, color: "#0f2318", letterSpacing: "0.05em", textTransform: "uppercase", margin: "0 0 18px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>What you'll unlock</p>
                                    {[
                                        { icon: "💳", label: "Online rent collection", desc: "Tenants pay directly via Paystack" },
                                        { icon: "🔔", label: "Automatic reminders", desc: "Never chase rent manually again" },
                                        { icon: "📊", label: "Revenue dashboard", desc: "Track income across all properties" },
                                        { icon: "🔧", label: "Maintenance requests", desc: "Tenants log issues, you track them" },
                                        { icon: "🔗", label: "Shareable unit links", desc: "Share on WhatsApp and social media" },
                                    ].map((f, i) => (
                                        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < 4 ? "1px solid #f0f9f4" : "none" }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e8f5ee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f2318", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{f.label}</p>
                                                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{f.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Need help */}
                                <div style={{ background: "linear-gradient(135deg,#e8f5ee,#f4fbf7)", border: "1.5px solid #cce8d8", borderRadius: 20, padding: "20px 22px", animation: "slideUp 0.5s ease 0.35s both" }}>
                                    <p style={{ fontSize: 13, fontWeight: 800, color: "#1a3c2e", margin: "0 0 6px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Need help getting started?</p>
                                    <p style={{ fontSize: 12, color: "#6b8a7a", margin: "0 0 14px", fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.5 }}>Our team is available on WhatsApp to walk you through setup.</p>
                                    <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#fff", border: "1.5px solid #cce8d8", borderRadius: 10, color: "#1a6a3c", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all 0.2s" }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "#e8f5ee"; e.currentTarget.style.borderColor = "#52b788"; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#cce8d8"; }}
                                    >
                                        <Icon d={IC.mail} size={14} /> Chat with us
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Empty sections — ghosted */}
                        <div style={{ display: "grid", gridTemplateColumns: bp.isDesktop ? "1.2fr 1fr 280px" : bp.isTablet ? "1fr 1fr" : "1fr", gap: bp.isMobile ? 14 : 20 }}>
                            {[
                                { label: "Properties", desc: "Your properties will appear here", icon: "🏢" },
                                { label: "Urgent", desc: "Overdue rent alerts will show here", icon: "⚠️" },
                                { label: "Recent Activity", desc: "Payments and activity will show here", icon: "📋" },
                            ].map((s, i) => (
                                <div key={i} style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 20, padding: "24px", animation: `slideUp 0.5s ease ${0.4 + i * 0.06}s both`, boxShadow: "0 1px 8px rgba(26,60,46,0.04)", opacity: 0.6, ...(bp.isTablet && i === 2 ? { gridColumn: "1 / -1" } : {}) }}>
                                    <p style={{ fontSize: 12, fontWeight: 800, color: "#c4d6cc", letterSpacing: "0.05em", textTransform: "uppercase", margin: "0 0 20px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.label}</p>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 100, gap: 10 }}>
                                        <span style={{ fontSize: 32, opacity: 0.4 }}>{s.icon}</span>
                                        <p style={{ fontSize: 13, color: "#c4d6cc", fontFamily: "'Plus Jakarta Sans',sans-serif", textAlign: "center", margin: 0 }}>{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </main>
                </div>
            </div>

            {/* Welcome modal */}
            {showWelcome && (
                <WelcomeModal
                    userName={userName}
                    onClose={handleCloseWelcome}
                    onAddProperty={() => { handleCloseWelcome(); handleAddProperty(); }}
                />
            )}
        </>
    );
}

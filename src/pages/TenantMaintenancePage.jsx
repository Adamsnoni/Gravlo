// src/pages/TenantMaintenancePage.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wrench,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    Hash,
    MessageSquare,
    ArrowRight,
    X,
    Building2,
    Activity,
    Sparkles,
    Camera
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { subscribeTenantMaintenance, addMaintenance } from "../services/firebase";
import { subscribeTenantTenancies } from "../services/tenancy";
import Modal from "../components/Modal";
import toast from "react-hot-toast";

// ── Components ──────────────────────────────────────────────

function getSafeDate(d) {
    if (!d) return null;
    const date = d.toDate?.() || new Date(d);
    return isNaN(date.getTime()) ? null : date;
}


const CornerLeaf = ({ size = 64, opacity = 0.07, color = "#1a3c2e" }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ position: "absolute", top: 0, right: 0, pointerEvents: "none" }}>
        <path d="M64 0C64 0 42 6 36 22C32 34 40 46 40 46C40 46 56 34 64 18Z" fill={color} opacity={opacity} />
        <path d="M64 0C64 0 58 24 46 32C38 38 26 36 26 36C26 36 40 20 64 0Z" fill={color} opacity={opacity * 0.6} />
    </svg>
);

const StatCard = ({ label, value, sub, subColor, icon, accentBg, accentColor, borderColor, delay = 0 }) => {
    const [hov, setHov] = useState(false);
    return (
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
            background: "#fff", border: `1.5px solid ${hov ? accentColor + "55" : borderColor || "#e2ede8"}`,
            borderRadius: 20, padding: "22px 24px", position: "relative", overflow: "hidden",
            animation: `slideUp 0.5s ease ${delay}s both`,
            boxShadow: hov ? `0 12px 32px ${accentColor}18` : "0 1px 8px rgba(26,60,46,0.06)",
            transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
            transform: hov ? "translateY(-3px)" : "translateY(0)", cursor: "default",
        }}>
            <CornerLeaf size={56} opacity={0.055} color="#1a3c2e" />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "20px 20px 0 0", background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40)` }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", color: accentColor }}>{icon}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", paddingTop: 4 }}>{label}</span>
            </div>
            <p style={{ fontSize: 32, fontWeight: 900, color: "#0f2318", margin: "0 0 6px", fontFamily: "'Fraunces',serif", lineHeight: 1, letterSpacing: "-0.025em" }}>{value}</p>
            {sub && <p style={{ fontSize: 12, color: subColor || "#94a3b8", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500 }}>{sub}</p>}
        </div>
    );
};

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35, ease: "easeOut" },
});

export default function TenantMaintenancePage() {
    const { user, profile } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [tenancies, setTenancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState("all");

    const [form, setForm] = useState({
        tenancyId: "",
        title: "",
        description: "",
        priority: "medium",
    });

    useEffect(() => {
        if (!user?.uid) return;

        // Safety timeout to ensure loading is cleared
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 7000);

        const unsubTickets = subscribeTenantMaintenance(user.uid, (data) => {
            setTickets(data);
            setLoading(false);
        }, (err) => {
            console.error("Maintenance subscription failed:", err);
            setLoading(false);
        });

        const unsubTenancies = subscribeTenantTenancies(user.uid, (data) => {
            const active = data.filter(t => t.status === 'active');
            setTenancies(active);
            setLoading(false);
        }, (err) => {
            console.error("Tenancies subscription failed:", err);
            setLoading(false);
        });

        return () => {
            unsubTickets?.();
            unsubTenancies?.();
            clearTimeout(safetyTimer);
        };
    }, [user?.uid]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.tenancyId || !form.title) {
            toast.error("Please select a residence and provide a title.");
            return;
        }
        setSaving(true);
        try {
            const ten = tenancies.find(t => t.id === form.tenancyId);
            await addMaintenance(ten.landlordId, ten.propertyId, {
                title: form.title,
                description: form.description,
                priority: form.priority,
                tenantId: user.uid,
                tenantName: profile?.fullName || user.displayName || "Tenant",
                unitId: ten.unitId,
                unitName: ten.unitName,
                propertyName: ten.propertyName,
                status: "open"
            });
            toast.success("Request submitted to landlord.");
            setShowModal(false);
            setForm({ tenancyId: "", title: "", description: "", priority: "medium" });
        } catch (err) {
            toast.error("Failed to submit request.");
        } finally {
            setSaving(false);
        }
    };

    const openTickets = tickets.filter(t => t.status === 'open');
    const filteredTickets = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f4fbf7" }}>
                <div style={{ width: 30, height: 30, border: "3px solid rgba(74,124,89,0.12)", borderTopColor: "#4A7C59", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
      `}</style>

            {/* Page Header */}
            <div style={{ marginBottom: 32, animation: "slideUp 0.5s ease both" }} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, margin: 0 }}>Maintenance Portal,</p>
                    <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f2318", fontFamily: "'Fraunces',serif", margin: 0, letterSpacing: "-0.015em" }}>Issues & Requests 🛠️</h1>
                </div>
                <button
                    onClick={() => {
                        if (tenancies.length === 0) {
                            toast.error("No active residences found.");
                            return;
                        }
                        setForm(f => ({ ...f, tenancyId: tenancies[0]?.id }));
                        setShowModal(true);
                    }}
                    className="btn-primary"
                    style={{ padding: "12px 24px", borderRadius: 14, fontSize: 13, fontWeight: 800 }}
                >
                    <Plus size={18} strokeWidth={3} className="mr-2 inline" /> Log New Issue
                </button>
            </div>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
                <StatCard
                    label="Pending Repairs" value={openTickets.length}
                    sub="Items awaiting resolution"
                    icon={<Wrench size={20} />} accentBg="#f5f0ff" accentColor="#7c3aed" borderColor="#ddd6fe" delay={0}
                />
                <StatCard
                    label="Resolved items" value={tickets.filter(t => t.status === 'closed').length}
                    sub="Historical maintenance success"
                    icon={<CheckCircle2 size={20} />} accentBg="#e8f5ee" accentColor="#1a6a3c" borderColor="#cce8d8" delay={0.05}
                />
                <StatCard
                    label="Response SLA" value="24h"
                    sub="Avg. acknowledgment time"
                    icon={<Clock size={20} />} accentBg="#fef9ed" accentColor="#c8691a" borderColor="#f5e0b8" delay={0.1}
                />
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-[#e2ede8] shadow-sm overflow-x-auto no-scrollbar max-w-fit mb-8">
                {[
                    { key: "all", label: "All Tickets", count: tickets.length },
                    { key: "open", label: "Open Requests", count: openTickets.length },
                    { key: "closed", label: "Archived", count: tickets.filter(t => t.status === 'closed').length },
                ].map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === key ? "bg-[#1a3c2e] text-white shadow-md" : "text-[#94a3b8] hover:text-[#1a6a3c]"}`}
                    >
                        {label}
                        {count > 0 && <span style={{ marginLeft: 6, opacity: 0.6 }}>{count}</span>}
                    </button>
                ))}
            </div>

            {/* Tickets List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {filteredTickets.length === 0 ? (
                        <div style={{ background: "#fff", border: "2px dashed #e2ede8", borderRadius: 24, padding: 64, textAlign: "center", animation: "slideUp 0.5s ease both" }}>
                            <div className="w-16 h-16 rounded-full bg-[#f4fbf7] flex items-center justify-center text-[#cce8d8] mx-auto mb-6">
                                <Activity size={32} />
                            </div>
                            <h3 style={{ fontFamily: "'Fraunces',serif" }} className="text-xl font-bold text-[#1a2e22] mb-2 italic">Clean Slate</h3>
                            <p className="text-[#6b8a7a] font-medium max-w-sm mx-auto">No maintenance issues found for your active residencies. Log a request if anything needs attention.</p>
                        </div>
                    ) : (
                        filteredTickets.map((t, i) => (
                            <motion.div
                                key={t.id}
                                {...fadeUp(0.1 + i * 0.05)}
                                style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 24, padding: 24, position: "relative", overflow: "hidden" }}
                                className="group hover:border-[#1a6a3c]/30 hover:shadow-xl transition-all"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="flex items-start gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${t.priority === 'high' ? 'bg-[#fff5f5] text-[#e74c3c]' : 'bg-[#f4fbf7] text-[#1a6a3c]'}`}>
                                            <Wrench size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-bold text-[#1a2e22] text-lg leading-tight group-hover:text-[#1a6a3c] transition-colors">{t.title}</h4>
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.status === 'open' ? 'bg-[#e8f5ee] text-[#1a6a3c]' : 'bg-gray-100 text-gray-500'}`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[#6b8a7a] mb-2 line-clamp-2">{t.description || "No description provided."}</p>
                                            <div className="flex items-center gap-4 text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">
                                                <span className="flex items-center gap-1"><Hash size={12} /> {t.unitName}</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {(() => {
                                                        const d = getSafeDate(t.createdAt);
                                                        return d ? format(d, 'MMM d, yyyy') : 'No date';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 border-t sm:border-t-0 sm:border-l border-[#f0f7f2] pt-4 sm:pt-0 sm:pl-8">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${t.priority === 'high' ? 'bg-[#e74c3c] text-white' : 'bg-[#fef9ed] text-[#c8691a]'}`}>
                                            {t.priority} Priority
                                        </span>
                                        <button className="text-[#1a6a3c] hover:underline font-bold text-xs flex items-center gap-2">
                                            Details <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Right: Info & Contact */}
                <div className="space-y-6">
                    <div style={{ background: "#fcfdfc", border: "1.5px solid #e2ede8", borderRadius: 24, padding: 32 }}>
                        <h3 style={{ fontFamily: "'Fraunces',serif", color: "#1a2e22", fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Emergency Protocol</h3>
                        <p className="text-xs text-[#6b8a7a] font-medium leading-relaxed mb-6">
                            For structural emergencies (fire, flooding, gas leaks), please contact emergency services immediately before logging a portal request.
                        </p>
                        <div className="p-5 rounded-2xl bg-[#fff5f5] border border-[#fecaca] flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#e74c3c] shadow-sm">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[#e74c3c] uppercase tracking-widest mb-0.5">Emergency Contact</p>
                                <p className="text-sm font-black text-[#1a2e22]">0800-GRAVLO-HELP</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 24, padding: 24 }}>
                        <h3 style={{ fontFamily: "'Fraunces',serif", color: "#1a2e22", fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Maintenance FAQ</h3>
                        <div className="space-y-4">
                            {[
                                "How do I track my request status?",
                                "Can I upload media to the ticket?",
                                "What defines a high priority issue?"
                            ].map((q, j) => (
                                <div key={j} className="flex items-center gap-3 text-xs font-bold text-[#6b8a7a] hover:text-[#1a2e22] transition-colors cursor-pointer group">
                                    <MessageSquare size={14} className="text-[#cce8d8] group-hover:text-[#1a6a3c]" />
                                    {q}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Log Issue Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log Maintenance Issue">
                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                    <div>
                        <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Governing Residence *</label>
                        <select className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1a2e22]" value={form.tenancyId} onChange={(e) => setForm(f => ({ ...f, tenancyId: e.target.value }))} required>
                            {tenancies.map(p => (
                                <option key={p.id} value={p.id}>{p.propertyName} {p.unitName ? `· ${p.unitName}` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Issue Title *</label>
                        <input className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1a2e22]" placeholder="Brief summary (e.g. Kitchen Leak)" type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Priority Scope</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['low', 'medium', 'high'].map(p => (
                                <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.priority === p ? 'bg-[#1a3c2e] text-white border-transparent' : 'bg-white text-[#6b8a7a] border-[#e2ede8]'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Detailed Description</label>
                        <textarea className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3.5 text-sm font-medium text-[#1a2e22]" rows={4} placeholder="Provide specific details to assist our resolution team..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button disabled={saving} type="submit" className="flex-1 btn-primary py-4 rounded-xl text-sm font-bold">
                            {saving ? 'Processing...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

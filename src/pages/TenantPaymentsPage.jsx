// src/pages/TenantPaymentsPage.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  ArrowRight,
  Hash,
  Activity,
  ShieldCheck,
  Zap,
  ChevronRight,
  Sparkles,
  Download,
  Calendar,
  Building2,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { subscribeTenantPayments } from "../services/firebase";
import { subscribeTenantTenancies } from "../services/tenancy";
import { createCheckoutSession } from "../services/payments";
import { generateInvoicePdf } from "../utils/invoicePdf";
import toast from "react-hot-toast";

// ── Components ──────────────────────────────────────────────

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

export default function TenantPaymentsPage() {
  const { user, profile } = useAuth();
  const { fmt, country } = useLocale();

  const [payments, setPayments] = useState([]);
  const [tenancies, setTenancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTenancyId, setSelectedTenancyId] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    const u1 = subscribeTenantPayments(user.uid, (d) => {
      setPayments(d);
      setLoading(false);
    });

    const u2 = subscribeTenantTenancies(user.uid, (data) => {
      const active = data.filter((t) => t.status === "active");
      setTenancies(active);
      if (active.length > 0 && !selectedTenancyId) {
        setSelectedTenancyId(active[0].id);
      }
    });

    return () => {
      u1?.();
      u2?.();
    };
  }, [user?.uid]);

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const lastPayment = payments.find((p) => p.status === "paid");

  const handleCreatePayment = async () => {
    if (!selectedTenancyId) {
      toast.error("Select a residence to continue.");
      return;
    }
    const tenancy = tenancies.find((t) => t.id === selectedTenancyId);
    if (!tenancy) return;

    const amount = tenancy.rentAmount || 0;
    if (!amount) {
      toast.error("This residence has no rent valuation configured.");
      return;
    }

    setCreating(true);
    try {
      const res = await createCheckoutSession({
        gateway: "paystack",
        landlordId: tenancy.landlordId,
        propertyId: tenancy.propertyId,
        propertyName: tenancy.propertyName,
        propertyAddress: tenancy.address || "",
        propertyBuildingName: "",
        propertyUnitNumber: tenancy.unitName || "",
        propertyFloor: "",
        tenantEmail: user.email,
        tenantName: profile?.fullName || user.displayName || "",
        amount,
        currency: tenancy.currency || "NGN",
      });

      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      toast.error(err.message || "Unable to initiate secure checkout.");
    } finally {
      setCreating(false);
    }
  };

  const hasActiveHomes = tenancies.length > 0;
  const symbol = country?.symbol || "₦";

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
      <div style={{ marginBottom: 32, animation: "slideUp 0.5s ease both" }}>
        <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, margin: 0 }}>Financial Ledger,</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f2318", fontFamily: "'Fraunces',serif", margin: 0, letterSpacing: "-0.015em" }}>Payments & Receipts 🧾</h1>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
        <StatCard
          label="Total Settled" value={fmt(totalPaid, symbol)}
          sub="Verified platform remittances"
          icon={<Sparkles size={20} strokeWidth={2.5} />} accentBg="#e8f5ee" accentColor="#1a6a3c" borderColor="#cce8d8" delay={0}
        />
        <StatCard
          label="Last Payment" value={lastPayment ? fmt(lastPayment.amount, symbol) : "—"}
          sub={lastPayment ? format(lastPayment.createdAt?.toDate?.() || new Date(lastPayment.createdAt), "MMM d, yyyy") : "No history found"}
          icon={<Clock size={20} />} accentBg="#eff6ff" accentColor="#2563eb" borderColor="#bfdbfe" delay={0.05}
        />
        <StatCard
          label="Pending Invoices" value={pendingCount}
          sub="Items requiring attention"
          icon={<Activity size={20} />} accentBg="#f5f0ff" accentColor="#7c3aed" borderColor="#ddd6fe" delay={0.1}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: History Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 24, padding: 32, boxShadow: "0 2px 14px rgba(26,60,46,0.05)", animation: "slideUp 0.5s ease 0.2s both" }}>
            <h3 style={{ fontFamily: "'Fraunces',serif", color: "#1a2e22", fontSize: 20, fontWeight: 800, margin: "0 0 24px" }} className="flex items-center gap-2">
              <Activity className="text-[#1a6a3c]" size={20} />
              Transaction History
            </h3>

            {payments.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#f4fbf7] flex items-center justify-center text-[#cce8d8] mx-auto mb-4">
                  <CreditCard size={32} />
                </div>
                <p className="text-[#6b8a7a] font-medium italic">Your financial timeline is empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((p, i) => {
                  const date = p.createdAt?.toDate?.() || new Date(p.createdAt);
                  return (
                    <motion.div
                      key={p.id}
                      {...fadeUp(0.25 + i * 0.05)}
                      style={{ background: "#fcfdfc", border: "1px solid #f0f7f2", borderRadius: 20 }}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${p.status === 'paid' ? 'bg-[#e8f5ee] text-[#1a6a3c] border-[#cce8d8]' : 'bg-[#fff5f5] text-[#e74c3c] border-[#fecaca]'}`}>
                          <Download size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-[#1a2e22] leading-tight mb-1">{p.propertyName || 'Property Rental'}</p>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[#94a3a8] text-[10px] font-bold uppercase tracking-widest">
                              <Calendar size={10} /> {format(date, 'MMM d, yyyy')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${p.status === 'paid' ? 'bg-[#e8f5ee] text-[#1a6a3c]' : 'bg-[#fff5f5] text-[#e74c3c]'}`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:border-l border-[#f0f7f2] sm:pl-8">
                        <div className="text-right">
                          <p style={{ fontFamily: "'Fraunces',serif" }} className="text-xl font-black text-[#1a2e22] mb-0.5">
                            {fmt(p.amount || 0, p.currency || symbol)}
                          </p>
                          <p className="text-[#94a3a8] text-[9px] font-extrabold uppercase tracking-widest">Settled Amount</p>
                        </div>
                        {p.status === 'paid' && (
                          <button
                            onClick={() => generateInvoicePdf(p)}
                            className="p-3 rounded-xl bg-[#f4fbf7] text-[#1a6a3c] hover:bg-[#1a3c2e] hover:text-white transition-all border border-[#ddf0e6]"
                            title="Download Receipt"
                          >
                            <Download size={16} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Pay */}
        <div className="space-y-6">
          <div style={{ background: "#1a3c2e", border: "1.5px solid #1a3c2e", borderRadius: 24, padding: 32, color: "#fff", position: "relative", overflow: "hidden", animation: "slideUp 0.5s ease 0.3s both" }}>
            <CornerLeaf size={120} opacity={0.08} color="#fff" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 mb-6">
                <Zap size={24} className="text-[#52b788]" strokeWidth={2.5} />
              </div>
              <h3 style={{ fontFamily: "'Fraunces',serif" }} className="text-2xl font-black mb-3 italic">Instant Rent Settlement</h3>
              <p className="text-white/60 text-sm font-medium mb-8 leading-relaxed">
                Choose your residence to process your monthly remittance through our secure verified gateways.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3 block">Managed Homes</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <select
                      className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-4 text-white font-bold text-sm focus:ring-4 focus:ring-white/5 focus:border-white/40 transition-all appearance-none cursor-pointer"
                      value={selectedTenancyId}
                      onChange={e => setSelectedTenancyId(e.target.value)}
                      disabled={!hasActiveHomes}
                    >
                      <option value="" className="text-black">
                        {hasActiveHomes ? 'Select Active Home' : 'No Residencies Found'}
                      </option>
                      {tenancies.map(t => (
                        <option key={t.id} value={t.id} className="text-black">
                          {t.propertyName} ({fmt(t.rentAmount || 0, symbol)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreatePayment}
                  disabled={!hasActiveHomes || creating}
                  className="w-full bg-white text-[#1a3c2e] font-black text-sm uppercase tracking-[0.15em] py-5 rounded-2xl hover:bg-[#f4fbf7] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-3 group mt-4"
                >
                  {creating ? (
                    <div className="w-6 h-6 border-3 border-[#1a3c2e] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Process Payment
                      <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-3">
                <ShieldCheck size={18} className="text-[#52b788]" />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest italic">Encrypted Secure Portal</span>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 24, padding: 24 }}>
            <h3 style={{ fontFamily: "'Fraunces',serif", color: "#1a2e22", fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Security Info</h3>
            <p className="text-xs text-[#6b8a7a] font-medium leading-relaxed mb-4">
              All payments are processed through verified third-party providers. We do not store your sensitive financial credentials.
            </p>
            <div className="p-4 rounded-xl bg-[#f4fbf7] border border-[#ddf0e6] flex items-center gap-3">
              <ShieldCheck size={18} className="text-[#1a6a3c]" />
              <span className="text-[10px] font-black text-[#1a6a3c] uppercase tracking-widest">PCI-DSS Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

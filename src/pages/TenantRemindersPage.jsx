// src/pages/TenantRemindersPage.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Hash,
  Calendar,
  ArrowRight,
  X,
  AlertTriangle,
  Zap,
  Activity,
  Sparkles
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import {
  subscribeReminders,
  addReminder,
  updateReminder,
  deleteReminder,
} from "../services/firebase";
import { subscribeTenantTenancies } from "../services/tenancy";
import {
  LEAD_TIME_OPTIONS,
  getReminderNotifyDate,
} from "../utils/reminderLeadTimes";
import Modal from "../components/Modal";
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

const URGENCY = {
  overdue: { label: "Settlement Overdue", color: "text-[#e74c3c]", bg: "bg-[#fff5f5]", border: "border-[#fee2e2]", icon: AlertTriangle },
  urgent: { label: "High Priority", color: "text-[#e74c3c]", bg: "bg-[#fff5f5]", border: "border-[#fee2e2]", icon: Clock },
  soon: { label: "Upcoming Date", color: "text-[#c8691a]", bg: "bg-[#fef9ed]", border: "border-[#f5e0b8]", icon: Bell },
  ok: { label: "Routine Reminder", color: "text-[#1a6a3c]", bg: "bg-[#f4fbf7]", border: "border-[#ddf0e6]", icon: CheckCircle },
  paid: { label: "Settled Record", color: "text-[#94a3a8]", bg: "bg-[#fcfdfc]", border: "border-[#f0f7f2]", icon: CheckCircle },
};

function getUrgency(r) {
  if (r.status === "paid") return "paid";
  const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
  if (isPast(d)) return "overdue";
  const days = differenceInDays(d, new Date());
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "ok";
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: "easeOut" },
});

const emptyForm = {
  propertyId: "",
  dueDate: "",
  amount: "",
  leadTimeDays: 7,
  recurring: false,
  notifyEmail: true,
  notifySms: false,
  notifyInApp: true,
  notes: "",
};

export default function TenantRemindersPage() {
  const { user, profile } = useAuth();
  const { fmt, country } = useLocale();

  const [reminders, setReminders] = useState([]);
  const [tenancies, setTenancies] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeReminders(user.uid, (d) => {
      setReminders(d.filter((r) => r.createdBy === "tenant"));
      setLoading(false);
    });

    const u2 = subscribeTenantTenancies(user.uid, (data) => {
      setTenancies(data.filter((t) => t.status === "active"));
    });

    return () => {
      u1?.();
      u2?.();
    };
  }, [user?.uid]);

  const handlePropertySelect = (e) => {
    const pid = e.target.value;
    const p = tenancies.find((x) => x.id === pid);
    setForm((f) => ({
      ...f,
      propertyId: pid,
      propertyName: p?.propertyName ?? "",
      propertyUnitNumber: p?.unitName ?? "",
      amount: p?.rentAmount != null ? String(p.rentAmount) : f.amount,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.propertyId || !form.amount || !form.dueDate) {
      toast.error("Required fields: Residence, Valuation, and Maturity Date.");
      return;
    }
    setSaving(true);
    try {
      const prop = tenancies.find((p) => p.id === form.propertyId);
      const payload = {
        propertyId: form.propertyId,
        propertyName: form.propertyName || prop?.propertyName,
        propertyUnitNumber: form.propertyUnitNumber || prop?.unitName || "",
        amount: parseFloat(form.amount) || 0,
        dueDate: new Date(form.dueDate),
        leadTimeDays: parseInt(form.leadTimeDays, 10) || 7,
        recurring: !!form.recurring,
        notifyEmail: !!form.notifyEmail,
        notifySms: !!form.notifySms,
        notifyInApp: !!form.notifyInApp,
        notes: (form.notes || "").trim(),
        createdBy: "tenant",
        tenantName: profile?.fullName || user?.displayName || "",
        tenantEmail: user?.email || "",
      };
      if (editingId) {
        await updateReminder(user.uid, editingId, payload);
        toast.success("Sequence updated.");
      } else {
        await addReminder(user.uid, payload);
        toast.success("Protocol established. Notifications assigned.");
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch {
      toast.error("Failed to commit protocol.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (r) => {
    await updateReminder(user.uid, r.id, { status: "paid", paidAt: new Date() });
    toast.success("Settlement verified.");
  };

  const handleDelete = async (r) => {
    if (!confirm(`Archive alert for ${r.propertyName}?`)) return;
    await deleteReminder(user.uid, r.id);
    toast.success("Alert archived.");
  };

  const filtered = filter === "all" ? reminders : reminders.filter((r) => getUrgency(r) === filter);
  const counts = { overdue: 0, urgent: 0, soon: 0, ok: 0, paid: 0 };
  reminders.forEach((r) => {
    const k = getUrgency(r);
    counts[k]++;
  });

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
      <div style={{ marginBottom: 32, animation: "slideUp 0.5s ease both" }} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, margin: 0 }}>Internal Vigilance,</p>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f2318", fontFamily: "'Fraunces',serif", margin: 0, letterSpacing: "-0.015em" }}>Rent Reminders 🔔</h1>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({
              ...emptyForm,
              dueDate: format(new Date(), "yyyy-MM-dd"),
              propertyId: tenancies[0]?.id ?? "",
            });
            setShowModal(true);
          }}
          disabled={tenancies.length === 0}
          className="btn-primary"
          style={{ padding: "12px 24px", borderRadius: 14, fontSize: 13, fontWeight: 800 }}
        >
          <Plus size={18} strokeWidth={3} className="mr-2 inline" /> Establish New Protocol
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        <StatCard
          label="Active Alerts" value={reminders.filter(r => r.status !== 'paid').length}
          sub="Scheduled for maturity"
          icon={<Bell size={20} />} accentBg="#f5f0ff" accentColor="#7c3aed" borderColor="#ddd6fe" delay={0}
        />
        <StatCard
          label="Critical Priority" value={counts.overdue + counts.urgent}
          sub="Require immediate settlement"
          icon={<AlertTriangle size={20} />} accentBg="#fff5f5" accentColor="#e74c3c" borderColor="#fecaca" delay={0.05}
        />
        <StatCard
          label="Managed residencies" value={tenancies.length}
          sub="Verified homes on portal"
          icon={<Zap size={20} />} accentBg="#f4fbf7" accentColor="#1a6a3c" borderColor="#cce8d8" delay={0.1}
        />
        <StatCard
          label="Settled" value={counts.paid}
          sub="Archived protocols"
          icon={<CheckCircle size={20} />} accentBg="#fcfdfc" accentColor="#94a3a8" borderColor="#f0f7f2" delay={0.15}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-[#e2ede8] shadow-sm overflow-x-auto no-scrollbar max-w-fit mb-8">
        {[
          { key: "all", label: "Entire Watchlist", count: reminders.length },
          { key: "overdue", label: "Overdue", count: counts.overdue },
          { key: "urgent", label: "High Priority", count: counts.urgent },
          { key: "soon", label: "Upcoming", count: counts.soon },
          { key: "ok", label: "Routine", count: counts.ok },
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

      {/* Reminders Grid */}
      {filtered.length === 0 ? (
        <div style={{ background: "#fff", border: "2px dashed #e2ede8", borderRadius: 24, padding: 64, textAlign: "center", animation: "slideUp 0.5s ease both" }}>
          <div className="w-16 h-16 rounded-full bg-[#f4fbf7] flex items-center justify-center text-[#cce8d8] mx-auto mb-6">
            <Bell size={32} />
          </div>
          <h3 style={{ fontFamily: "'Fraunces',serif" }} className="text-xl font-bold text-[#1a2e22] mb-2 italic">Watchlist Empty</h3>
          <p className="text-[#6b8a7a] font-medium max-w-sm mx-auto">No protocols found matching this scope. Establish a new one to begin monitoring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((r, i) => {
              const urg = getUrgency(r);
              const U = URGENCY[urg];
              const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
              const days = differenceInDays(d, new Date());
              const isPaid = urg === "paid";

              return (
                <motion.div
                  key={r.id}
                  {...fadeUp(0.1 + i * 0.05)}
                  layout
                  style={{ background: "#fff", border: `1.5px solid ${isPaid ? '#f0f7f2' : '#e2ede8'}`, borderRadius: 24, padding: 24, position: "relative", overflow: "hidden" }}
                  className="group hover:border-[#1a6a3c]/30 hover:shadow-xl transition-all"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 opacity-[0.02] transform translate-x-6 translate-y-[-6px] group-hover:scale-110 transition-transform duration-700 text-[#1a6a3c]`}>
                    <U.icon size={100} />
                  </div>

                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${U.bg} ${U.color} border ${U.border}`}>
                        <U.icon size={22} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1a2e22] leading-tight group-hover:text-[#1a6a3c] transition-colors">{r.propertyName || 'Remittance'}</h4>
                        <span className="text-[9px] font-black text-[#94a3b8] uppercase tracking-widest">{r.propertyUnitNumber || 'Main Unit'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-[#fcfdfc] border border-[#f0f7f2]">
                      <p className="text-[8px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Maturity</p>
                      <p className={`font-bold text-xs ${isPast(d) && !isPaid ? 'text-[#e74c3c]' : 'text-[#1a2e22]'}`}>{format(d, 'MMM d, yyyy')}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#fcfdfc] border border-[#f0f7f2]">
                      <p className="text-[8px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Valuation</p>
                      <p className="font-fraunces font-black text-[#1a2e22] text-sm leading-none">{fmt(r.amount || 0, symbol)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-[#f0f7f2]">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {r.notifyEmail && <div className="w-7 h-7 rounded-lg bg-[#f4fbf7] flex items-center justify-center text-[#1a6a3c] border border-white shadow-xs" title="Email"><Mail size={12} /></div>}
                        {r.notifyInApp && <div className="w-7 h-7 rounded-lg bg-[#e8f5ee] flex items-center justify-center text-[#1a6a3c] border border-white shadow-xs" title="In-App"><Smartphone size={12} /></div>}
                      </div>
                      {r.recurring && (
                        <span className="text-[8px] font-black text-[#1a6a3c] uppercase tracking-widest bg-[#e8f5ee] px-2 py-0.5 rounded-lg">Auto</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isPaid && (
                        <button onClick={() => handleMarkPaid(r)} className="p-2.5 rounded-xl bg-[#e8f5ee] text-[#1a6a3c] hover:bg-[#1a3c2e] hover:text-white transition-all shadow-sm">
                          <CheckCircle size={16} strokeWidth={2.5} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(r)} className="p-2.5 rounded-xl bg-white border border-[#f0f7f2] text-[#94a3b8] hover:bg-[#e74c3c] hover:text-white transition-all shadow-sm">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Protocol Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Modify Sequence' : 'Establish Protocol'}>
        <form onSubmit={handleSave} className="space-y-6 pt-2">
          <div>
            <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Target Residence *</label>
            <select className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1a2e22]" value={form.propertyId} onChange={handlePropertySelect} required>
              <option value="">— Select Domain —</option>
              {tenancies.map(p => (
                <option key={p.id} value={p.id}>{p.propertyName} {p.unitName ? `· ${p.unitName}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Maturity Date *</label>
              <input className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3 text-sm font-bold text-[#1a2e22]" type="date" value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} required />
            </div>
            <div>
              <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Rent Value ({symbol}) *</label>
              <input className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3 text-sm font-black text-[#1a2e22]" type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f4fbf7]/50 border border-[#ddf0e6]">
              <input type="checkbox" id="m-rec" checked={form.recurring} onChange={(e) => setForm(f => ({ ...f, recurring: e.target.checked }))} className="w-4 h-4 accent-[#1a6a3c]" />
              <label htmlFor="m-rec" className="text-xs font-bold text-[#1a6a3c]">Replicate monthly (Recurring Protocol)</label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button disabled={saving} type="submit" className="flex-1 btn-primary py-4 rounded-xl text-sm leading-none font-bold">
              {saving ? '...' : editingId ? 'Update Sequence' : 'Commit Protocol'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

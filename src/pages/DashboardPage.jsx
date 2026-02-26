// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, isPast, differenceInDays } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import {
  subscribeProperties,
  subscribeReminders,
  subscribePendingUnits,
  subscribeNotifications,
  callApproveTenantRequest
} from "../services/firebase";
import { subscribeTenancies } from "../services/tenancy";
import { toast } from "react-hot-toast";
import { CornerLeaf, Avatar } from "../components/Shared/Branding";
import { StatCard } from "../components/Dashboard/StatCard";
import { RevenueChart } from "../components/Dashboard/RevenueChart";
import { JoinCard } from "../components/Dashboard/JoinCard";

// ── Utilities ────────────────────────────────────────────────
const safeToDate = (d) => {
  if (!d) return null;
  if (typeof d.toDate === "function") return d.toDate();
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
};

const fmt = (n, sym = "₦") => `${sym}${Number(n).toLocaleString()}`;
const fmtShort = (n, sym = "₦") => {
  if (n >= 1000000) return `${sym}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}K`;
  return `${sym}${n}`;
};

// ── Icons ────────────────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  plus: "M12 5v14 M5 12h14",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18 M6 6l12 12",
  trending: "M23 6l-9.5 9.5-5-5L1 18",
  building: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  arrowUp: "M12 19V5 M5 12l7-7 7 7",
};

// ── Main Dashboard ───────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { country } = useLocale();
  const navigate = useNavigate();
  const role = profile?.role || 'landlord';

  const [properties, setProperties] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [pendingUnits, setPendingUnits] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [approvingSaving, setApprovingSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 12 && h < 17) setGreeting("Good afternoon");
    else if (h >= 17) setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeProperties(user.uid, (data) => {
      setProperties(data);
      setDataLoading(false);
    });
    const u2 = subscribeReminders(user.uid, setReminders);
    const u3 = subscribePendingUnits(user.uid, setPendingUnits);
    const u4 = subscribeNotifications(user.uid, setNotifications);
    return () => { u1(); u2(); u3(); u4(); };
  }, [user]);

  const approvePending = async (unit) => {
    setApprovingSaving(true);
    try {
      await callApproveTenantRequest({
        propertyId: unit.propertyId,
        unitId: unit.id,
        tenantId: unit.pendingTenantId,
      });
      toast.success(`${unit.pendingTenantName || "Tenant"} approved!`);
    } catch (err) {
      toast.error(err.message || "Failed to approve request.");
      throw err;
    } finally {
      setApprovingSaving(false);
    }
  };

  const symbol = country?.symbol || "₦";
  const totalUnits = properties.reduce((acc, p) => acc + (p.unitsCount || 0), 0);
  const occupiedCount = properties.reduce((acc, p) => acc + (p.occupiedCount || 0), 0);
  const revenue = properties.reduce((acc, p) => acc + (p.monthlyRevenue || 0), 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

  const urgentReminders = reminders.filter(r => {
    if (r.status === "paid") return false;
    const d = safeToDate(r.dueDate);
    if (!d) return false;
    return isPast(d) || differenceInDays(d, new Date()) <= 5;
  }).slice(0, 5);

  const mockHistory = [
    { month: "Sep", amount: revenue * 0.7 },
    { month: "Oct", amount: revenue * 0.82 },
    { month: "Nov", amount: revenue * 0.78 },
    { month: "Dec", amount: revenue * 0.95 },
    { month: "Jan", amount: revenue * 0.88 },
    { month: "Feb", amount: revenue },
  ];

  if (dataLoading) {
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

      {/* Header Info */}
      <div style={{ marginBottom: 32, animation: "slideUp 0.5s ease both" }}>
        <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, margin: 0 }}>{greeting},</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f2318", fontFamily: "'Fraunces',serif", margin: 0, letterSpacing: "-0.015em" }}>{(profile?.fullName || user?.displayName || "User").split(" ")[0]} 👋</h1>
      </div>

      {/* Payout Alert */}
      {role !== 'tenant' && profile?.payoutStatus !== 'active' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "#fff9f9",
            border: "1.5px solid #fee2e2",
            borderRadius: 20,
            padding: "20px 24px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#991b1b", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Action Required: Settlement Infrastructure Pending</p>
              <p style={{ margin: 0, fontSize: 12, color: "#b91c1c", fontWeight: 500, opacity: 0.8 }}>Secure your rent collection by linking your bank account for automated Paystack payouts.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings/payouts')}
            style={{
              background: "#dc2626",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              whiteSpace: "nowrap"
            }}
          >
            Setup Payouts
          </button>
        </motion.div>
      )}

      {/* Stat cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}>
        <StatCard
          label="Monthly Revenue" value={fmtShort(revenue, symbol)}
          sub="Current period" subColor="#1a6a3c"
          icon={<Icon d={Icons.trending} size={20} />} accentBg="#e8f5ee" accentColor="#1a6a3c" borderColor="#cce8d8" delay={0}
        />
        <StatCard
          label="Total Units" value={totalUnits}
          sub={`Across ${properties.length} properties`}
          icon={<Icon d={Icons.building} size={20} />} accentBg="#fef9ed" accentColor="#c8691a" borderColor="#f5e0b8" delay={0.05}
        />
        <StatCard
          label="Occupancy" value={`${occupancyRate}%`}
          sub={`${occupiedCount} occupied · ${totalUnits - occupiedCount} vacant`}
          icon={<Icon d={Icons.users} size={20} />} accentBg="#eff6ff" accentColor="#2563eb" borderColor="#bfdbfe" delay={0.1}
        />
        <StatCard
          label="Recent Alerts" value={urgentReminders.length + pendingUnits.length}
          sub="Require attention" icon={<Icon d={Icons.bell} size={20} />}
          accentBg="#f5f0ff" accentColor="#7c3aed" borderColor="#ddd6fe" delay={0.15}
        />
      </div>

      {/* Revenue + Join Requests */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 22, padding: 28, animation: "slideUp 0.5s ease 0.2s both", boxShadow: "0 2px 14px rgba(26,60,46,0.05)", position: "relative", overflow: "hidden" }}>
          <CornerLeaf size={80} opacity={0.06} color="#1a3c2e" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 6px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Revenue Trend</p>
              <p style={{ fontSize: 32, fontWeight: 900, color: "#0f2318", margin: "0 0 4px", fontFamily: "'Fraunces',serif", lineHeight: 1, letterSpacing: "-0.025em" }}>{fmt(revenue, symbol)}</p>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Current monthly billing</p>
            </div>
          </div>
          <RevenueChart data={mockHistory} symbol={symbol} />
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 22, padding: 24, animation: "slideUp 0.5s ease 0.25s both", boxShadow: "0 2px 14px rgba(26,60,46,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#0f2318", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>Join Requests</p>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1a6a3c", background: "#e8f5ee", padding: "2px 9px", borderRadius: 99, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{pendingUnits.length}</span>
            </div>
            <button onClick={() => navigate("/properties")} style={{ fontSize: 12, color: "#1a6a3c", background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700 }}>View all →</button>
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Tenants awaiting approval</p>
          {pendingUnits.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>All requests processed!</div>
          ) : (
            pendingUnits.slice(0, 3).map(req => (
              <JoinCard key={req.id} req={req} onApprove={approvePending} approvingSaving={approvingSaving} />
            ))
          )}
        </div>
      </div>

      {/* Properties + Alerts + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Properties Mini List */}
        <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 22, padding: 24, animation: "slideUp 0.5s ease 0.3s both", boxShadow: "0 2px 14px rgba(26,60,46,0.05)", position: "relative", overflow: "hidden" }}>
          <CornerLeaf size={60} opacity={0.055} color="#1a3c2e" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#0f2318", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>Properties</p>
            <button onClick={() => navigate("/properties")} style={{ fontSize: 12, color: "#1a6a3c", background: "#e8f5ee", border: "1px solid #cce8d8", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: 5, transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f0e0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#e8f5ee")}
            ><Icon d={Icons.plus} size={12} /> Add New</button>
          </div>
          {properties.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No properties added yet.</div>
          ) : (
            properties.slice(0, 4).map((prop, i) => {
              const pct = prop.unitsCount > 0 ? Math.round((prop.occupiedCount / prop.unitsCount) * 100) : 0;
              const barCol = pct >= 80 ? "#1a6a3c" : pct >= 50 ? "#c8691a" : "#e74c3c";
              return (
                <div key={prop.id} onClick={() => navigate(`/properties/${prop.id}`)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: i < 3 ? "1px solid #f0f9f4" : "none", cursor: "pointer", transition: "opacity 0.2s", animation: `slideUp 0.4s ease ${0.3 + i * 0.06}s both` }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.65")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "#1a6a3c14", border: "1px solid #1a6a3c28", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a6a3c", flexShrink: 0 }}>
                    <Icon d={Icons.building} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0f2318", margin: "0 0 3px", fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prop.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: "#e8f0e8", borderRadius: 99, overflow: "hidden", maxWidth: 90 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: barCol, borderRadius: 99, transition: "width 1s ease" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: "nowrap" }}>{prop.occupiedCount}/{prop.unitsCount}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: "#1a6a3c", margin: "0 0 2px", fontFamily: "'Fraunces',serif" }}>{fmtShort(prop.monthlyRevenue || 0, symbol)}</p>
                    <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>/month</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Urgent Reminders */}
        <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 22, padding: 24, animation: "slideUp 0.5s ease 0.35s both", boxShadow: "0 2px 14px rgba(26,60,46,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#0f2318", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>Urgent Alerts</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "3px 10px", borderRadius: 99, fontFamily: "'Plus Jakarta Sans',sans-serif", border: "1px solid #fecaca" }}>{reminders.filter(r => r.status !== "paid").length} active</span>
          </div>
          {urgentReminders.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>All payments are up to date!</div>
          ) : (
            urgentReminders.map((t, i) => {
              const d = safeToDate(t.dueDate);
              const days = d ? differenceInDays(d, new Date()) : 0;
              const initials = (t.tenantName || "U").split(" ").map(w => w[0]).join("").slice(0, 2);
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: i < urgentReminders.length - 1 ? "1px solid #f0f9f4" : "none" }}>
                  <Avatar initials={initials} size={40} bg="#fef2f2" color="#dc2626" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0f2318", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t.tenantName}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t.propertyName} · {t.unitName}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#dc2626", margin: "0 0 3px", fontFamily: "'Fraunces',serif" }}>{fmt(t.amount, symbol)}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "2px 7px", borderRadius: 99, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Notifications / Activity */}
        <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 22, padding: 24, animation: "slideUp 0.5s ease 0.4s both", boxShadow: "0 2px 14px rgba(26,60,46,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#0f2318", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>Activity</p>
            <button onClick={() => navigate("/notifications")} style={{ fontSize: 12, color: "#1a6a3c", background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700 }}>View all →</button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No recent activity.</div>
          ) : (
            notifications.slice(0, 5).map((act, i) => {
              const isLast = i === notifications.slice(0, 5).length - 1;
              return (
                <div key={act.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: isLast ? "none" : "1px solid #f0f9f4" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: act.type === "payment" ? "#e8f5ee" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                    {act.type === "payment" ? "💰" : "🔔"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f2318", margin: "0 0 1px", fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{act.title || act.message}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{act.timestamp ? format(safeToDate(act.timestamp), "h:mm a") : ""}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

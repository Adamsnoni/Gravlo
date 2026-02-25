// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, TrendingUp, Users, AlertTriangle, ArrowRight,
  Plus, Bell, Wrench, ChevronRight, User, UserCheck, ExternalLink,
  Mail, LogOut, ArrowUp, X, Check
} from 'lucide-react';
import { format, differenceInDays, isPast, subMonths } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import {
  subscribeProperties,
  subscribeReminders,
  subscribePendingUnits,
  subscribeNotifications,
  markNotificationRead,
  clearUnitRequestNotifications,
  updateUnit,
  serverTimestamp
} from '../services/firebase';
import { createTenancy } from '../services/tenancy';
import { toast } from 'react-hot-toast';

// ── Utilities ────────────────────────────────────────────────
const safeToDate = (d) => {
  if (!d) return null;
  if (typeof d.toDate === 'function') return d.toDate();
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
};

const fmtShort = (n, sym = "₦") => {
  if (n >= 1000000) return `${sym}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}K`;
  return `${sym}${n}`;
};

// ── Icons (Simplified using Lucide) ──────────────────────────
const CustomIcon = ({ icon: Icon, size = 18, color = "currentColor" }) => (
  <Icon size={size} color={color} strokeWidth={2} />
);

// ── Avatar ───────────────────────────────────────────────────
const Avatar = ({ initials, size = 36, color = "#1a3c2e" }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: color, display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0,
    fontSize: size * 0.33, fontWeight: 700, color: "#fff",
    fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em",
  }}>
    {initials}
  </div>
);

// ── Revenue Sparkline ────────────────────────────────────────
const RevenueChart = ({ data, symbol }) => {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...data.map((d) => d.amount));
  const min = Math.min(...data.map((d) => d.amount));
  const H = 100, W = 100;
  const pad = 8;

  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - ((d.amount - min) / (max - min || 1)) * (H - pad * 2),
  }));

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;

  return (
    <div style={{ marginTop: 8 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: 120, overflow: "visible" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52b788" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#52b788" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chartGrad)" />
        <path d={path} fill="none" stroke="#52b788" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle
            key={i} cx={p.x} cy={p.y} r={hovered === i ? 3 : 2}
            fill={hovered === i ? "#fff" : "#52b788"}
            stroke="#52b788" strokeWidth="1.5"
            style={{ cursor: "pointer", transition: "r 0.15s" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {/* Month labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ textAlign: "center", flex: 1 }}>
            <p style={{
              fontSize: 10, color: hovered === i ? "#52b788" : "#4a5568",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: hovered === i ? 700 : 400,
              margin: 0, transition: "color 0.15s",
            }}>
              {d.month}
            </p>
            {hovered === i && (
              <p style={{
                fontSize: 9, color: "#52b788", margin: "2px 0 0",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                animation: "fadeIn 0.15s ease",
              }}>
                {fmtShort(d.amount, symbol)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Stat Card ────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: IconComp, accent, delay = 0 }) => (
  <div style={{
    background: "#141b1e",
    border: "1px solid #1e2a2e",
    borderRadius: 14,
    padding: "20px 22px",
    position: "relative",
    overflow: "hidden",
    animation: `slideUp 0.5s ease ${delay}s both`,
    transition: "border-color 0.2s, transform 0.2s",
    cursor: "default",
  }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = accent || "#52b788";
      e.currentTarget.style.transform = "translateY(-2px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "#1e2a2e";
      e.currentTarget.style.transform = "translateY(0)";
    }}
  >
    {/* Accent dot */}
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 2,
      background: `linear-gradient(90deg, ${accent || "#52b788"}, transparent)`,
    }} />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "#4a5568",
          margin: "0 0 10px", fontFamily: "'DM Sans', sans-serif",
        }}>
          {label}
        </p>
        <p style={{
          fontSize: 28, fontWeight: 800, color: "#e8e4de",
          margin: "0 0 4px", fontFamily: "'Syne', sans-serif",
          lineHeight: 1,
        }}>
          {value}
        </p>
        {sub && (
          <p style={{
            fontSize: 12, color: "#4a5568", margin: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {sub}
          </p>
        )}
      </div>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${accent || "#52b788"}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent || "#52b788",
      }}>
        <IconComp size={18} />
      </div>
    </div>
  </div>
);

// ── Section Header ───────────────────────────────────────────
const SectionHeader = ({ title, action, actionLabel }) => (
  <div style={{
    display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
  }}>
    <h2 style={{
      fontSize: 13, fontWeight: 700, color: "#e8e4de",
      letterSpacing: "0.06em", textTransform: "uppercase",
      fontFamily: "'DM Sans', sans-serif", margin: 0,
    }}>
      {title}
    </h2>
    {action && (
      <button onClick={action} style={{
        fontSize: 12, color: "#52b788", background: "none",
        border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600, padding: 0,
        transition: "opacity 0.2s",
      }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {actionLabel || "View all →"}
      </button>
    )}
  </div>
);

// ── Join Request Card ────────────────────────────────────────
const JoinRequestCard = ({ req, onApprove, onReject, approvingSaving }) => {
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

  const handleReject = () => {
    setStatus("rejected");
    onReject?.(req.id);
  };

  const initials = (req.pendingTenantName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      background: "#141b1e",
      border: `1px solid ${status === "approved" ? "#1a3c2e" : status === "rejected" ? "#2d1a1a" : "#1e2a2e"}`,
      borderRadius: 12, padding: "14px 16px",
      marginBottom: 10, transition: "all 0.3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar initials={initials} size={38}
          color={status === "approved" ? "#1a3c2e" : status === "rejected" ? "#3d1515" : "#1e2d38"}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <p style={{
              fontSize: 14, fontWeight: 600, color: "#e8e4de",
              margin: 0, fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
            }}>
              {req.pendingTenantName}
            </p>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px",
              borderRadius: 99, fontFamily: "'DM Sans', sans-serif",
              background: status === "approved" ? "#1a3c2e" : status === "rejected" ? "#2d1a1a" : "#1e2a2e",
              color: status === "approved" ? "#52b788" : status === "rejected" ? "#e74c3c" : "#4a5568",
            }}>
              {status === "pending" ? "Pending" : status === "approved" ? "✓ Approved" : "✗ Rejected"}
            </span>
          </div>
          <p style={{
            fontSize: 12, color: "#4a5568", margin: 0,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>
            {req.propertyName} · <span style={{ color: "#52b788" }}>{req.name || req.unitName}</span>
          </p>
        </div>
      </div>

      {status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={handleApprove}
            disabled={approvingSaving}
            style={{
              flex: 1, padding: "8px", borderRadius: 8,
              background: "#1a3c2e", border: "1px solid #2d6a4f",
              color: "#52b788", fontSize: 13, fontWeight: 600,
              cursor: approvingSaving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}
          >
            {approvingSaving ? <Loader2 size={14} className="animate-spin" /> : 'Approve'}
          </button>
          <button
            onClick={handleReject}
            disabled={approvingSaving}
            style={{
              flex: 1, padding: "8px", borderRadius: 8,
              background: "#1e1e1e", border: "1px solid #2a2020",
              color: "#6b6460", fontSize: 13, fontWeight: 600,
              cursor: approvingSaving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s",
            }}
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
};

// ── Property Row ─────────────────────────────────────────────
const PropertyRow = ({ property, delay, fmtShort }) => {
  const unitsCount = property.unitsCount || (property.units ? Object.keys(property.units).length : 0);
  const occupiedCount = property.occupiedCount || 0;
  const pct = unitsCount > 0 ? Math.round((occupiedCount / unitsCount) * 100) : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "13px 0",
      borderBottom: "1px solid #1e2a2e",
      animation: `slideUp 0.4s ease ${delay}s both`,
      cursor: "pointer",
      transition: "opacity 0.2s",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: "#141b1e", border: "1px solid #1e2a2e",
        display: "flex", alignItems: "center",
        justifyContent: "center", color: "#52b788", flexShrink: 0,
      }}>
        <Building2 size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: "#e8e4de",
          margin: "0 0 3px", fontFamily: "'DM Sans', sans-serif",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {property.name}
        </p>
        <p style={{
          fontSize: 11, color: "#4a5568", margin: 0,
          fontFamily: "'DM Sans', sans-serif",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
        }}>
          {property.address}
        </p>
      </div>
      <div style={{ textAlign: "center", minWidth: 60 }}>
        <p style={{
          fontSize: 13, fontWeight: 700, color: "#e8e4de",
          margin: "0 0 2px", fontFamily: "'DM Sans', sans-serif",
        }}>
          {occupiedCount}/{unitsCount}
        </p>
        <div style={{
          height: 3, borderRadius: 99, background: "#1e2a2e",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: pct > 80 ? "#52b788" : pct > 50 ? "#f0c040" : "#e74c3c",
            borderRadius: 99, transition: "width 1s ease",
          }} />
        </div>
      </div>
      <div style={{ textAlign: "right", minWidth: 90 }}>
        <p style={{
          fontSize: 14, fontWeight: 700, color: "#52b788",
          margin: 0, fontFamily: "'Syne', sans-serif",
        }}>
          {fmtShort(property.monthlyRevenue || 0)}
        </p>
        <p style={{
          fontSize: 10, color: "#4a5568", margin: "2px 0 0",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          /month
        </p>
      </div>
    </div>
  );
};

// ── Shared Loader ────────────────────────────────────────────
const Loader2 = ({ size = 18, className = "" }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={`${className} animate-spin`}
  >
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

// ── Main Dashboard ───────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { fmt, country } = useLocale();
  const navigate = useNavigate();

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
    const u1 = subscribeProperties(user.uid, (data) => { setProperties(data); setDataLoading(false); });
    const u2 = subscribeReminders(user.uid, setReminders);
    const u3 = subscribePendingUnits(user.uid, setPendingUnits);
    const u4 = subscribeNotifications(user.uid, setNotifications);
    return () => { u1(); u2(); u3(); u4(); };
  }, [user]);

  const approvePending = async (unit) => {
    setApprovingSaving(true);
    try {
      await updateUnit(user.uid, unit.propertyId, unit.id, {
        status: 'occupied',
        tenantId: unit.pendingTenantId,
        tenantName: unit.pendingTenantName || '',
        tenantEmail: unit.pendingTenantEmail || '',
        welcomeMessageSent: true,
        welcomeMessageDate: serverTimestamp(),
        pendingTenantId: null,
        pendingTenantName: null,
        pendingTenantEmail: null,
        pendingRequestedAt: null,
      });
      await createTenancy({
        tenantId: unit.pendingTenantId,
        landlordId: user.uid,
        propertyId: unit.propertyId,
        unitId: unit.id,
        tenantName: unit.pendingTenantName || '',
        tenantEmail: unit.pendingTenantEmail || '',
        unitName: unit.unitName || unit.name || '',
        propertyName: unit.propertyName || '',
        rentAmount: unit.rentAmount || 0,
        billingCycle: unit.billingCycle || 'monthly',
        currency: country?.currency || 'NGN',
        welcomeMessageSent: true,
        welcomeMessageDate: new Date(),
      });
      await clearUnitRequestNotifications(user.uid, unit.propertyId, unit.id, unit.pendingTenantId);
      toast.success(`${unit.pendingTenantName || 'Tenant'} approved!`);
    } catch (err) {
      toast.error('Failed to approve request.');
      throw err;
    } finally {
      setApprovingSaving(false);
    }
  };

  // ── Derived Stats ──
  const totalUnits = properties.reduce((s, p) => s + (p.unitsCount || 0), 0);
  const occupiedUnits = properties.reduce((s, p) => s + (p.occupiedCount || 0), 0);
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const monthlyRev = properties.reduce((s, p) => s + (p.monthlyRevenue || 0), 0);
  const yearlyRev = monthlyRev * 12;
  const symbol = country?.symbol || '₦';

  const overdueRem = reminders.filter(r => {
    const d = safeToDate(r.dueDate);
    return d && isPast(d) && r.status !== 'paid';
  });

  const urgentRemCount = reminders.filter(r => {
    const d = safeToDate(r.dueDate);
    if (!d) return false;
    return !isPast(d) && differenceInDays(d, new Date()) <= 5 && r.status !== 'paid';
  }).length + overdueRem.length;

  // Revenue chart data (last 6 months)
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(new Date(), 5 - i);
    // Simple mock growth simulation based on current revenue
    const factor = 0.85 + (i * 0.03) + (Math.random() * 0.05);
    return {
      month: format(m, 'MMM'),
      amount: monthlyRev * factor
    };
  });

  const topProperties = [...properties]
    .sort((a, b) => (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0))
    .slice(0, 4);

  const combinedActivity = [
    ...notifications.map(n => ({ ...n, feedType: 'notification' })),
    ...overdueRem.map(r => ({ ...r, feedType: 'reminder', overdue: true }))
  ].sort((a, b) => {
    const dateA = safeToDate(a.createdAt) || safeToDate(a.dueDate) || new Date(0);
    const dateB = safeToDate(b.createdAt) || safeToDate(b.dueDate) || new Date(0);
    return dateB - dateA;
  }).slice(0, 6);

  if (dataLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "100px 0" }}>
        <Loader2 size={32} className="text-sage" />
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0f12", color: "#e8e4de", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <p style={{ fontSize: 13, color: "#4a5568", margin: 0 }}>{greeting},</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#e8e4de", fontFamily: "'Syne', sans-serif", margin: 0 }}>
            {(profile?.fullName || user?.displayName || 'there').split(' ')[0]} 👋
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate('/properties')}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
              background: "linear-gradient(135deg, #1a3c2e, #2d6a4f)",
              border: "none", borderRadius: 8, color: "#52b788", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "opacity 0.2s",
            }}
          >
            <Plus size={14} /> Add Property
          </button>

          <button
            onClick={() => navigate('/notifications')}
            style={{
              position: "relative", width: 38, height: 38, borderRadius: 8,
              background: "#141b1e", border: "1px solid #1e2a2e",
              color: "#4a5568", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", transition: "all 0.2s",
            }}
          >
            <Bell size={17} />
            {notifications.some(n => !n.read) && (
              <div style={{
                position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%",
                background: "#e74c3c", animation: "pulse 2s ease-in-out infinite", border: "1.5px solid #0a0f12",
              }} />
            )}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16, marginBottom: 28,
      }}>
        <StatCard
          label="Monthly Revenue"
          value={fmtShort(monthlyRev, symbol)}
          sub="+12.4% vs last month"
          accent="#52b788" delay={0} icon={TrendingUp}
        />
        <StatCard
          label="Total Units"
          value={totalUnits}
          sub={`Across ${properties.length} properties`}
          accent="#c8a951" delay={0.05} icon={Building2}
        />
        <StatCard
          label="Occupancy Rate"
          value={`${occupancyRate}%`}
          sub={`${occupiedUnits} occupied · ${vacantUnits} vacant`}
          accent="#3498db" delay={0.1} icon={Users}
        />
        <StatCard
          label="Urgent Reminders"
          value={urgentRemCount}
          sub={overdueRem.length > 0 ? `${overdueRem.length} overdue` : "All current"}
          accent="#e74c3c" delay={0.15} icon={AlertTriangle}
        />
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, marginBottom: 20 }}>

        {/* Revenue Chart */}
        <div style={{
          background: "#0d1215", border: "1px solid #1e2a2e",
          borderRadius: 16, padding: "24px", animation: "slideUp 0.5s ease 0.2s both"
        }}>
          <SectionHeader title="Revenue Overview" />
          <p style={{
            fontSize: 32, fontWeight: 800, color: "#e8e4de",
            fontFamily: "'Syne', sans-serif", margin: "0 0 4px", lineHeight: 1,
          }}>
            {fmt(monthlyRev)}
          </p>
          <p style={{ fontSize: 12, color: "#4a5568", margin: 0 }}>
            Live portfolio analytics · <span style={{ color: "#52b788" }}>+₦120K vs Jan</span>
          </p>
          <RevenueChart data={chartData} symbol={symbol} />
        </div>

        {/* Join Requests */}
        <div style={{
          background: "#0d1215", border: "1px solid #1e2a2e",
          borderRadius: 16, padding: "24px", animation: "slideUp 0.5s ease 0.25s both"
        }}>
          <SectionHeader title={`Join Requests · ${pendingUnits.length}`} action={() => navigate('/notifications')} />
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {pendingUnits.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🎉</p>
                <p style={{ fontSize: 13, color: "#4a5568" }}>All requests handled</p>
              </div>
            ) : (
              pendingUnits.map(req => (
                <JoinRequestCard
                  key={req.id} req={req}
                  onApprove={approvePending}
                  approvingSaving={approvingSaving}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>

        {/* Properties List */}
        <div style={{
          background: "#0d1215", border: "1px solid #1e2a2e",
          borderRadius: 16, padding: "24px", animation: "slideUp 0.5s ease 0.3s both"
        }}>
          <SectionHeader title="Top Properties" action={() => navigate('/properties')} actionLabel="Manage →" />
          {topProperties.length === 0 ? (
            <p style={{ fontSize: 13, color: "#4a5568", textAlign: "center", padding: "20px" }}>No properties yet.</p>
          ) : (
            topProperties.map((p, i) => (
              <PropertyRow key={p.id} property={p} delay={0.3 + i * 0.05} fmtShort={(n) => fmtShort(n, symbol)} />
            ))
          )}
        </div>

        {/* Recent Activity */}
        <div style={{
          background: "#0d1215", border: "1px solid #1e2a2e",
          borderRadius: 16, padding: "24px", animation: "slideUp 0.5s ease 0.4s both"
        }}>
          <SectionHeader title="Activity" action={() => navigate('/notifications')} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {combinedActivity.length === 0 ? (
              <p style={{ fontSize: 13, color: "#4a5568", textAlign: "center", padding: "20px" }}>No recent activity.</p>
            ) : (
              combinedActivity.map((act, i) => (
                <div key={act.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                  borderBottom: i < combinedActivity.length - 1 ? "1px solid #1e2a2e" : "none",
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: act.overdue ? "#2d1a1a" : "#1a3c2e",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>
                    {act.overdue ? "⌛" : "💰"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: "#e8e4de",
                      margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                    }}>
                      {act.tenantName || 'Someone'}
                    </p>
                    <p style={{ fontSize: 11, color: "#4a5568", margin: 0 }}>
                      {act.overdue ? 'Payment Overdue' : (act.type === 'unit_request' ? 'Requested unit' : 'Recent action')}
                    </p>
                  </div>
                  {act.amount && (
                    <p style={{ fontSize: 13, fontWeight: 700, color: act.overdue ? "#e74c3c" : "#52b788", margin: 0 }}>
                      {fmtShort(act.amount, symbol)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

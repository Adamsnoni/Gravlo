// src/pages/TenantDashboardPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  CreditCard,
  ArrowRight,
  Bell,
  Hash,
  Sparkles,
  Building2,
  CheckCircle2,
  X,
  MapPin,
  Clock,
  Wrench,
  Activity,
  User
} from "lucide-react";
import { format, isAfter, subHours, differenceInDays } from "date-fns";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { subscribeTenantPayments, subscribeReminders } from "../services/firebase";
import { subscribeTenantTenancies } from "../services/tenancy";

// ── Components ──────────────────────────────────────────────
function getSafeDate(d) {
  if (!d) return new Date();
  const date = d.toDate?.() || new Date(d);
  return isNaN(date.getTime()) ? new Date() : date;
}

function getPaymentDate(p) {
  const d = p?.paidDate || p?.recordedAt || p?.createdAt || p?.timestamp;
  return getSafeDate(d);
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

export default function TenantDashboardPage() {
  const { user, profile } = useAuth();
  const { fmt, fmtRent, country } = useLocale();
  const navigate = useNavigate();

  const [units, setUnits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 12 && h < 17) setGreeting("Good afternoon");
    else if (h >= 17) setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const u1 = subscribeTenantTenancies(user.uid, (list) => {
      setUnits(list.map(t => ({ ...t, id: t.unitId || t.id, type: 'unit' })));
      setDataLoading(false);
    });
    const u2 = subscribeTenantPayments(user.uid, setPayments);
    const u3 = subscribeReminders(user.uid, (list) => {
      setReminders(list.filter((r) => r.createdBy === 'tenant' && r.status !== 'paid'));
    });

    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, [user?.uid]);

  const activeHomes = units.filter(h => h.status === 'active');
  const pastHomes = units.filter(h => h.status === 'former');
  const yearlyRent = activeHomes.reduce((s, h) => s + (h.rentAmount || 0), 0);
  const symbol = country?.symbol || '₦';

  const [dismissedWelcome, setDismissedWelcome] = useState(() => {
    if (!user?.uid) return false;
    return localStorage.getItem(`gravlo_welcome_dismissed_${user.uid}`) === 'true';
  });

  const handleDismissWelcome = () => {
    setDismissedWelcome(true);
    if (user?.uid) {
      localStorage.setItem(`gravlo_welcome_dismissed_${user.uid}`, 'true');
    }
  };

  const canvasRef = useRef(null);
  const newApprovals = activeHomes.filter(h => {
    if (!h.welcomeMessageSent) return false;
    const welcomeDate = h.welcomeMessageDate?.toDate?.() || new Date(h.welcomeMessageDate);
    return isAfter(welcomeDate, subHours(new Date(), 48));
  });

  useEffect(() => {
    if (newApprovals.length > 0 && !dismissedWelcome) {
      let interval;
      let myConfetti;

      const timer = setTimeout(() => {
        if (!canvasRef.current) return;
        myConfetti = confetti.create(canvasRef.current, { resize: true, useWorker: true });
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        interval = setInterval(function () {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          const particleCount = 50 * (timeLeft / duration);
          myConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          myConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }, 50);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
        if (myConfetti) myConfetti.reset();
      };
    }
  }, [newApprovals.length, dismissedWelcome]);

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
      <div style={{ marginBottom: 32, animation: "slideUp 0.5s ease both" }} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, margin: 0 }}>{greeting},</p>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0f2318", fontFamily: "'Fraunces',serif", margin: 0, letterSpacing: "-0.015em" }}>
            {(profile?.fullName || user?.displayName || "User").split(" ")[0]} 🌿
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/tenant/payments" className="btn-primary" style={{ padding: "12px 24px", borderRadius: 14, fontSize: 13, fontWeight: 800 }}>
            Pay Rent
          </Link>
        </div>
      </div>

      {/* Stat cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
        <StatCard
          label="Rent Obligations" value={fmt(yearlyRent, symbol)}
          sub="Total yearly commitment"
          icon={<CreditCard size={20} strokeWidth={2.5} />} accentBg="#fef9ed" accentColor="#c8691a" borderColor="#f5e0b8" delay={0.05}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Homes */}
        <div className="lg:col-span-2 space-y-6">
          <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 24, padding: 32, animation: "slideUp 0.5s ease 0.2s both", boxShadow: "0 2px 14px rgba(26,60,46,0.05)" }}>
            <div className="flex items-center justify-between mb-8">
              <h3 style={{ fontFamily: "'Fraunces',serif", color: "#1a2e22", fontSize: 20, fontWeight: 800, margin: 0 }} className="flex items-center gap-2">
                <Building2 className="text-[#1a6a3c]" size={20} />
                Your Active Property
              </h3>
              {activeHomes.length > 0 && (
                <Link to="/tenant/payments" style={{ fontSize: 13, fontWeight: 700, color: "#1a6a3c" }} className="hover:underline flex items-center gap-1">
                  Payment History <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {activeHomes.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#f4fbf7] flex items-center justify-center text-[#cce8d8] mb-4">
                  <Home size={32} />
                </div>
                <p className="text-[#6b8a7a] font-medium">No active properties found.</p>
                <p className="text-[#94a3a8] text-sm mt-1">Once a landlord approves your request, it will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {activeHomes.map((h, i) => (
                  <motion.div
                    key={h.id}
                    {...fadeUp(0.25 + i * 0.05)}
                    style={{ background: "#fcfdfc", border: "1px solid #f0f7f2", borderRadius: 20 }}
                    className="p-5 hover:border-[#1a6a3c]/30 hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div style={{ fontFamily: "'Fraunces',serif" }} className="w-14 h-14 rounded-2xl bg-[#f4fbf7] flex items-center justify-center text-[#1a6a3c] font-black text-xl border border-[#ddf0e6]">
                          {h.unitName?.[0] || h.propertyName?.[0] || 'H'}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1a2e22] group-hover:text-[#1a6a3c] transition-colors leading-tight mb-1">
                            {h.propertyName || 'Property'}
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 font-bold text-[#1a6a3c] text-[10px] uppercase tracking-widest px-2 py-0.5 bg-[#e8f5ee] rounded-lg">
                              <Hash size={10} strokeWidth={3} /> {h.unitName || h.unitNumber || 'Main Unit'}
                            </span>
                            <span className="flex items-center gap-1 text-[#94a3a8] text-[10px] font-bold uppercase tracking-widest">
                              <MapPin size={10} /> {h.address || 'Location on file'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left md:text-right border-t md:border-0 pt-4 md:pt-0 border-[#f0f7f2]">
                        <p style={{ fontFamily: "'Fraunces',serif" }} className="text-xl font-black text-[#1a2e22] mb-0.5">
                          {fmtRent(h.monthlyRent || h.rentAmount || 0, 'yearly')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {pastHomes.length > 0 && (
            <div style={{ background: "#fcfdfc", border: "1px solid #f0f7f2", borderRadius: 24, padding: 32 }} className="opacity-70 grayscale-[0.3]">
              <h3 style={{ fontFamily: "'Fraunces',serif", color: "#94a3a8", fontSize: 18, fontWeight: 800, margin: "0 0 24px" }}>Former Homes</h3>
              <div className="grid gap-3">
                {pastHomes.map(h => (
                  <div key={h.id} className="p-4 rounded-xl border border-[#ddf0e6] bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Home size={18} className="text-[#cce8d8]" />
                      <div>
                        <p className="font-bold text-sm text-[#1a2e22]">{h.propertyName}</p>
                        <p className="text-xs text-[#94a3a8] font-medium">{h.unitName} · Archived Record</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#94a3a8] px-2 py-1 bg-gray-50 rounded-lg">Historical</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Reminders & Quick Links */}
        <div className="space-y-6">
          <div style={{ background: "#fef9ed66", border: "1.5px solid #f5e0b8", borderRadius: 24, padding: 24 }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontFamily: "'Fraunces',serif", color: "#1a2e22", fontSize: 18, fontWeight: 800, margin: 0 }} className="flex items-center gap-2">
                <Bell className="text-[#c8691a]" size={18} />
                Upcoming
              </h3>
              <Link to="/tenant/reminders" className="text-[11px] font-black uppercase tracking-widest text-[#c8691a] hover:underline">
                View All
              </Link>
            </div>

            {reminders.length === 0 ? (
              <div className="py-8 text-center bg-white/40 rounded-2xl border border-dashed border-[#f5e0b8]">
                <p className="text-sm text-[#94a3a8] font-medium italic">Protocol Clear 🍃</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.slice(0, 3).map(r => {
                  const due = getSafeDate(r.dueDate);
                  return (
                    <div key={r.id} className="p-4 rounded-2xl bg-white border border-[#f5e0b8] shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#c8691a]" />
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#c8691a] px-2 py-0.5 bg-[#fef9ed] rounded-lg">
                          Due {format(due, 'MMM d')}
                        </span>
                        <p style={{ fontFamily: "'Fraunces',serif" }} className="font-black text-[#1a2e22] leading-none">{fmt(r.amount || 0, symbol)}</p>
                      </div>
                      <p className="text-sm font-bold text-[#1a2e22] truncate">{r.propertyName || 'Upcoming Rent'}</p>
                      <p className="text-[10px] text-[#94a3a8] mt-1 font-bold uppercase tracking-wider italic">{r.unitName || 'Main Unit'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", border: "1.5px solid #e2ede8", borderRadius: 24, padding: 24 }}>
            <h3 style={{ fontFamily: "'Fraunces',serif", color: "#1a2e22", fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Quick Portal</h3>
            <div className="grid grid-cols-1 gap-1">
              {[
                { label: 'Maintenance Requests', to: '/tenant/maintenance', icon: Wrench },
                { label: 'Payment History', to: '/tenant/payments', icon: Activity },
                { label: 'Account Profile', to: '/profile', icon: User },
                { label: 'Security Settings', to: '/settings', icon: Clock }
              ].map((link, i) => (
                <Link key={i} to={link.to} className="flex items-center justify-between p-3.5 rounded-xl hover:bg-[#f4fbf7] transition-all group">
                  <div className="flex items-center gap-3">
                    <link.icon size={16} className="text-[#cce8d8] group-hover:text-[#1a6a3c] transition-colors" />
                    <span className="text-sm font-bold text-[#6b8a7a] group-hover:text-[#1a2e22] transition-colors">{link.label}</span>
                  </div>
                  <ArrowRight size={14} className="text-[#cce8d8] group-hover:text-[#1a6a3c] -translate-x-1 group-hover:translate-x-0 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {newApprovals.length > 0 && !dismissedWelcome && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1a3c2e]/70 backdrop-blur-md pointer-events-auto"
              onClick={handleDismissWelcome}
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              style={{ borderRadius: 40 }}
              className="relative w-full max-w-xl bg-white shadow-2xl overflow-hidden pointer-events-auto z-10"
            >
              <div className="h-2 w-full bg-gradient-to-r from-[#1a6a3c] via-[#52b788] to-[#1a6a3c]" />
              <button
                onClick={handleDismissWelcome}
                className="absolute top-8 right-8 p-2.5 rounded-full hover:bg-[#f4fbf7] text-[#94a3a8] hover:text-[#1a6a3c] transition-all"
              >
                <X size={20} />
              </button>

              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-[#e8f5ee] rounded-3xl mx-auto flex items-center justify-center text-[#1a6a3c] mb-6 shadow-sm border border-[#ddf0e6] relative">
                  <Sparkles className="absolute -top-3 -right-3 text-[#c8691a] animate-pulse" />
                  <CheckCircle2 size={36} strokeWidth={2.5} />
                </div>

                <h2 style={{ fontFamily: "'Fraunces',serif" }} className="text-3xl font-black text-[#1a2e22] mb-3 italic">Welcome Home!</h2>
                <p className="text-[#6b8a7a] font-bold text-sm tracking-wide mb-8">Your residence authorization has been granted.</p>

                <div className="grid gap-4 mb-10">
                  {newApprovals.map(a => (
                    <div key={a.id} className="p-5 rounded-2xl bg-[#f4fbf7] border border-[#ddf0e6] text-left flex items-start gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-xs border border-[#f0f7f2] text-[#1a6a3c] flex-shrink-0">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-[#1a2e22] leading-tight mb-1">{a.propertyName}</p>
                        <p className="text-xs text-[#94a3a8] font-medium leading-relaxed">
                          Your tenant profile is now live for <span className="text-[#1a6a3c] font-black">{a.unitName || a.unitNumber}</span>. Setup your digital remittances below.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/tenant/payments"
                    className="btn-primary flex-1 py-4 text-base shadow-xl shadow-[#1a6a3c]/20"
                    onClick={handleDismissWelcome}
                  >
                    Setup Payments
                  </Link>
                  <button
                    onClick={handleDismissWelcome}
                    className="btn-secondary flex-1 py-4 text-base border-transparent hover:bg-gray-100"
                  >
                    Go to Portal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

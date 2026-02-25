// src/pages/PaymentsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, TrendingUp, ChevronRight, Activity, DollarSign, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeProperties, subscribePayments } from '../services/firebase';
import PaymentRow from '../components/PaymentRow';
import { generateInvoicePdf } from '../utils/invoicePdf';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: "easeOut" },
});

export default function PaymentsPage() {
  const { user } = useAuth();
  const { fmt } = useLocale();

  const [properties, setProperties] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [propFilter, setPropFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    const unsubProps = subscribeProperties(user.uid, (props) => {
      setProperties(props);
      unsubs.forEach(u => u?.());
      unsubs.length = 0;
      if (props.length === 0) { setAllPayments([]); setLoading(false); return; }
      props.forEach(prop => {
        const u = subscribePayments(user.uid, prop.id, (pays) => {
          const tagged = pays.map(p => ({ ...p, propertyName: prop.name, propertyId: prop.id }));
          setAllPayments(prev => {
            const others = prev.filter(p => p.propertyId !== prop.id);
            return [...others, ...tagged].sort((a, b) => {
              const da = a.paidDate || a.createdAt || a.timestamp;
              const db = b.paidDate || b.createdAt || b.timestamp;
              const dateA = da?.toDate?.() ?? new Date(da);
              const dateB = db?.toDate?.() ?? new Date(db);
              return dateB - dateA;
            });
          });
          setLoading(false);
        });
        unsubs.push(u);
      });
    });
    return () => { unsubProps(); unsubs.forEach(u => u?.()); };
  }, [user]);

  const filtered = allPayments.filter(p => (filter === 'all' || p.status === filter) && (propFilter === 'all' || p.propertyId === propFilter));
  const totalPaid = allPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = allPayments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totalLate = allPayments.filter(p => p.status === 'late').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12 animate-slide-up">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[#6b8a7a] font-bold text-xs uppercase tracking-[0.15em] mb-2">Financial Registry</p>
          <h1 className="font-fraunces text-[#1a2e22] text-4xl font-black tracking-tight leading-none italic">
            Ledger & Payments
          </h1>
          <p className="text-[#94a3a8] font-medium text-sm mt-3 flex items-center gap-2">
            <Activity size={16} /> Monitoring settlements across {properties.length} active assets
          </p>
        </div>
      </motion.div>

      {/* Financial Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard label="Capital Collected" value={fmt(totalPaid)} icon={TrendingUp} color="#1a6a3c" bg="#e8f5ee" delay={0.05} />
        <SummaryCard label="In Processing" value={fmt(totalPending)} icon={CreditCard} color="#c8691a" bg="#fef9ed" delay={0.1} />
        <SummaryCard label="Outstanding" value={fmt(totalLate)} icon={DollarSign} color="#e74c3c" bg="#fff5f5" delay={0.15} />
      </div>

      {/* Controls: Search & Filter */}
      <motion.div {...fadeUp(0.2)} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex bg-[#fcfdfc] p-1.5 rounded-[1.25rem] border border-[#f0f7f2] shadow-sm overflow-x-auto no-scrollbar">
          {['all', 'paid', 'pending', 'late'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f
                  ? 'bg-[#1a3c2e] text-white shadow-md'
                  : 'text-[#6b8a7a] hover:text-[#1a6a3c] hover:bg-emerald-50/50'
                }`}
            >
              {f === 'all' ? 'All Records' : f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex text-[10px] font-black text-[#94a3a8] uppercase tracking-widest items-center gap-1.5 px-3 py-1 bg-[#f4fbf7] rounded-lg border border-[#ddf0e6]">
            <Filter size={10} /> Scope:
          </span>
          <select
            className="bg-transparent border-b-2 border-[#ddf0e6] py-1 text-sm font-bold text-[#1a6a3c] focus:border-[#1a6a3c] focus:outline-none transition-all cursor-pointer"
            value={propFilter}
            onChange={e => setPropFilter(e.target.value)}
          >
            <option value="all">Entire Portfolio</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Main Ledger Table */}
      {loading ? (
        <div className="card divide-y divide-[#f0f7f2] overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 animate-pulse bg-white/50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div {...fadeUp(0.25)} className="card p-24 flex flex-col items-center text-center bg-[#fcfdfc]/50 border-2 border-dashed border-[#ddf0e6]">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-[#cce8d8] mb-6 shadow-sm border border-[#f0f7f2]">
            <CreditCard size={40} strokeWidth={1.5} />
          </div>
          <h2 className="font-fraunces text-[#1a2e22] text-2xl font-black mb-2 italic">Nothing to Display</h2>
          <p className="text-[#6b8a7a] font-medium max-w-sm">
            {allPayments.length === 0
              ? "Your ledger is currently empty. Digital payments will populate this list as settlements occur."
              : "No transactions match your current filtering criteria."}
          </p>
          {allPayments.length > 0 && (
            <button onClick={() => { setFilter('all'); setPropFilter('all'); }} className="mt-6 text-[#1a6a3c] font-bold text-sm hover:underline">
              Reset Scope
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div {...fadeUp(0.25)} className="card overflow-hidden shadow-xl border-[#f0f7f2]">
          <div className="hidden lg:flex items-center gap-6 px-8 py-4 bg-[#fcfdfc] border-b border-[#f0f7f2]">
            <span className="flex-1 text-[10px] font-black text-[#94a3a8] uppercase tracking-[0.15em]">Settlement Subject</span>
            <span className="w-32 text-right text-[10px] font-black text-[#94a3a8] uppercase tracking-[0.15em] border-l border-[#f0f7f2] pl-6">Date</span>
            <span className="w-32 text-right text-[10px] font-black text-[#94a3a8] uppercase tracking-[0.15em] border-l border-[#f0f7f2] pl-6">Method</span>
            <span className="w-20 text-right text-[10px] font-black text-[#94a3a8] uppercase tracking-[0.15em]">Status</span>
            <span className="w-28 text-right text-[10px] font-black text-[#94a3a8] uppercase tracking-[0.15em] border-l border-[#f0f7f2] ml-4 pl-4">Value</span>
            <span className="w-10"></span>
          </div>
          <div className="divide-y divide-[#f0f7f2]">
            <AnimatePresence mode="popLayout">
              {filtered.map((p, i) => (
                <motion.div
                  key={`${p.id}-${p.propertyId}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <PaymentRow
                    payment={p}
                    isLast={i === filtered.length - 1}
                    showProperty
                    onDownloadInvoice={generateInvoicePdf}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, bg, delay }) {
  return (
    <motion.div {...fadeUp(delay)} className="card p-8 group relative overflow-hidden bg-white hover:border-[#1a6a3c]/30 hover:shadow-2xl transition-all">
      <div className="absolute top-[-20px] right-[-20px] opacity-[0.03] transform rotate-12 group-hover:rotate-45 transition-transform duration-700">
        <Icon size={120} />
      </div>
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-[#94a3a8] uppercase tracking-[0.2em] mb-2">{label}</p>
          <h3 className="font-fraunces text-3xl font-black italic tracking-tight" style={{ color }}>
            {value}
          </h3>
        </div>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner" style={{ backgroundColor: bg, borderColor: `${color}20` }}>
          <Icon size={28} style={{ color }} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}

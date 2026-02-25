// src/pages/PaymentsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, TrendingUp, ChevronRight, Loader2, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeProperties, subscribePayments } from '../services/firebase';
import PaymentRow from '../components/PaymentRow';
import { generateInvoicePdf } from '../utils/invoicePdf';

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
              const da = a.paidDate?.toDate?.() ?? new Date(a.paidDate);
              const db = b.paidDate?.toDate?.() ?? new Date(b.paidDate);
              return db - da;
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tight">Financial Ledger</h1>
          <p className="font-body text-[#4a5568] text-sm mt-1 uppercase tracking-widest font-bold">
            {allPayments.length} records · {properties.length} properties
          </p>
        </div>
      </motion.div>

      {/* Summary Stat Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Revenue', value: totalPaid, color: 'text-[#52b788]', bg: 'bg-[#1a3c2e]/10', border: 'border-[#2d6a4f]/20', icon: TrendingUp, accent: 'bg-[#52b788]' },
          { label: 'Pending Payout', value: totalPending, color: 'text-[#f0c040]', bg: 'bg-[#2d2510]/10', border: 'border-[#3d3215]/20', icon: Clock, accent: 'bg-[#f0c040]' },
          { label: 'Calculated Arrears', value: totalLate, color: 'text-[#e74c3c]', bg: 'bg-[#2d1a1a]/10', border: 'border-[#3d2020]/20', icon: AlertCircle, accent: 'bg-[#e74c3c]' },
        ].map(({ label, value, color, bg, border, icon: Icon, accent }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`stat-card border-l-4 p-6 bg-[#0d1215] ${border} relative overflow-hidden group`}
            style={{ borderLeftColor: accent === 'bg-[#52b788]' ? '#52b788' : accent === 'bg-[#f0c040]' ? '#f0c040' : '#e74c3c' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center text-current`}>
                <Icon size={18} className={color} />
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight size={16} className="text-[#4a5568]" />
              </div>
            </div>
            <div>
              <p className={`font-display text-2xl font-bold tracking-tight ${color}`}>{fmt(value)}</p>
              <p className="font-body text-[10px] text-[#4a5568] mt-1 uppercase tracking-widest font-bold">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-[#0d1215] p-3 rounded-2xl border border-[#1e2a2e]">
        <div className="flex gap-2 p-1 bg-[#141b1e] rounded-xl overflow-x-auto no-scrollbar">
          {['all', 'paid', 'pending', 'late'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === f
                  ? 'bg-[#1a3c2e] text-[#52b788] shadow-sm'
                  : 'text-[#4a5568] hover:text-[#8a9ba8]'
                }`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden xl:block h-6 w-px bg-[#1e2a2e]" />
          <select
            className="w-full xl:w-64 h-12 bg-[#141b1e] border border-[#1e2a2e] rounded-xl px-4 text-[#e8e4de] font-body text-sm focus:outline-none focus:border-[#52b788]"
            value={propFilter}
            onChange={e => setPropFilter(e.target.value)}
          >
            <option value="all">Display All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      {loading ? (
        <div className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e]">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 border-b border-[#1e2a2e]/50 animate-pulse bg-[#141b1e]/20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-24 flex flex-col items-center text-center bg-[#0d1215] border-2 border-dashed border-[#1e2a2e]">
          <div className="w-16 h-16 rounded-3xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center mb-6 text-[#1e2a2e]">
            <CreditCard size={32} />
          </div>
          <h3 className="font-display text-[#e8e4de] text-xl font-bold mb-2 tracking-tight">No Transactions Recorded</h3>
          <p className="font-body text-[#4a5568] text-sm max-w-xs mx-auto mb-8 font-medium">
            {allPayments.length === 0
              ? 'Real-time billing cycles will populate this ledger as tenants initiate transfers.'
              : 'The current filters do not match any transaction history.'}
          </p>
          {allPayments.length === 0 && (
            <Link to="/properties" className="btn-primary px-8 flex items-center gap-2">
              Setup My First Property <ChevronRight size={16} />
            </Link>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e] shadow-2xl">
          <div className="flex items-center gap-4 px-6 py-4 bg-[#141b1e] border-b border-[#1e2a2e] text-[10px] font-bold text-[#4a5568] uppercase tracking-[0.2em]">
            <span className="flex-1">Payer Identity / Location</span>
            <span className="w-32 text-right hidden sm:block">Fulfillment Date</span>
            <span className="w-24 text-right hidden md:block">Channel</span>
            <span className="w-20 text-center">Outcome</span>
            <span className="w-32 text-right">Gross Amount</span>
          </div>
          <div className="divide-y divide-[#1e2a2e]/50">
            {filtered.map((p, i) => (
              <PaymentRow
                key={`${p.id}-${p.propertyId}`}
                payment={p}
                isLast={i === filtered.length - 1}
                showProperty
                onDownloadInvoice={generateInvoicePdf}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

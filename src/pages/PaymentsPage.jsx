// src/pages/PaymentsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeProperties, subscribePayments } from '../services/firebase';
import PaymentRow from '../components/PaymentRow';
import { generateInvoicePdf } from '../utils/invoicePdf';

export default function PaymentsPage() {
  const { user } = useAuth();
  const { fmt } = useLocale();

  const [properties,  setProperties]  = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');
  const [propFilter,  setPropFilter]  = useState('all');

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

  const filtered     = allPayments.filter(p => (filter === 'all' || p.status === filter) && (propFilter === 'all' || p.propertyId === propFilter));
  const totalPaid    = allPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = allPayments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totalLate    = allPayments.filter(p => p.status === 'late').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-ink text-3xl font-semibold">Payments</h1>
          <p className="font-body text-stone-400 text-sm mt-0.5">{allPayments.length} records across {properties.length} properties</p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Collected', value: totalPaid,    color: 'text-sage',  bg: 'bg-sage/10',  icon: TrendingUp },
          { label: 'Pending',         value: totalPending, color: 'text-amber', bg: 'bg-amber/10', icon: CreditCard },
          { label: 'Late',            value: totalLate,    color: 'text-rust',  bg: 'bg-rust/10',  icon: CreditCard },
        ].map(({ label, value, color, bg, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={`font-display text-2xl font-semibold ${color}`}>{fmt(value)}</p>
              <p className="font-body text-xs text-stone-400 mt-0.5">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {['all', 'paid', 'pending', 'late'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-body font-medium border capitalize transition-all
                ${filter === f ? 'bg-ink text-cream border-ink' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-stone-200" />
        <select className="text-sm font-body border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-500 focus:outline-none focus:border-sage transition-colors"
          value={propFilter} onChange={e => setPropFilter(e.target.value)}>
          <option value="all">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card overflow-hidden">
          {[1,2,3,4].map(i => <div key={i} className="h-16 border-b border-stone-100 animate-pulse bg-stone-50/50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 flex flex-col items-center text-center border-2 border-dashed border-stone-200">
          <CreditCard size={40} className="text-stone-300 mb-3" />
          <p className="font-body font-medium text-stone-500">No payments found</p>
          <p className="font-body text-xs text-stone-300 mt-1">
            {allPayments.length === 0
              ? 'Payments will appear here automatically after tenants pay online.'
              : 'Try adjusting your filters.'}
          </p>
          {allPayments.length === 0 && (
            <Link to="/properties" className="btn-secondary mt-4 text-sm">Go to Properties <ChevronRight size={14} /></Link>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 bg-stone-50 border-b border-stone-100 text-xs font-body font-semibold text-stone-400 uppercase tracking-wider">
            <span className="flex-1">Tenant / Property</span>
            <span className="w-28 text-right hidden sm:block">Date</span>
            <span className="w-24 text-right hidden md:block">Method</span>
            <span className="w-20 text-right">Status</span>
            <span className="w-28 text-right">Amount</span>
          </div>
          {filtered.map((p, i) => (
            <PaymentRow
              key={`${p.id}-${p.propertyId}`}
              payment={p}
              isLast={i === filtered.length - 1}
              showProperty
              onDownloadInvoice={generateInvoicePdf}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

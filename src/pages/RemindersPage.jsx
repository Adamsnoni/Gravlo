// src/pages/RemindersPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, CheckCircle, Clock, AlertTriangle, ArrowRight, Activity, Calendar, Hash, User, DollarSign, X } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeReminders, addReminder, updateReminder, deleteReminder, subscribeProperties } from '../services/firebase';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const URGENCY = {
  overdue: { label: 'Settlement Overdue', color: 'text-[#e74c3c]', bg: 'bg-[#fff5f5]', border: 'border-[#fee2e2]', icon: AlertTriangle },
  urgent: { label: 'High Priority', color: 'text-[#e74c3c]', bg: 'bg-[#fff5f5]', border: 'border-[#fee2e2]', icon: Clock },
  soon: { label: 'Upcoming Date', color: 'text-[#c8691a]', bg: 'bg-[#fef9ed]', border: 'border-[#f5e0b8]', icon: Bell },
  ok: { label: 'Routine Reminder', color: 'text-[#1a6a3c]', bg: 'bg-[#f4fbf7]', border: 'border-[#ddf0e6]', icon: CheckCircle },
  paid: { label: 'Settled Record', color: 'text-[#94a3a8]', bg: 'bg-[#fcfdfc]', border: 'border-[#f0f7f2]', icon: CheckCircle },
};

function getUrgency(r) {
  if (r.status === 'paid') return 'paid';
  const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
  if (isPast(d)) return 'overdue';
  const days = differenceInDays(d, new Date());
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'soon';
  return 'ok';
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: "easeOut" },
});

export default function RemindersPage() {
  const { user } = useAuth();
  const { fmt, currencySymbol } = useLocale();

  const [reminders, setReminders] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);

  const emptyForm = { tenantName: '', propertyId: '', amount: '', dueDate: '', recurring: false, notifyDaysBefore: 3, notes: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeReminders(user.uid, d => { setReminders(d); setLoading(false); });
    const u2 = subscribeProperties(user.uid, setProperties);
    return () => { u1(); u2(); };
  }, [user]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handlePropertySelect = (e) => {
    const pid = e.target.value;
    const p = properties.find(x => x.id === pid);
    setForm(f => ({ ...f, propertyId: pid, tenantName: p?.tenantName || f.tenantName, amount: p?.monthlyRent ? String(p.monthlyRent) : f.amount }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.dueDate) { toast.error('Required fields: Amount and Maturity Date.'); return; }
    setSaving(true);
    try {
      const propName = properties.find(p => p.id === form.propertyId)?.name || '';
      await addReminder(user.uid, { ...form, amount: parseFloat(form.amount), dueDate: new Date(form.dueDate), propertyName: propName });
      toast.success('Protocol established.');
      setShowModal(false);
      setForm(emptyForm);
    } catch { toast.error('Failed to commit procedure.'); }
    finally { setSaving(false); }
  };

  const handleMarkPaid = async (r) => {
    await updateReminder(user.uid, r.id, { status: 'paid', paidAt: new Date() });
    toast.success('Settlement verified.');
  };

  const handleDelete = async (r) => {
    setReminderToDelete(r);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const r = reminderToDelete;
    if (!r) return;
    setShowDeleteConfirm(false);
    try {
      await deleteReminder(user.uid, r.id);
      toast.success('Alert archived.');
    } catch {
      toast.error('Archive failed.');
    } finally {
      setReminderToDelete(null);
    }
  };

  const filtered = filter === 'all' ? reminders : reminders.filter(r => getUrgency(r) === filter);
  const counts = { overdue: 0, urgent: 0, soon: 0, ok: 0 };
  reminders.forEach(r => { const k = getUrgency(r); if (counts[k] !== undefined) counts[k]++; });
  const totalDue = reminders.filter(r => r.status !== 'paid').reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12 animate-slide-up">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[#6b8a7a] font-bold text-xs uppercase tracking-[0.15em] mb-2">Portfolio Vigilance</p>
          <h1 className="font-fraunces text-[#1a2e22] text-4xl font-black tracking-tight leading-none italic">
            Management Alerts
          </h1>
          <p className="text-[#94a3a8] font-medium text-sm mt-3 flex items-center gap-2">
            <Activity size={16} /> Monitoring {reminders.filter(r => r.status !== 'paid').length} active settlement cycles
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowModal(true); }}
          className="btn-primary px-8 py-4 shadow-xl shadow-[#1a6a3c]/20"
        >
          <Plus size={18} strokeWidth={3} className="mr-2" /> Establish New Protocol
        </button>
      </motion.div>

      {/* Critical Status Alert */}
      {counts.overdue > 0 && (
        <motion.div {...fadeUp(0.05)} className="card p-6 bg-[#fff5f5] border border-[#fee2e2] flex items-center gap-6 relative overflow-hidden group">
          <div className="absolute top-[-20px] left-[-20px] opacity-[0.05] transform rotate-12 transition-transform group-hover:rotate-45 duration-700 text-[#e74c3c]">
            <AlertTriangle size={120} />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#e74c3c] shadow-sm shrink-0">
            <AlertTriangle size={24} strokeWidth={2.5} />
          </div>
          <div className="relative z-10">
            <h4 className="font-fraunces text-[#1a2e22] text-lg font-black italic">{counts.overdue} Overdue Settlements Detected</h4>
            <p className="text-[#e74c3c] text-xs font-bold uppercase tracking-widest mt-1 italic">Immediate intervention protocol recommended.</p>
          </div>
        </motion.div>
      )}

      {/* Filter Scope */}
      <div className="flex bg-[#fcfdfc] p-1.5 rounded-[1.25rem] border border-[#f0f7f2] shadow-sm overflow-x-auto no-scrollbar max-w-fit">
        {[
          { key: 'all', label: 'Global Registry', count: reminders.length },
          { key: 'overdue', label: 'Overdue', count: counts.overdue },
          { key: 'urgent', label: 'High Priority', count: counts.urgent },
          { key: 'soon', label: 'Soon', count: counts.soon },
          { key: 'ok', label: 'Upcoming', count: counts.ok },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === key ? 'bg-[#1a3c2e] text-white shadow-md' : 'text-[#6b8a7a] hover:text-[#1a6a3c]'}`}
          >
            {label}
            {count > 0 && (
              <span className={`px-2 py-0.5 rounded-lg text-[9px] ${filter === key ? 'bg-white/20 text-white' : 'bg-[#e8f5ee] text-[#1a6a3c]'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="card h-24 animate-pulse bg-white/50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div {...fadeUp(0.1)} className="card p-24 flex flex-col items-center text-center bg-[#fcfdfc]/50 border-2 border-dashed border-[#ddf0e6]">
          <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-[#cce8d8] mb-6 shadow-sm border border-[#f0f7f2]">
            <Bell size={40} strokeWidth={1.5} />
          </div>
          <h2 className="font-fraunces text-[#1a2e22] text-2xl font-black mb-2 italic">Registry Empty</h2>
          <p className="text-[#6b8a7a] font-medium max-w-sm">
            {filter === 'all' ? "No active settlement alerts have been configured for your portfolio." : `No procedures match the "${filter}" classification.`}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.map((r, idx) => {
              const urg = getUrgency(r);
              const U = URGENCY[urg];
              const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
              const days = differenceInDays(d, new Date());
              const isPaid = urg === 'paid';

              return (
                <motion.div
                  key={r.id}
                  {...fadeUp(0.1 + idx * 0.05)}
                  layout
                  className={`card p-8 group overflow-hidden bg-white border-[#f0f7f2] hover:border-[#1a6a3c]/30 hover:shadow-2xl transition-all relative ${isPaid ? 'opacity-60 grayscale-[0.5]' : ''}`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] transform translate-x-10 translate-y-[-10px] rotate-12 group-hover:rotate-45 transition-transform duration-700 text-[#1a6a3c]`}>
                    <Bell size={120} />
                  </div>

                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-14 h-14 rounded-2xl ${U.bg} ${U.border} border flex items-center justify-center ${U.color} flex-shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                        <U.icon size={28} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-fraunces font-black text-[#1a2e22] text-xl truncate mb-1 italic leading-none">{r.tenantName || 'Subject Account'}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-[#6b8a7a] uppercase tracking-widest bg-[#f4fbf7] border border-[#ddf0e6] px-2 py-0.5 rounded-lg">
                            {r.propertyName || 'Portfolio Asset'}
                          </span>
                          {r.recurring && (
                            <span className="text-[9px] font-black text-[#1a6a3c] uppercase tracking-widest bg-[#e8f5ee] px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Calendar size={10} /> Monthly
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-[#fcfdfc] border border-[#f0f7f2]">
                      <p className="text-[8px] font-black text-[#94a3a8] uppercase tracking-[0.2em] mb-1">Settlement Deadline</p>
                      <p className={`font-bold text-sm ${isPast(d) && !isPaid ? 'text-[#e74c3c]' : 'text-[#1a2e22]'}`}>{format(d, 'MMM d, yyyy')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#fcfdfc] border border-[#f0f7f2]">
                      <p className="text-[8px] font-black text-[#94a3a8] uppercase tracking-[0.2em] mb-1">Maturity Val</p>
                      <p className="font-fraunces font-black text-[#1a2e22] text-lg leading-none italic">{fmt(r.amount || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-[#f0f7f2]">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white border border-[#f0f7f2] shadow-inner text-[#94a3a8]">
                      <Clock size={12} strokeWidth={3} />
                      {isPaid ? 'Settled' : days === 0 ? 'Matures Today' : days > 0 ? `${days} Days Remaining` : 'Past Due Term'}
                    </div>

                    {!isPaid && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleMarkPaid(r)} className="bg-[#e8f5ee] text-[#1a6a3c] font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-xl border border-[#ddf0e6] hover:bg-[#1a3c2e] hover:text-white transition-all shadow-sm">
                          Authorize Settlement
                        </button>
                        <button onClick={() => handleDelete(r)} className="w-10 h-10 rounded-xl bg-white border border-[#f0f7f2] flex items-center justify-center text-[#94a3a8] hover:bg-[#e74c3c] hover:text-white transition-all shadow-sm">
                          <Trash2 size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Protocol Establishment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Establish Alert Protocol"
        size="md"
      >
        <form onSubmit={handleSave} className="p-2 space-y-8">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Target Asset Correlation *</label>
              <div className="relative">
                <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#cce8d8] pointer-events-none" strokeWidth={3} />
                <select className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl pl-12 pr-5 py-4 text-[#1a2e22] font-semibold text-sm focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] transition-all appearance-none cursor-pointer" value={form.propertyId} onChange={handlePropertySelect}>
                  <option value="">— Select Portfolio Asset —</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Account Reference</label>
                <div className="relative">
                  <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#cce8d8]" strokeWidth={3} />
                  <input className="w-full bg-[#fcfdfc] border border-[#f0f7f2] rounded-2xl pl-12 pr-5 py-4 text-[#1a2e22] font-semibold text-sm opacity-60" value={form.tenantName || 'Standard Account'} readOnly />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Settlement Val ({currencySymbol}) *</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1a6a3c] font-black text-sm">{currencySymbol}</div>
                  <input className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl pl-12 pr-5 py-4 text-[#1a2e22] font-black text-base focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] transition-all" type="number" placeholder="0" value={form.amount} onChange={set('amount')} required />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Maturity Target *</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#cce8d8]" strokeWidth={3} />
                  <input className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl pl-12 pr-5 py-4 text-[#1a2e22] font-semibold text-sm focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] transition-all" type="date" value={form.dueDate} onChange={set('dueDate')} required />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Advance Escalation</label>
                <div className="flex items-center gap-4 py-3.5 px-5 bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl">
                  <input type="range" min={1} max={14} value={form.notifyDaysBefore} onChange={e => setForm(f => ({ ...f, notifyDaysBefore: parseInt(e.target.value) }))} className="flex-1 accent-[#1a6a3c]" />
                  <span className="font-fraunces font-black text-[#1a2e22] text-sm italic w-8 text-right">{form.notifyDaysBefore}d</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#f4fbf7]/50 border border-[#ddf0e6]">
              <input type="checkbox" id="rec-landlord" checked={form.recurring} onChange={set('recurring')} className="w-5 h-5 rounded-lg accent-[#1a6a3c] cursor-pointer" />
              <label htmlFor="rec-landlord" className="text-xs font-bold text-[#1a6a3c] cursor-pointer italic">Replicate protocol on a monthly cycle (Recurring Alert)</label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-4 text-base order-1 sm:order-2">
              {saving ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" /> : <span className="flex items-center gap-2">Authorize Protocol <Plus size={18} strokeWidth={3} /></span>}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-4 text-base order-2 sm:order-1 border-transparent hover:bg-gray-100">
              Discard
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Archive Procedure" size="sm">
        <div className="p-8 text-center font-plus">
          <div className="w-16 h-16 bg-[#fff5f5] text-[#e74c3c] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#fee2e2]">
            <Trash2 size={32} strokeWidth={2.5} />
          </div>
          <h3 className="font-fraunces text-2xl font-black text-[#1a2e22] mb-3 italic">Terminate Alert?</h3>
          <p className="text-[#6b8a7a] font-medium text-sm mb-8 leading-relaxed">
            Are you sure you want to archive the settlement alert for <span className="font-bold text-[#1a2e22]">{reminderToDelete?.tenantName}</span>? This procedure will be removed from your active registry.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={confirmDelete} className="w-full btn-primary py-4 bg-[#e74c3c] border-[#e74c3c] hover:bg-black hover:border-black text-white shadow-xl shadow-red-100 uppercase tracking-widest text-[10px] font-black">
              Confirm Archive
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="w-full btn-secondary py-4 text-[10px] font-black uppercase tracking-widest border-transparent hover:bg-gray-100">
              Disregard
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

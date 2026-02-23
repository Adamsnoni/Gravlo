// src/pages/RemindersPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeReminders, addReminder, updateReminder, deleteReminder, subscribeProperties } from '../services/firebase';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const URGENCY = {
  overdue: { label: 'Overdue',  color: 'text-rust',      bg: 'bg-rust/10',   border: 'border-rust/20',   dot: 'bg-rust'      },
  urgent:  { label: 'Urgent',   color: 'text-rust',      bg: 'bg-rust/8',    border: 'border-rust/15',   dot: 'bg-rust/70'   },
  soon:    { label: 'Soon',     color: 'text-amber',     bg: 'bg-amber/10',  border: 'border-amber/20',  dot: 'bg-amber'     },
  ok:      { label: 'Upcoming', color: 'text-sage',      bg: 'bg-sage/8',    border: 'border-sage/15',   dot: 'bg-sage'      },
  paid:    { label: 'Paid',     color: 'text-stone-400', bg: 'bg-stone-100', border: 'border-stone-200', dot: 'bg-stone-300' },
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

export default function RemindersPage() {
  const { user } = useAuth();
  const { fmt, currencySymbol } = useLocale();

  const [reminders,  setReminders]  = useState([]);
  const [properties, setProperties] = useState([]);
  const [filter,     setFilter]     = useState('all');
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [saving,     setSaving]     = useState(false);

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
    if (!form.tenantName || !form.amount || !form.dueDate) { toast.error('Please fill all required fields.'); return; }
    setSaving(true);
    try {
      const propName = properties.find(p => p.id === form.propertyId)?.name || '';
      await addReminder(user.uid, { ...form, amount: parseInt(form.amount), dueDate: new Date(form.dueDate), propertyName: propName });
      toast.success('Reminder created!');
      setShowModal(false);
      setForm(emptyForm);
    } catch { toast.error('Failed to create reminder.'); }
    finally { setSaving(false); }
  };

  const handleMarkPaid = async (r) => {
    await updateReminder(user.uid, r.id, { status: 'paid', paidAt: new Date() });
    toast.success('Marked as paid!');
  };

  const handleDelete = async (r) => {
    if (!confirm(`Delete reminder for ${r.tenantName}?`)) return;
    await deleteReminder(user.uid, r.id);
    toast.success('Reminder deleted.');
  };

  const filtered  = filter === 'all' ? reminders : reminders.filter(r => getUrgency(r) === filter);
  const counts    = { overdue: 0, urgent: 0, soon: 0, ok: 0 };
  reminders.forEach(r => { const k = getUrgency(r); if (counts[k] !== undefined) counts[k]++; });
  const totalDue  = reminders.filter(r => r.status !== 'paid').reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-ink text-3xl font-semibold">Reminders</h1>
          <p className="font-body text-stone-400 text-sm mt-0.5">
            {reminders.filter(r => r.status !== 'paid').length} active · {fmt(totalDue)} outstanding
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> New Reminder
        </button>
      </motion.div>

      {/* Overdue alert */}
      {counts.overdue > 0 && (
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 p-4 bg-rust/8 border border-rust/20 rounded-xl">
          <AlertTriangle size={18} className="text-rust flex-shrink-0" />
          <div>
            <p className="font-body font-semibold text-sm text-rust">{counts.overdue} overdue reminder{counts.overdue > 1 ? 's' : ''}</p>
            <p className="font-body text-xs text-stone-400">Follow up with tenants immediately.</p>
          </div>
        </motion.div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',     label: 'All',      count: reminders.length },
          { key: 'overdue', label: 'Overdue',  count: counts.overdue   },
          { key: 'urgent',  label: 'Urgent',   count: counts.urgent    },
          { key: 'soon',    label: 'Soon',     count: counts.soon      },
          { key: 'ok',      label: 'Upcoming', count: counts.ok        },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body font-medium border transition-all
              ${filter === key ? 'bg-ink text-cream border-ink' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
            {label}
            {count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${filter === key ? 'bg-white/15 text-cream' : 'bg-stone-100 text-stone-500'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-stone-100" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 flex flex-col items-center text-center border-2 border-dashed border-stone-200">
          <Bell size={40} className="text-stone-300 mb-3" />
          <p className="font-body font-medium text-stone-500">{filter === 'all' ? 'No reminders yet' : `No ${filter} reminders`}</p>
          <p className="font-body text-xs text-stone-300 mt-1">{filter === 'all' && 'Create reminders to track rent due dates.'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <AnimatePresence>
            {filtered.map((r) => {
              const urg = getUrgency(r);
              const U   = URGENCY[urg];
              const d   = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
              const days  = differenceInDays(d, new Date());
              const isPaid = urg === 'paid';

              return (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: isPaid ? 0.6 : 1 }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-stone-100 last:border-0 hover:bg-stone-50/70 transition-colors group">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${U.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-body font-semibold text-sm text-ink">{r.tenantName}</span>
                      {r.propertyName && <span className="font-body text-xs text-stone-400">{r.propertyName}</span>}
                      {r.recurring && <span className="font-body text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-400">Monthly</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`font-body text-xs font-medium px-2 py-0.5 rounded-full border ${U.bg} ${U.color} ${U.border}`}>
                        {isPaid ? 'Paid' : isPast(d) ? 'Overdue' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days}d`}
                      </span>
                      <span className="font-body text-xs text-stone-400">
                        <Clock size={11} className="inline mr-1" />{format(d, 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-semibold text-lg text-ink">{fmt(r.amount || 0)}</p>
                  </div>
                  {!isPaid && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleMarkPaid(r)}
                        className="flex items-center gap-1.5 text-xs font-body font-medium px-3 py-1.5 rounded-lg bg-sage/10 text-sage border border-sage/20 hover:bg-sage/20 transition-colors">
                        <CheckCircle size={13} /> Paid
                      </button>
                      <button onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg bg-rust/8 text-rust border border-rust/15 hover:bg-rust/15 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Rent Reminder">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-xs">Link to Property (optional)</label>
            <select className="input-base" value={form.propertyId} onChange={handlePropertySelect}>
              <option value="">— Select property —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-xs">Tenant Name *</label>
              <input className="input-base" placeholder="Full name" value={form.tenantName} onChange={set('tenantName')} required />
            </div>
            <div>
              <label className="label-xs">Amount ({currencySymbol}) *</label>
              <input className="input-base" type="number" placeholder="e.g. 250000" value={form.amount} onChange={set('amount')} required />
            </div>
            <div>
              <label className="label-xs">Due Date *</label>
              <input className="input-base" type="date" value={form.dueDate} onChange={set('dueDate')} required />
            </div>
            <div>
              <label className="label-xs">Notify N days before</label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={14} value={form.notifyDaysBefore}
                  onChange={e => setForm(f => ({ ...f, notifyDaysBefore: parseInt(e.target.value) }))}
                  className="flex-1 accent-sage" />
                <span className="font-mono text-sm font-medium text-ink w-8 text-right">{form.notifyDaysBefore}d</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="recurring" checked={form.recurring} onChange={set('recurring')} className="w-4 h-4 rounded accent-sage" />
            <label htmlFor="recurring" className="font-body text-sm text-ink cursor-pointer">Recurring monthly reminder</label>
          </div>
          <div>
            <label className="label-xs">Notes (optional)</label>
            <input className="input-base" placeholder="Any additional notes…" value={form.notes} onChange={set('notes')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" /> : <><Plus size={15} /> Create Reminder</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

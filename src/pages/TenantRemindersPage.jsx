// src/pages/TenantRemindersPage.jsx
// Tenants set personalized rent reminders with custom lead times and notification channels
// (email, SMS, in-app). All amounts use the user's locale/currency.
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, CheckCircle, Clock, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import {
  subscribeReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  subscribeTenantProperties,
} from '../services/firebase';
import {
  LEAD_TIME_OPTIONS,
  getLeadTimeLabel,
  getReminderNotifyDate,
  shouldNotifyToday,
} from '../utils/reminderLeadTimes';
import { getShortUnitId } from '../utils/unitDisplay';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const URGENCY = {
  overdue: { label: 'Overdue',  color: 'text-rust',      bg: 'bg-rust/10',   dot: 'bg-rust' },
  urgent:  { label: 'Urgent',   color: 'text-rust',      bg: 'bg-rust/8',    dot: 'bg-rust/70' },
  soon:   { label: 'Soon',     color: 'text-amber',     bg: 'bg-amber/10',  dot: 'bg-amber' },
  ok:     { label: 'Upcoming', color: 'text-sage',      bg: 'bg-sage/8',    dot: 'bg-sage' },
  paid:   { label: 'Paid',     color: 'text-stone-400', bg: 'bg-stone-100', dot: 'bg-stone-300' },
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

const emptyForm = {
  propertyId: '',
  dueDate: '',
  amount: '',
  leadTimeDays: 7,
  recurring: false,
  notifyEmail: true,
  notifySms: false,
  notifyInApp: true,
  notes: '',
};

export default function TenantRemindersPage() {
  const { user, profile } = useAuth();
  const { fmt, currencySymbol } = useLocale();

  const [reminders, setReminders] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeReminders(user.uid, (d) => {
      setReminders(d.filter((r) => r.createdBy === 'tenant'));
      setLoading(false);
    });
    const u2 = user.email ? subscribeTenantProperties(user.email, setProperties) : undefined;
    return () => {
      u1?.();
      u2?.();
    };
  }, [user?.uid, user?.email]);

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const handlePropertySelect = (e) => {
    const pid = e.target.value;
    const p = properties.find((x) => x.id === pid);
    setForm((f) => ({
      ...f,
      propertyId: pid,
      propertyName: p?.name ?? '',
      propertyUnitNumber: p?.unitNumber ?? '',
      propertyBuildingName: p?.buildingName ?? '',
      propertyFloor: p?.floor ?? '',
      amount: p?.monthlyRent != null ? String(p.monthlyRent) : f.amount,
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + 1);
    setForm({
      ...emptyForm,
      dueDate: format(nextDue, 'yyyy-MM-dd'),
      propertyId: properties[0]?.id ?? '',
      propertyName: properties[0]?.name ?? '',
      amount: properties[0]?.monthlyRent != null ? String(properties[0].monthlyRent) : '',
    });
    setShowModal(true);
  };

  const openEdit = (r) => {
    const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
    setEditingId(r.id);
    setForm({
      propertyId: r.propertyId ?? '',
      propertyName: r.propertyName ?? '',
      propertyUnitNumber: r.propertyUnitNumber ?? '',
      propertyBuildingName: r.propertyBuildingName ?? '',
      propertyFloor: r.propertyFloor ?? '',
      dueDate: format(d, 'yyyy-MM-dd'),
      amount: r.amount != null ? String(r.amount) : '',
      leadTimeDays: r.leadTimeDays ?? 7,
      recurring: !!r.recurring,
      notifyEmail: r.notifyEmail !== false,
      notifySms: !!r.notifySms,
      notifyInApp: r.notifyInApp !== false,
      notes: r.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.propertyId || !form.amount || !form.dueDate) {
      toast.error('Please select a home, amount, and due date.');
      return;
    }
    setSaving(true);
    try {
      const prop = properties.find((p) => p.id === form.propertyId);
      const payload = {
        propertyId: form.propertyId,
        propertyName: form.propertyName || prop?.name,
        propertyUnitNumber: form.propertyUnitNumber || prop?.unitNumber || '',
        propertyBuildingName: form.propertyBuildingName || prop?.buildingName || '',
        propertyFloor: form.propertyFloor || prop?.floor || '',
        amount: parseInt(form.amount, 10) || 0,
        dueDate: new Date(form.dueDate),
        leadTimeDays: parseInt(form.leadTimeDays, 10) || 7,
        recurring: !!form.recurring,
        notifyEmail: !!form.notifyEmail,
        notifySms: !!form.notifySms,
        notifyInApp: !!form.notifyInApp,
        notes: (form.notes || '').trim(),
        createdBy: 'tenant',
        tenantName: profile?.fullName || user?.displayName || '',
        tenantEmail: user?.email || '',
      };
      if (editingId) {
        await updateReminder(user.uid, editingId, payload);
        toast.success('Reminder updated.');
      } else {
        await addReminder(user.uid, payload);
        toast.success('Reminder created! You’ll get notified by your chosen channels.');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch {
      toast.error('Failed to save reminder.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (r) => {
    await updateReminder(user.uid, r.id, { status: 'paid', paidAt: new Date() });
    toast.success('Marked as paid.');
  };

  const handleDelete = async (r) => {
    if (!confirm(`Delete reminder for ${r.propertyName || 'this home'}?`)) return;
    await deleteReminder(user.uid, r.id);
    toast.success('Reminder deleted.');
  };

  const filtered =
    filter === 'all' ? reminders : reminders.filter((r) => getUrgency(r) === filter);
  const counts = { overdue: 0, urgent: 0, soon: 0, ok: 0 };
  reminders.forEach((r) => {
    const k = getUrgency(r);
    if (counts[k] !== undefined) counts[k]++;
  });
  const totalDue = reminders
    .filter((r) => r.status !== 'paid')
    .reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="font-display text-ink text-3xl font-semibold">Rent reminders</h1>
          <p className="font-body text-stone-400 text-sm mt-0.5">
            Set custom lead times and get notified by email, SMS, or in-app. Your currency:{' '}
            <strong className="text-sage">{currencySymbol}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={properties.length === 0}
          className="btn-primary"
        >
          <Plus size={16} /> New reminder
        </button>
      </motion.div>

      {properties.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 bg-amber/8 border border-amber/20 rounded-xl"
        >
          <Bell size={18} className="text-amber flex-shrink-0" />
          <p className="font-body text-sm text-stone-600">
            Add a home first: ask your landlord to link your email to a property. Then you can set
            reminders here.
          </p>
        </motion.div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All', count: reminders.length },
          { key: 'overdue', label: 'Overdue', count: counts.overdue },
          { key: 'urgent', label: 'Urgent', count: counts.urgent },
          { key: 'soon', label: 'Soon', count: counts.soon },
          { key: 'ok', label: 'Upcoming', count: counts.ok },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body font-medium border transition-all ${
              filter === key
                ? 'bg-ink text-cream border-ink'
                : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
            }`}
          >
            {label}
            {count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  filter === key ? 'bg-white/15 text-cream' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-stone-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 flex flex-col items-center text-center border-2 border-dashed border-stone-200">
          <Bell size={40} className="text-stone-300 mb-3" />
          <p className="font-body font-medium text-stone-500">
            {filter === 'all' ? 'No reminders yet' : `No ${filter} reminders`}
          </p>
          <p className="font-body text-xs text-stone-300 mt-1">
            {filter === 'all' && 'Create a reminder to get email, SMS, or in-app alerts before rent is due.'}
          </p>
          {properties.length > 0 && filter === 'all' && (
            <button type="button" onClick={openCreate} className="btn-primary mt-4">
              <Plus size={15} /> New reminder
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <AnimatePresence>
            {filtered.map((r) => {
              const urg = getUrgency(r);
              const U = URGENCY[urg];
              const d = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
              const days = differenceInDays(d, new Date());
              const isPaid = urg === 'paid';
              const notifyDate = getReminderNotifyDate(d, r.leadTimeDays);
              const showInAppToday = !isPaid && shouldNotifyToday(r.dueDate, r.leadTimeDays);

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isPaid ? 0.6 : 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-stone-100 last:border-0 hover:bg-stone-50/70 transition-colors group"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${U.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-body font-semibold text-sm text-ink">
                        {r.propertyName || 'Rent'}
                        {r.propertyUnitNumber && (
                          <span className="text-sage ml-1 font-normal">
                            ({getShortUnitId({
                              unitNumber: r.propertyUnitNumber,
                              floor: r.propertyFloor,
                            })})
                          </span>
                        )}
                      </span>
                      {r.recurring && (
                        <span className="font-body text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-400">
                          Monthly
                        </span>
                      )}
                      {showInAppToday && (
                        <span className="font-body text-xs px-2 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30">
                          Reminder today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span
                        className={`font-body text-xs font-medium px-2 py-0.5 rounded-full border ${U.bg} ${U.color}`}
                      >
                        {isPaid
                          ? 'Paid'
                          : isPast(d)
                            ? 'Overdue'
                            : days === 0
                              ? 'Due today'
                              : days === 1
                                ? 'Due tomorrow'
                                : `Due in ${days}d`}
                      </span>
                      <span className="font-body text-xs text-stone-400">
                        Notify: {getLeadTimeLabel(r.leadTimeDays)} ({format(notifyDate, 'MMM d')})
                      </span>
                      <span className="flex items-center gap-1.5 text-stone-400">
                        {r.notifyEmail && <Mail size={11} title="Email" />}
                        {r.notifySms && <MessageSquare size={11} title="SMS" />}
                        {r.notifyInApp && <Smartphone size={11} title="In-app" />}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-semibold text-lg text-ink">
                      {fmt(r.amount || 0)}
                    </p>
                  </div>
                  {!isPaid && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="text-xs font-body font-medium px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(r)}
                        className="flex items-center gap-1.5 text-xs font-body font-medium px-3 py-1.5 rounded-lg bg-sage/10 text-sage border border-sage/20 hover:bg-sage/20"
                      >
                        <CheckCircle size={13} /> Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg bg-rust/8 text-rust border border-rust/15 hover:bg-rust/15"
                      >
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

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingId(null);
          setForm(emptyForm);
        }}
        title={editingId ? 'Edit reminder' : 'New rent reminder'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-xs">Home (property) *</label>
            <select
              className="input-base"
              value={form.propertyId}
              onChange={handlePropertySelect}
              required
            >
              <option value="">— Select home —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.unitNumber ? ` - ${getShortUnitId(p)}` : ''} — {fmt(p.monthlyRent || 0)}/month
              </option>
            ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-xs">Due date *</label>
              <input
                className="input-base"
                type="date"
                value={form.dueDate}
                onChange={set('dueDate')}
                required
              />
            </div>
            <div>
              <label className="label-xs">Amount ({currencySymbol}) *</label>
              <input
                className="input-base"
                type="number"
                placeholder="e.g. 250000"
                value={form.amount}
                onChange={set('amount')}
                required
              />
            </div>
          </div>
          <div>
            <label className="label-xs">Remind me</label>
            <select
              className="input-base"
              value={form.leadTimeDays}
              onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: parseInt(e.target.value, 10) }))}
            >
              {LEAD_TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="font-body text-xs text-stone-400 mt-1">
              You’ll get notified at this time before the due date.
            </p>
          </div>
          <div>
            <p className="label-xs mb-2">Notify me via</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifyEmail}
                  onChange={set('notifyEmail')}
                  className="w-4 h-4 rounded accent-sage"
                />
                <Mail size={14} className="text-stone-400" />
                <span className="font-body text-sm">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifySms}
                  onChange={set('notifySms')}
                  className="w-4 h-4 rounded accent-sage"
                />
                <MessageSquare size={14} className="text-stone-400" />
                <span className="font-body text-sm">SMS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifyInApp}
                  onChange={set('notifyInApp')}
                  className="w-4 h-4 rounded accent-sage"
                />
                <Smartphone size={14} className="text-stone-400" />
                <span className="font-body text-sm">In-app</span>
              </label>
            </div>
            <p className="font-body text-xs text-stone-400 mt-1">
              In-app alerts show when you open LeaseEase. Email and SMS require your landlord to enable notifications.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring-tenant"
              checked={form.recurring}
              onChange={set('recurring')}
              className="w-4 h-4 rounded accent-sage"
            />
            <label htmlFor="recurring-tenant" className="font-body text-sm text-ink cursor-pointer">
              Repeat every month (recurring reminder)
            </label>
          </div>
          <div>
            <label className="label-xs">Notes (optional)</label>
            <input
              className="input-base"
              placeholder="e.g. Rent for March"
              value={form.notes}
              onChange={set('notes')}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
              ) : editingId ? (
                'Save changes'
              ) : (
                <>
                  <Plus size={15} /> Create reminder
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

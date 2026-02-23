// In-app reminder toasts for tenants: when a reminder's "notify date" is today and
// notifyInApp is true, show a toast once per day (keyed by reminder id + date).
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeReminders } from '../services/firebase';
import { shouldNotifyToday } from '../utils/reminderLeadTimes';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STORAGE_PREFIX = 'leaseease_reminder_alert_';

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function TenantReminderAlerts() {
  const { user, profile } = useAuth();
  const { fmt } = useLocale();
  const shownRef = useRef(new Set());

  useEffect(() => {
    const role = profile?.role || 'landlord';
    if (role !== 'tenant' || !user?.uid) return;

    const unsub = subscribeReminders(user.uid, (reminders) => {
      const today = todayKey();
      const tenantReminders = reminders.filter((r) => r.createdBy === 'tenant');

      tenantReminders.forEach((r) => {
        if (r.status === 'paid' || !r.notifyInApp) return;
        if (!shouldNotifyToday(r.dueDate, r.leadTimeDays ?? 7)) return;

        const key = `${STORAGE_PREFIX}${r.id}_${today}`;
        try {
          if (sessionStorage.getItem(key)) return;
        } catch {
          if (shownRef.current.has(key)) return;
        }

        const due = r.dueDate?.toDate?.() ?? new Date(r.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueStart = new Date(due);
        dueStart.setHours(0, 0, 0, 0);
        const isDueToday = dueStart.getTime() === today.getTime();
        const propertyName = r.propertyName || 'Rent';
        const amount = fmt(r.amount || 0);
        const message = isDueToday
          ? `Rent due today: ${propertyName} — ${amount}`
          : `Reminder: ${propertyName} — ${amount} due ${format(due, 'MMM d')}`;

        toast(message, {
          icon: '🔔',
          duration: 6000,
          style: { background: '#1A1612', color: '#F5F0E8' },
        });

        try {
          sessionStorage.setItem(key, '1');
        } catch {
          shownRef.current.add(key);
        }
      });
    });

    return () => unsub?.();
  }, [user?.uid, profile?.role, fmt]);

  return null;
}

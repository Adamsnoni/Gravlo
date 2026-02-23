// Lead time options for tenant rent reminders (when to be notified before due date)
export const LEAD_TIME_OPTIONS = [
  { value: 1,   label: '1 day before',   short: '1 day' },
  { value: 3,   label: '3 days before',  short: '3 days' },
  { value: 7,   label: '1 week before', short: '1 week' },
  { value: 14,  label: '2 weeks before', short: '2 weeks' },
  { value: 30,  label: '1 month before', short: '1 month' },
];

export function getLeadTimeLabel(days) {
  return LEAD_TIME_OPTIONS.find(o => o.value === days)?.label ?? `${days} days before`;
}

/** Reminder “fire” date: the date the user should be notified (dueDate - leadTimeDays) */
export function getReminderNotifyDate(dueDate, leadTimeDays = 7) {
  const d = dueDate?.toDate?.() ?? new Date(dueDate);
  const out = new Date(d);
  out.setDate(out.getDate() - (leadTimeDays || 0));
  return out;
}

/** True if we should show an in-app reminder today (notify date is today or past, due date not past) */
export function shouldNotifyToday(dueDate, leadTimeDays) {
  const due = dueDate?.toDate?.() ?? new Date(dueDate);
  const notifyDate = getReminderNotifyDate(due, leadTimeDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const notifyStart = new Date(notifyDate);
  notifyStart.setHours(0, 0, 0, 0);
  const dueStart = new Date(due);
  dueStart.setHours(0, 0, 0, 0);
  return notifyStart <= today && dueStart >= today;
}

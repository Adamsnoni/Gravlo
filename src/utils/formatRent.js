// src/utils/formatRent.js
// Reusable rent price formatter.
// Usage: formatRentPrice(250000, 'monthly') → '₦250,000/month'

const RENT_TYPE_LABELS = {
  daily:   'day',
  weekly:  'week',
  monthly: 'month',
  yearly:  'year',
};

/**
 * Formats a rent amount with its duration label.
 * @param {number} amount   - Rent amount in Naira
 * @param {string} rentType - One of: 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @returns {string}        - e.g. '₦250,000/month'
 */
export function formatRentPrice(amount, rentType = 'monthly') {
  if (!amount && amount !== 0) return '—';
  const label = RENT_TYPE_LABELS[rentType] ?? 'month';
  return `₦${Number(amount).toLocaleString()}/${label}`;
}

export const RENT_TYPES = [
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
];

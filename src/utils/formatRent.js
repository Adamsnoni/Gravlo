// src/utils/formatRent.js
// Reusable rent price formatter.
// Usage: formatRentPrice(250000, 'monthly') → '₦250,000/month'

const RENT_TYPE_LABELS = {
  yearly: 'year',
};

/**
 * Formats a rent amount with its duration label.
 * @param {number} amount   - Rent amount in Naira
 * @param {string} rentType - Ignored, defaults to 'yearly'
 * @returns {string}        - e.g. '₦250,000/year'
 */
export function formatRentPrice(amount, _rentType) {
  if (!amount && amount !== 0) return '—';
  return `₦${Number(amount).toLocaleString()}/year`;
}

export const RENT_TYPES = [
  { value: 'yearly', label: 'Yearly' },
];

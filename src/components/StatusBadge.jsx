// src/components/StatusBadge.jsx
import React from 'react';

const CFG = {
  occupied: { label: 'Occupied', cls: 'badge-sage' },
  vacant: { label: 'Vacant', cls: 'badge-amber' },
  maintenance: { label: 'Maintenance', cls: 'badge-rust' },
  paid: { label: 'Paid', cls: 'badge-sage' },
  pending: { label: 'Pending', cls: 'badge-amber' },
  late: { label: 'Late', cls: 'badge-rust' },
  open: { label: 'Open', cls: 'badge-rust' },
  'in-progress': { label: 'In Progress', cls: 'badge-amber' },
  resolved: { label: 'Resolved', cls: 'badge-sage' },
};

export default function StatusBadge({ status, className = '' }) {
  const c = CFG[status] || { label: status || 'System', cls: 'badge-stone' };
  return <span className={`${c.cls} py-1 px-3 text-[9px] font-black uppercase tracking-[0.15em] border border-current bg-opacity-10 ${className}`}>{c.label}</span>;
}

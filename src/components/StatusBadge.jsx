// src/components/StatusBadge.jsx
import React from 'react';

const CFG = {
  occupied:      { label: 'Occupied',    cls: 'badge-sage'  },
  vacant:        { label: 'Vacant',      cls: 'badge-amber' },
  maintenance:   { label: 'Maintenance', cls: 'badge-rust'  },
  paid:          { label: 'Paid',        cls: 'badge-sage'  },
  pending:       { label: 'Pending',     cls: 'badge-amber' },
  late:          { label: 'Late',        cls: 'badge-rust'  },
  open:          { label: 'Open',        cls: 'badge-rust'  },
  'in-progress': { label: 'In Progress', cls: 'badge-amber' },
  resolved:      { label: 'Resolved',    cls: 'badge-sage'  },
};

export default function StatusBadge({ status, className = '' }) {
  const c = CFG[status] || { label: status || 'Unknown', cls: 'badge-stone' };
  return <span className={`${c.cls} ${className}`}>{c.label}</span>;
}

// src/components/PaymentRow.jsx
import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, FileDown, Hash } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { getShortUnitId } from '../utils/unitDisplay';

const STATUS_CFG = {
  paid:    { icon: CheckCircle, color: 'text-sage',  bg: 'bg-sage/10',  label: 'Paid'    },
  pending: { icon: Clock,       color: 'text-amber', bg: 'bg-amber/10', label: 'Pending' },
  late:    { icon: AlertCircle, color: 'text-rust',  bg: 'bg-rust/10',  label: 'Late'    },
};

export default function PaymentRow({ payment, isLast, showProperty, onDownloadInvoice }) {
  const { fmt } = useLocale();
  const s    = STATUS_CFG[payment.status] || STATUS_CFG.pending;
  const Icon = s.icon;
  const date = payment.paidDate?.toDate?.() ?? new Date(payment.paidDate);

  return (
    <div className={`flex items-center gap-4 px-5 py-4 hover:bg-stone-50/70 transition-colors ${!isLast ? 'border-b border-stone-100' : ''}`}>
      <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={15} className={s.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body font-medium text-sm text-ink">
          {payment.tenantName || 'Payment'}
          {showProperty && payment.propertyName && (
            <span className="font-normal text-stone-400 ml-2 text-xs">
              · {payment.propertyName}
              {payment.propertyUnitNumber && (
                <span className="text-sage ml-1">({getShortUnitId({
                  unitNumber: payment.propertyUnitNumber,
                  floor: payment.propertyFloor,
                })})</span>
              )}
            </span>
          )}
        </p>
        <p className="font-body text-xs text-stone-400 mt-0.5">{payment.method || 'Unknown'}</p>
      </div>
      <span className="font-body text-xs text-stone-400 hidden sm:block w-28 text-right">
        {format(date, 'MMM d, yyyy')}
      </span>
      <span className="font-body text-xs text-stone-400 hidden md:block w-24 text-right capitalize">
        {payment.method || '—'}
      </span>
      {onDownloadInvoice && (
        <button
          type="button"
          onClick={() => onDownloadInvoice(payment)}
          className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-400 hover:text-ink transition-colors"
          title="Download invoice"
        >
          <FileDown size={14} />
        </button>
      )}
      <span className={`badge text-xs w-20 justify-center ${
        payment.status === 'paid' ? 'badge-sage' : payment.status === 'pending' ? 'badge-amber' : 'badge-rust'
      }`}>
        {s.label}
      </span>
      <span className="font-display font-semibold text-ink text-sm w-28 text-right flex-shrink-0">
        {fmt(payment.amount || 0)}
      </span>
    </div>
  );
}

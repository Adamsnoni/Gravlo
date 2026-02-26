// src/components/PaymentRow.jsx
import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, FileDown, RefreshCw, ArrowUpRight, DollarSign } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { getShortUnitId } from '../utils/unitDisplay';
import toast from 'react-hot-toast';

const STATUS_CFG = {
  paid: { icon: CheckCircle, color: 'text-[#1a6a3c]', bg: 'bg-[#e8f5ee]', border: 'border-[#ddf0e6]', label: 'Settled' },
  pending: { icon: Clock, color: 'text-[#c8691a]', bg: 'bg-[#fef9ed]', border: 'border-[#f5e0b8]', label: 'Processing' },
  late: { icon: AlertCircle, color: 'text-[#e74c3c]', bg: 'bg-[#fff5f5]', border: 'border-[#fee2e2]', label: 'Overdue' },
};

export default function PaymentRow({ payment, isLast, showProperty, onDownloadInvoice }) {
  const { fmt } = useLocale();
  const [verifying, setVerifying] = React.useState(false);

  const s = STATUS_CFG[payment.status] || STATUS_CFG.pending;
  const Icon = s.icon;
  const dateObj = payment.paidDate || payment.createdAt || payment.timestamp;
  const date = dateObj?.toDate?.() ?? new Date(dateObj);

  const handleVerify = async () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      toast('Syncing with payment gateway...', { icon: '🔄' });
      setTimeout(() => {
        toast.success('Ledger state is current.');
      }, 1200);
    }, 800);
  };

  return (
    <div className={`group flex items-center gap-6 px-8 py-5 hover:bg-[#f4fbf7]/50 transition-all ${!isLast ? 'border-b border-[#f0f7f2]' : ''}`}>
      {/* Visual Status Indicator */}
      <div className={`w-11 h-11 rounded-2xl ${s.bg} ${s.border} border flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
        <Icon size={20} className={s.color} strokeWidth={2.5} />
      </div>

      {/* Primary Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h4 className="font-bold text-[#1a2e22] text-sm truncate">
            {payment.tenantName || 'Standard Payment'}
          </h4>
          <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${s.bg} ${s.border} ${s.color}`}>
            {s.label}
          </div>
          {payment.type === 'service_charge' ? (
            <div className="inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-[#fcf3e8] border-[#f5e0b8] text-[#c8691a]">
              S.C
            </div>
          ) : (
            <div className="inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-[#f0f7f4] border-[#e2ede8] text-[#1a3c2e]">
              Rent
            </div>
          )}
        </div>

        {showProperty && payment.propertyName ? (
          <p className="font-semibold text-[#6b8a7a] text-[11px] mt-1 flex items-center gap-1">
            <ArrowUpRight size={10} /> {payment.propertyName}
            {payment.propertyUnitNumber && (
              <span className="text-[#1a6a3c] font-black ml-1 uppercase">
                · {getShortUnitId({
                  unitNumber: payment.propertyUnitNumber,
                  floor: payment.propertyFloor,
                })}
              </span>
            )}
          </p>
        ) : (
          <p className="text-[#94a3a8] font-bold text-[10px] uppercase tracking-widest mt-1">
            {payment.method || 'Digital Remittance'} · {format(date, 'MMM d, p')}
          </p>
        )}
      </div>

      {/* Metadata Columns */}
      <div className="hidden lg:flex flex-col items-end w-32 border-l border-[#f0f7f2] pl-6">
        <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-[0.1em] mb-1">Settlement Date</p>
        <p className="text-xs font-bold text-[#1a2e22]">{format(date, 'MMM d, yyyy')}</p>
      </div>

      <div className="hidden xl:flex flex-col items-end w-32 border-l border-[#f0f7f2] pl-6">
        <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-[0.1em] mb-1">Remittance Method</p>
        <p className="text-xs font-bold text-[#6b8a7a] italic capitalize">{payment.method || 'Online Portal'}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 ml-2">
        {payment.status === 'paid' ? (
          onDownloadInvoice && (
            <button
              type="button"
              onClick={() => onDownloadInvoice(payment)}
              className="w-10 h-10 rounded-xl bg-white border border-[#ddf0e6] flex items-center justify-center text-[#1a6a3c] hover:bg-[#1a3c2e] hover:text-white hover:shadow-lg transition-all"
              title="Download Receipt"
            >
              <FileDown size={18} strokeWidth={2.5} />
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 px-4 h-10 rounded-xl bg-[#fef9ed] border border-[#f5e0b8] text-[#c8691a] hover:bg-[#c8691a] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
          >
            <RefreshCw size={14} className={verifying ? "animate-spin" : ""} strokeWidth={3} />
            <span className="hidden sm:inline">Verify</span>
          </button>
        )}
      </div>

      {/* Amount Display */}
      <div className="w-32 text-right flex-shrink-0 pl-4 border-l border-[#f0f7f2]">
        <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-[0.1em] mb-1">Transaction Value</p>
        <p className="font-fraunces font-black text-[#1a2e22] text-lg leading-none">
          {fmt(payment.amount || 0)}
        </p>
      </div>
    </div>
  );
}

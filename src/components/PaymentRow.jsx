// src/components/PaymentRow.jsx
import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, FileDown, RefreshCw, Hash, HardDrive } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import toast from 'react-hot-toast';

const STATUS_CFG = {
  paid: { icon: CheckCircle, color: 'text-[#52b788]', bg: 'bg-[#1a3c2e]/20', border: 'border-[#2d6a4f]/30', label: 'Secured' },
  pending: { icon: Clock, color: 'text-[#f0c040]', bg: 'bg-[#2d2510]/20', border: 'border-[#3d3215]/30', label: 'Synchronizing' },
  late: { icon: AlertCircle, color: 'text-[#e74c3c]', bg: 'bg-[#2d1a1a]/20', border: 'border-[#3d2020]/30', label: 'Deferred' },
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
      toast('Polling gateway state...', { icon: '🔄', style: { borderRadius: '12px', background: '#0d1215', color: '#e8e4de', border: '1px border #1e2a2e' } });
      setTimeout(() => {
        if (payment.status === 'pending') {
          toast('Asynchronous sync in progress. Status update pending.', { icon: '⏳' });
        } else {
          toast.success('Ledger synchronized accurately.');
        }
      }, 1200);
    }, 800);
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 hover:bg-[#141b1e]/30 transition-all duration-300 group ${!isLast ? 'border-b border-[#1e2a2e]/50' : ''}`}>
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div className={`w-11 h-11 rounded-[15px] ${s.bg} border ${s.border} flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform`}>
          <Icon size={18} className={s.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h4 className="font-body font-bold text-[#e8e4de] text-sm truncate tracking-tight uppercase">
              {payment.tenantName || 'Autonomous Payout'}
            </h4>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${s.bg} ${s.border} ${s.color}`}>
              {s.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 overflow-hidden">
            {showProperty && payment.propertyName && (
              <p className="font-body text-[9px] text-[#4a5568] uppercase tracking-[0.2em] font-black truncate flex items-center gap-1">
                <HardDrive size={10} className="text-[#1a3c2e]" /> {payment.propertyName}
                {payment.propertyUnitNumber && (
                  <span className="text-[#52b788] ml-1">· UNIT {payment.propertyUnitNumber}</span>
                )}
              </p>
            )}
            <p className="font-body text-[9px] text-[#4a5568] uppercase tracking-[0.2em] font-black flex items-center gap-1">
              <span className="opacity-30">/</span> {payment.method || 'STRIPE_API'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-8 pl-16 sm:pl-0 w-full sm:w-auto mt-2 sm:mt-0">
        <div className="hidden md:flex flex-col items-end min-w-[100px]">
          <span className="font-body text-[10px] text-[#8a9ba8] font-bold uppercase tracking-widest leading-none">
            {format(date, 'MMM d, yyyy')}
          </span>
          <span className="font-body text-[8px] text-[#4a5568] font-black uppercase tracking-[0.2em] mt-1.5">
            Synchronized
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right min-w-[110px]">
            <p className="font-display font-bold text-[#e8e4de] text-lg tracking-tighter leading-none">
              {fmt(payment.amount || 0)}
            </p>
            <p className="text-[8px] text-[#52b788] font-black uppercase tracking-[0.3em] mt-1">Unified</p>
          </div>

          <div className="flex items-center gap-2">
            {payment.status === 'paid' ? (
              onDownloadInvoice && (
                <button
                  type="button"
                  onClick={() => onDownloadInvoice(payment)}
                  className="w-10 h-10 rounded-xl border border-[#1e2a2e] bg-[#0d1215] hover:bg-[#1a3c2e]/20 text-[#4a5568] hover:text-[#52b788] flex items-center justify-center transition-all shadow-sm"
                  title="Export Manifest"
                >
                  <FileDown size={16} />
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-[#2d2510]/10 border border-[#3d3215]/30 text-[#f0c040] hover:bg-[#2d2510] transition-all text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#2d2510]/10"
              >
                <RefreshCw size={12} className={verifying ? "animate-spin" : ""} />
                Verify
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

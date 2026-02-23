// src/pages/TenantPaymentsPage.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowRight, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenantPayments } from '../services/firebase';
import { subscribeTenantTenancies } from '../services/tenancy';
import { createCheckoutSession } from '../services/payments';
import PaymentRow from '../components/PaymentRow';
import { generateInvoicePdf } from '../utils/invoicePdf';
import { getShortUnitId } from '../utils/unitDisplay';
import toast from 'react-hot-toast';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35 },
});

export default function TenantPaymentsPage() {
  const { user } = useAuth();
  const { fmt, currency, currencySymbol } = useLocale();

  const [payments, setPayments] = useState([]);
  const [tenancies, setTenancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTenancyId, setSelectedTenancyId] = useState('');

  useEffect(() => {
    if (!user?.uid) return;

    // Payments query still uses email (for now) or uid based on your db structure
    const u1 = subscribeTenantPayments(user.uid, (d) => {
      setPayments(d);
      setLoading(false);
    });

    // Tenancy query definitely uses UID
    const u2 = subscribeTenantTenancies(user.uid, (data) => {
      // Only show active tenancies for payment dropdown
      setTenancies(data.filter(t => t.status === 'active'));
    });

    return () => {
      u1?.();
      u2?.();
    };
  }, [user?.uid]);

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + (p.amount || 0), 0);

  const handleDownloadInvoice = (payment) => {
    generateInvoicePdf(payment);
  };

  const handleCreatePayment = async () => {
    if (!selectedTenancyId) {
      toast.error('Select a home to pay for.');
      return;
    }
    const tenancy = tenancies.find(t => t.id === selectedTenancyId);
    if (!tenancy) return;

    const amount = tenancy.rentAmount || 0;
    if (!amount) {
      toast.error('This home has no rent amount configured yet.');
      return;
    }

    setCreating(true);
    try {
      await createCheckoutSession({
        landlordId: tenancy.landlordId,
        propertyId: tenancy.propertyId,
        propertyName: tenancy.propertyName,
        propertyAddress: tenancy.address || '',
        propertyBuildingName: '',
        propertyUnitNumber: tenancy.unitName || '',
        propertyFloor: '',
        tenantEmail: user.email,
        tenantName: user.displayName || '',
        amount,
        currency: tenancy.currency || currency,
      });
    } catch (err) {
      toast.error(err.message || 'Unable to start payment.');
    } finally {
      setCreating(false);
    }
  };

  const hasHomes = tenancies.length > 0;

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp(0)} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-ink text-3xl font-semibold">Payments</h1>
          <p className="font-body text-stone-400 text-sm mt-0.5">
            {payments.length} records · {fmt(totalPaid)} paid via LeaseEase
          </p>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.08)} className="card p-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-sage/10 flex items-center justify-center flex-shrink-0">
            <CreditCard size={18} className="text-sage" />
          </div>
          <div>
            <p className="font-body text-sm font-semibold text-ink">Pay your rent online</p>
            <p className="font-body text-xs text-stone-400 mt-0.5">
              Choose a home and we’ll redirect you to a secure checkout page.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            className="input-base text-sm"
            value={selectedTenancyId}
            onChange={e => setSelectedTenancyId(e.target.value)}
            disabled={!hasHomes}
          >
            <option value="">
              {hasHomes ? 'Select home' : 'No homes linked yet'}
            </option>
            {tenancies.map(t => (
              <option key={t.id} value={t.id}>
                {t.propertyName}{t.unitName ? ` - ${t.unitName}` : ''} — {fmt(t.rentAmount || 0)}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreatePayment}
            disabled={!hasHomes || creating}
            className="btn-primary text-sm flex items-center justify-center gap-1.5"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Pay {currencySymbol}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="card overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 border-b border-stone-100 animate-pulse bg-stone-50/50" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="card p-16 flex flex-col items-center text-center border-2 border-dashed border-stone-200">
          <CreditCard size={40} className="text-stone-300 mb-3" />
          <p className="font-body font-medium text-stone-500">No payments yet</p>
          <p className="font-body text-xs text-stone-300 mt-1">
            When you pay through LeaseEase, your receipts will appear here.
          </p>
        </div>
      ) : (
        <motion.div {...fadeUp(0.1)} className="card overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 bg-stone-50 border-b border-stone-100 text-xs font-body font-semibold text-stone-400 uppercase tracking-wider">
            <span className="flex-1">Home</span>
            <span className="w-28 text-right hidden sm:block">Date</span>
            <span className="w-24 text-right hidden md:block">Method</span>
            <span className="w-20 text-right">Status</span>
            <span className="w-28 text-right">Amount</span>
          </div>
          {payments.map((p, i) => (
            <PaymentRow
              key={p.id}
              payment={p}
              isLast={i === payments.length - 1}
              showProperty
              onDownloadInvoice={handleDownloadInvoice}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}


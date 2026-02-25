// src/pages/TenantPaymentsPage.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowRight, Hash, ShieldCheck, Wallet, ArrowUpRight, History, Loader2, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenantPayments } from '../services/firebase';
import { subscribeTenantTenancies } from '../services/tenancy';
import { createCheckoutSession } from '../services/payments';
import PaymentRow from '../components/PaymentRow';
import { generateInvoicePdf } from '../utils/invoicePdf';
import toast from 'react-hot-toast';

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
    const u1 = subscribeTenantPayments(user.uid, (d) => {
      setPayments(d);
      setLoading(false);
    });
    const u2 = subscribeTenantTenancies(user.uid, (data) => {
      setTenancies(data.filter(t => t.status === 'active'));
    });
    return () => { u1?.(); u2?.(); };
  }, [user?.uid]);

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + (p.amount || 0), 0);

  const handleDownloadInvoice = (payment) => {
    generateInvoicePdf(payment);
  };

  const handleCreatePayment = async () => {
    if (!selectedTenancyId) {
      toast.error('Select a residency to fulfill.');
      return;
    }
    const tenancy = tenancies.find(t => t.id === selectedTenancyId);
    if (!tenancy) return;

    const amount = tenancy.rentAmount || 0;
    if (!amount) {
      toast.error('Rent amount not yet configured by management.');
      return;
    }

    const paymentCurrency = tenancy.currency || currency || 'NGN';

    setCreating(true);
    try {
      const res = await createCheckoutSession({
        gateway: 'paystack',
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
        currency: paymentCurrency,
      });

      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      toast.error(err.message || 'Gateway connection failed.');
    } finally {
      setCreating(false);
    }
  };

  const hasHomes = tenancies.length > 0;

  return (
    <div className="space-y-10 py-2 animate-in fade-in duration-500">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tight">Ledger</h1>
          <p className="font-body text-[#4a5568] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
            {payments.length} Transaction Records · {fmt(totalPaid)} Unified Fulfillment
          </p>
        </div>
      </motion.div>

      {/* Payment Action Hero */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-8 bg-gradient-to-br from-[#141b1e] to-[#0d1215] border-[#1e2a2e] shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#52b788]/5 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-[#52b788]/10 transition-colors" />

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="flex items-start gap-6 max-w-xl">
            <div className="w-16 h-16 rounded-[1.5rem] bg-[#1a3c2e]/20 border border-[#2d6a4f]/30 flex items-center justify-center text-[#52b788] shadow-lg shadow-[#1a3c2e]/20 flex-shrink-0">
              <Wallet size={32} />
            </div>
            <div>
              <p className="font-display text-[#e8e4de] text-xl font-bold tracking-tight mb-2">Initialize Payout</p>
              <p className="font-body text-sm text-[#8a9ba8] font-medium leading-relaxed">
                Select your residency below to trigger a secure checkout session. Your fulfillment will be instantly synchronized with management records.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center w-full xl:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#52b788] pointer-events-none">
                <Landmark size={16} />
              </div>
              <select
                className="input-base pl-12 h-14 bg-[#0d1215] border-[#1e2a2e] focus:border-[#52b788] text-sm text-[#e8e4de] appearance-none cursor-pointer font-bold tracking-tight"
                value={selectedTenancyId}
                onChange={e => setSelectedTenancyId(e.target.value)}
                disabled={!hasHomes}
              >
                <option value="" className="bg-[#0d1215]">
                  {hasHomes ? 'Select active residency' : 'No records linked'}
                </option>
                {tenancies.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#0d1215]">
                    {t.propertyName} {t.unitName ? `· ${t.unitName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreatePayment}
              disabled={!hasHomes || creating}
              className="btn-primary h-14 px-8 text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-[#1a3c2e]/30 flex items-center justify-center gap-3"
            >
              {creating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <> Fulfill {currencySymbol} <ArrowUpRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Payment History */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#4a5568]">
            <History size={16} />
          </div>
          <h2 className="font-display text-[#e8e4de] text-xl font-bold tracking-tight">Activity History</h2>
        </div>

        {loading ? (
          <div className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e]">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 border-b border-[#1e2a2e]/50 animate-pulse bg-[#141b1e]/20" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="card p-24 flex flex-col items-center text-center bg-[#0d1215] border-2 border-dashed border-[#1e2a2e]">
            <div className="w-20 h-20 rounded-[2rem] bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center mb-8 text-[#1e2a2e]">
              <CreditCard size={40} />
            </div>
            <h3 className="font-display text-[#e8e4de] text-xl font-bold mb-2 tracking-tight">Zero Financial Vectors</h3>
            <p className="font-body text-[#4a5568] text-sm max-w-sm font-medium">
              Receipts will populate this history pool as you fulfill your residency obligations through the Gravlo portal.
            </p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e] shadow-2xl">
            <div className="hidden sm:flex items-center gap-4 px-6 py-4 bg-[#141b1e] border-b border-[#1e2a2e] text-[10px] font-bold text-[#4a5568] uppercase tracking-[0.2em]">
              <span className="flex-1">Residency Vector</span>
              <span className="w-32 text-right">Synchronization</span>
              <span className="w-28 text-right hidden md:block">Method</span>
              <span className="w-24 text-right">Status</span>
              <span className="w-32 text-right">Magnitude</span>
            </div>
            <div className="divide-y divide-[#1e2a2e]/50">
              {payments.map((p, i) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  isLast={i === payments.length - 1}
                  showProperty
                  onDownloadInvoice={handleDownloadInvoice}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Security Banner */}
      <div className="p-6 rounded-2xl bg-[#1a3c2e]/10 border border-[#2d6a4f]/20 flex items-center justify-center gap-3 text-[#52b788]">
        <ShieldCheck size={18} />
        <p className="font-body text-[10px] font-bold uppercase tracking-[0.2em]">Encrypted Financial Pipeline • Secure Gateway Integration</p>
      </div>
    </div>
  );
}

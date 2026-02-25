// src/pages/SettingsPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Globe, Check, KeyRound, Activity, ChevronDown, CheckCircle, Smartphone, Banknote, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { updateUserProfile } from '../services/firebase';
import { getFlag } from '../utils/countries';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: "easeOut" },
});

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { country, countries, changeCountry, currencySymbol } = useLocale();
  const navigate = useNavigate();
  const [savingLocale, setSavingLocale] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(profile?.countryCode || country.code);

  const [notifPrefs, setNotifPrefs] = useState({
    rentDue: true, overdue: true, maintenance: true, weeklyReport: false,
  });

  const handleLocaleChange = (e) => {
    setSelectedCountry(e.target.value);
  };

  const handleSaveLocale = async () => {
    setSavingLocale(true);
    try {
      changeCountry(selectedCountry);
      if (user?.uid) {
        try {
          await updateUserProfile(user.uid, { countryCode: selectedCountry });
        } catch (err) { console.warn('Cloud sync delayed.', err); }
      }
      toast.success('Regional standards updated!');
    } catch (criticalErr) { toast.error('Locale update failed.'); }
    finally { setSavingLocale(false); }
  };

  const displayedCountry = countries.find(c => c.code === selectedCountry);

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-slide-up">
      {/* Page Header */}
      <motion.div {...fadeUp(0)}>
        <p className="text-[#6b8a7a] font-bold text-xs uppercase tracking-[0.15em] mb-2">Workspace Configuration</p>
        <h1 className="font-fraunces text-[#1a2e22] text-4xl font-black tracking-tight leading-none italic">
          Local Settings
        </h1>
        <p className="text-[#94a3a8] font-medium text-sm mt-3 flex items-center gap-2">
          <Activity size={16} /> Personalize your regional formatting and notifications
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Regional & Notifications */}
        <div className="lg:col-span-8 space-y-8">

          {/* Country & Currency Section */}
          <motion.div {...fadeUp(0.05)} className="card p-10 bg-white border-[#f0f7f2] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a6a3c]/5 rounded-full blur-3xl" />

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#f4fbf7] border border-[#ddf0e6] flex items-center justify-center text-[#1a6a3c] shadow-sm">
                <Globe size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-fraunces text-xl font-black italic text-[#1a2e22]">Regional Standard</h3>
                <p className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mt-1">Currency & Date Formats</p>
              </div>
            </div>

            <p className="text-sm text-[#6b8a7a] font-medium leading-relaxed mb-8 italic">
              Select your operational region to automatically synchronize currency symbols, settlement logic, and date presentation across the platform.
            </p>

            <div className="space-y-8">
              <div className="relative">
                <Globe size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#cce8d8] pointer-events-none" strokeWidth={3} />
                <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1a6a3c] pointer-events-none" strokeWidth={3} />
                <select
                  className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl pl-12 pr-12 py-5 text-[#1a2e22] font-bold text-base focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] transition-all appearance-none cursor-pointer"
                  value={selectedCountry}
                  onChange={handleLocaleChange}
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>
                      {getFlag(c.code)} {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>

              {displayedCountry && (
                <div className="p-6 rounded-2xl bg-[#fcfdfc] border border-[#f0f7f2] flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#ddf0e6] flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                      {getFlag(displayedCountry.code)}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Active Standard</p>
                      <p className="text-sm font-bold text-[#1a2e22]">{displayedCountry.currencyName} ({displayedCountry.symbol})</p>
                    </div>
                  </div>
                  <CheckCircle size={20} className="text-[#1a6a3c] opacity-50" strokeWidth={3} />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveLocale}
                  disabled={savingLocale || selectedCountry === (profile?.countryCode || country.code)}
                  className="btn-primary px-10 py-4 shadow-xl shadow-[#1a6a3c]/20 disabled:opacity-30"
                >
                  {savingLocale
                    ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    : <span className="flex items-center gap-2">Save Locale <Check size={18} strokeWidth={3} /></span>
                  }
                </button>
              </div>
            </div>
          </motion.div>

          {/* Payouts Section */}
          <motion.div {...fadeUp(0.12)} className="card p-10 bg-white border-[#f0f7f2] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a6a3c]/5 rounded-full blur-3xl opacity-50" />

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#f4fbf7] border border-[#ddf0e6] flex items-center justify-center text-[#1a6a3c] shadow-sm">
                <Banknote size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-fraunces text-xl font-black italic text-[#1a2e22]">Settlement & Payouts</h3>
                <p className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mt-1">Bank Account & Disbursement</p>
              </div>
            </div>

            <p className="text-sm text-[#6b8a7a] font-medium leading-relaxed mb-8 italic">
              Configure your settlement destination to receive automated disbursements from Paystack. Verified accounts receive funds within 24 hours of collection.
            </p>

            <div className="p-6 rounded-2xl bg-[#fcfdfc] border border-[#f0f7f2] flex items-center justify-between mb-8 group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform ${profile?.payoutStatus === 'active' ? 'bg-[#f4fbf7] border border-[#ddf0e6] text-[#1a6a3c]' : 'bg-[#fff9f9] border border-[#fee2e2] text-[#dc2626]'}`}>
                  {profile?.payoutStatus === 'active' ? <Check size={20} strokeWidth={3} /> : <AlertCircle size={20} />}
                </div>
                <div>
                  <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Payout Identity Status</p>
                  <p className="text-sm font-bold text-[#1a2e22]">
                    {profile?.payoutStatus === 'active' ? 'Active & Linked' : 'Infrastructure Pending'}
                  </p>
                </div>
              </div>

              {profile?.payoutStatus === 'active' && (
                <div className="text-right">
                  <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-widest">Connected Bank</p>
                  <p className="text-xs font-bold text-[#1a6a3c]">{profile?.payoutMethod?.accountNumber?.replace(/.(?=.{4})/g, '•')}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => navigate('/settings/payouts')}
                className="btn-primary px-10 py-4 shadow-xl shadow-[#1a6a3c]/20"
              >
                <span className="flex items-center gap-2">
                  {profile?.payoutStatus === 'active' ? 'Update Settlement' : 'Setup Payouts'} <ChevronRight size={18} strokeWidth={3} />
                </span>
              </button>
            </div>
          </motion.div>

          {/* Notifications Section */}
          <motion.div {...fadeUp(0.1)} className="card p-10 bg-white border-[#f0f7f2] shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f5ee] border border-[#ddf0e6] flex items-center justify-center text-[#1a6a3c] shadow-sm">
                <Bell size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-fraunces text-xl font-black italic text-[#1a2e22]">Alert Protocols</h3>
                <p className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mt-1">Push & Email Preferences</p>
              </div>
            </div>

            <div className="divide-y divide-[#f0f7f2]">
              {[
                { key: 'rentDue', label: 'Rent Maturity Reminders', sub: 'Notifications regarding upcoming settlement dates' },
                { key: 'overdue', label: 'Overdue Escalations', sub: 'Immediate priority alerts for late remittances' },
                { key: 'maintenance', label: 'Service Ticket Status', sub: 'Updates on unresolved maintenance requests' },
                { key: 'weeklyReport', label: 'Portfolio Analytics', sub: 'Weekly digest of performance metrics' },
              ].map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between py-6 group">
                  <div className="pr-6">
                    <p className="font-bold text-[#1a2e22] text-sm group-hover:text-[#1a6a3c] transition-colors">{label}</p>
                    <p className="text-[#6b8a7a] text-xs font-medium italic mt-1">{sub}</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner p-1 ${notifPrefs[key] ? 'bg-[#1a3c2e]' : 'bg-gray-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform duration-300 ${notifPrefs[key] ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column: App Info / Metadata */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div {...fadeUp(0.15)} className="card p-8 bg-[#1a3c2e] text-white relative overflow-hidden group h-fit">
            <div className="absolute top-[-40px] left-[-40px] opacity-[0.05] transform rotate-12 transition-transform group-hover:rotate-45 duration-700">
              <KeyRound size={160} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <Smartphone size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-fraunces text-xl font-black italic">Platform Info</h4>
                  <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Version 1.2.0 Stable</p>
                </div>
              </div>

              <p className="text-white/70 text-sm font-medium leading-relaxed italic mb-8">
                Gravlo is natively optimized for global real estate management. Your workspace is currently utilizing the 2026 Core Infrastructure.
              </p>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#52b788]">System Status</span>
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                  Operational
                  <div className="w-2 h-2 rounded-full bg-[#52b788] animate-pulse" />
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

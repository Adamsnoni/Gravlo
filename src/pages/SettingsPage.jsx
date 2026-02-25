// src/pages/SettingsPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Globe, Check, KeyRound, Loader2, Landmark, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { updateUserProfile } from '../services/firebase';
import { getFlag } from '../utils/countries';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { country, countries, changeCountry } = useLocale();
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
        } catch (err) {
          console.warn('Sync failed, local state updated.', err);
        }
      }
      toast.success('Preferences synchronized!');
    } catch (criticalErr) {
      console.error(criticalErr);
      toast.error('Local update failed.');
    } finally {
      setSavingLocale(false);
    }
  };

  const displayedCountry = countries.find(c => c.code === selectedCountry);

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tight">Configuration</h1>
        <p className="font-body text-[#4a5568] text-sm mt-1 uppercase tracking-widest font-bold">Manage your global operating preferences</p>
      </motion.div>

      {/* Country & Currency */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-8 bg-[#0d1215] border border-[#1e2a2e] shadow-xl">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#1e2a2e]">
          <div className="w-12 h-12 rounded-2xl bg-[#1a3c2e]/20 border border-[#2d6a4f]/30 flex items-center justify-center text-[#52b788]">
            <Globe size={24} />
          </div>
          <div>
            <h2 className="font-display font-bold text-[#e8e4de] text-lg tracking-tight">Locale & Financials</h2>
            <p className="font-body text-xs text-[#4a5568] font-medium">Define your base currency and regional standards.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <label className="label-xs mb-3 block text-[#4a5568] uppercase font-bold tracking-widest">Active Region</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#52b788] pointer-events-none text-sm group-focus-within:scale-110 transition-transform">
                {displayedCountry ? getFlag(displayedCountry.code) : <Globe size={16} />}
              </div>
              <select
                className="input-base pl-12 h-14 bg-[#141b1e] border-[#1e2a2e] focus:border-[#52b788] text-[#e8e4de] appearance-none cursor-pointer font-medium tracking-tight"
                value={selectedCountry}
                onChange={handleLocaleChange}
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code} className="bg-[#0d1215]">
                    {c.name} — {c.currency} ({c.symbol})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a5568]">
                <Check size={16} className={selectedCountry === (profile?.countryCode || country.code) ? "opacity-100" : "opacity-0"} />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1a3c2e]/10 border border-[#2d6a4f]/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#0d1215] flex items-center justify-center text-[#52b788] font-bold shadow-sm">
              {displayedCountry?.symbol || currencySymbol}
            </div>
            <div>
              <p className="font-body text-[10px] text-[#4a5568] uppercase font-bold tracking-[0.15em]">Standard Output</p>
              <p className="font-body text-sm text-[#e8e4de] font-bold tracking-tight">
                {displayedCountry?.currencyName || 'Local Currency'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveLocale}
            disabled={savingLocale || selectedCountry === (profile?.countryCode || country.code)}
            className="btn-primary w-full h-14 text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-[#1a3c2e]/20"
          >
            {savingLocale ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Synchronize Regional Settings'}
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-8 bg-[#0d1215] border border-[#1e2a2e] shadow-xl">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#1e2a2e]">
          <div className="w-12 h-12 rounded-2xl bg-[#2d2510]/20 border border-[#3d3215]/30 flex items-center justify-center text-[#f0c040]">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="font-display font-bold text-[#e8e4de] text-lg tracking-tight">Signal Preferences</h2>
            <p className="font-body text-xs text-[#4a5568] font-medium">Control the frequency and type of system alerts.</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { key: 'rentDue', label: 'Billing Anticipation', sub: 'Prior arrival of payment deadlines', icon: Landmark },
            { key: 'overdue', label: 'Arrears Monitoring', sub: 'Immediate escalation for delayed payouts', icon: ShieldCheck },
            { key: 'maintenance', label: 'Facility Logic', sub: 'Automated status on ticket resolution', icon: Zap },
            { key: 'weeklyReport', label: 'Analytical Summary', sub: 'Condensed portfolio performance digest', icon: Check },
          ].map(({ key, label, sub, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-xl hover:bg-[#141b1e]/50 border border-transparent hover:border-[#1e2a2e] transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#0d1215] border border-[#1e2a2e] flex items-center justify-center text-[#4a5568] group-hover:text-[#52b788] transition-colors">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-body font-bold text-sm text-[#e8e4de] tracking-tight">{label}</p>
                  <p className="font-body text-[10px] text-[#4a5568] font-bold uppercase tracking-widest mt-0.5">{sub}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${notifPrefs[key] ? 'bg-[#52b788]' : 'bg-[#1e2a2e]'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[#0d1215] shadow-lg transition-transform duration-300 ${notifPrefs[key] ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* App Info Footer */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="p-8 rounded-3xl bg-[#0d1215] border border-[#1e2a2e] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] flex items-center justify-center shadow-lg">
            <KeyRound size={22} className="text-[#e8e4de]" />
          </div>
          <div>
            <p className="font-display font-bold text-[#e8e4de] text-lg tracking-tight">LeaseEase Engine</p>
            <p className="font-body text-[10px] text-[#4a5568] font-bold uppercase tracking-[0.2em]">Build 1.0.0 · Production Environment</p>
          </div>
        </div>
        <div className="px-5 py-2 rounded-xl bg-[#1a3c2e]/10 border border-[#2d6a4f]/20 text-[#52b788] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#52b788] animate-pulse" />
          Live Connection
        </div>
      </motion.div>
    </div>
  );
}

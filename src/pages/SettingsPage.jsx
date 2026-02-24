// src/pages/SettingsPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Functional app settings: locale, notifications.
// Sign Out and profile info live in ProfilePage.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Globe, Check, KeyRound } from 'lucide-react';
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
        await updateUserProfile(user.uid, { countryCode: selectedCountry });
      }
      toast.success('Country & currency updated!');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSavingLocale(false);
    }
  };

  const displayedCountry = countries.find(c => c.code === selectedCountry);

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-ink text-3xl font-semibold">Settings</h1>
        <p className="font-body text-stone-400 text-sm mt-0.5">App preferences and configuration</p>
      </motion.div>

      {/* Country & Currency */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6">
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-stone-100">
          <Globe size={16} className="text-stone-400" />
          <h2 className="font-body font-semibold text-ink text-sm">Country & Currency</h2>
        </div>
        <p className="font-body text-xs text-stone-400 mb-3">
          All rent amounts, payments and financial data will display in your selected currency.
        </p>
        <div className="relative mb-3">
          <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <select
            className="input-base pl-10 appearance-none"
            value={selectedCountry}
            onChange={handleLocaleChange}
          >
            {countries.map(c => (
              <option key={c.code} value={c.code}>
                {getFlag(c.code)} {c.name} — {c.currency} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
        {displayedCountry && (
          <p className="font-body text-xs text-stone-400 mb-4">
            {getFlag(displayedCountry.code)} Prices will show in <strong className="text-sage">{displayedCountry.currencyName} ({displayedCountry.symbol})</strong>
          </p>
        )}
        <button
          onClick={handleSaveLocale}
          disabled={savingLocale || selectedCountry === (profile?.countryCode || country.code)}
          className="btn-primary btn-sm"
        >
          {savingLocale
            ? <div className="w-3.5 h-3.5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
            : <><Check size={13} /> Save Changes</>
          }
        </button>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-6">
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-stone-100">
          <Bell size={16} className="text-stone-400" />
          <h2 className="font-body font-semibold text-ink text-sm">Notifications</h2>
        </div>
        <div className="space-y-1">
          {[
            { key: 'rentDue', label: 'Rent Due Reminders', sub: 'Get notified before rent is due' },
            { key: 'overdue', label: 'Overdue Alerts', sub: 'Immediate alerts for overdue payments' },
            { key: 'maintenance', label: 'Maintenance Updates', sub: 'Status changes on maintenance tickets' },
            { key: 'weeklyReport', label: 'Weekly Summary', sub: 'Weekly digest of your portfolio' },
          ].map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
              <div>
                <p className="font-body font-medium text-sm text-ink">{label}</p>
                <p className="font-body text-xs text-stone-400 mt-0.5">{sub}</p>
              </div>
              <button
                onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifPrefs[key] ? 'bg-sage' : 'bg-stone-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* App Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sage flex items-center justify-center">
              <KeyRound size={14} className="text-cream" />
            </div>
            <div>
              <p className="font-body font-semibold text-ink text-sm">Gravlo</p>
              <p className="font-body text-xs text-stone-300">Version 1.0.0 · Global</p>
            </div>
          </div>
          <span className="badge-sage">Active</span>
        </div>
      </motion.div>
    </div>
  );
}

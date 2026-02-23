// src/context/LocaleContext.jsx
// Global locale context — provides country, currency, and formatCurrency()
// to every page. Persists to localStorage + Firebase profile.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { formatCurrency, getCountry, COUNTRIES } from '../utils/countries';

const LocaleContext = createContext(null);

const STORAGE_KEY = 'leaseease_locale';

// Default locale — Nigeria (most common user base, easy to change)
const DEFAULT = {
  countryCode: 'NG',
  currency:    'NGN',
  locale:      'en-NG',
};

export function LocaleProvider({ children }) {
  const [countryCode, setCountryCode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the saved country still exists in our list
        if (getCountry(parsed.countryCode)) return parsed.countryCode;
      }
    } catch { /* ignore */ }
    return DEFAULT.countryCode;
  });

  const country = getCountry(countryCode) ?? getCountry(DEFAULT.countryCode);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ countryCode }));
  }, [countryCode]);

  // Format any number as currency using the user's locale
  const fmt = useCallback((amount) => {
    return formatCurrency(amount, country.currency, country.locale);
  }, [country]);

  // Format with rent duration label e.g. "£1,200/month"
  const fmtRent = useCallback((amount, rentType = 'monthly') => {
    if (!amount && amount !== 0) return '—';
    const labels = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    return `${formatCurrency(amount, country.currency, country.locale)}/${labels[rentType] ?? 'month'}`;
  }, [country]);

  const changeCountry = useCallback((code) => {
    const c = getCountry(code);
    if (c) setCountryCode(code);
  }, []);

  return (
    <LocaleContext.Provider value={{
      countryCode,
      country,
      currency:      country.currency,
      currencyName:  country.currencyName,
      currencySymbol:country.symbol,
      locale:        country.locale,
      fmt,
      fmtRent,
      changeCountry,
      countries: COUNTRIES,
    }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be inside LocaleProvider');
  return ctx;
}

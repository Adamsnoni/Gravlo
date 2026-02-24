// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { listenAuth, getProfile, logoutUser } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenAuth(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const prof = await getProfile(firebaseUser.uid);
        setProfile(prof);
        // Restore saved country to localStorage so LocaleContext picks it up on next render
        if (prof?.countryCode) {
          try {
            localStorage.setItem('gravlo_locale', JSON.stringify({ countryCode: prof.countryCode }));
          } catch { /* ignore */ }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = () => logoutUser();

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

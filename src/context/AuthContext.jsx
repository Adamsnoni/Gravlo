import React, { createContext, useContext, useEffect, useState } from 'react';
import { listenAuth, getProfile, logoutUser, checkPropertiesExist } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
  const [hasProperties, setHasProperties] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        setUser(firebaseUser);

        try {
          const prof = await getProfile(firebaseUser.uid);
          setProfile(prof || null);

          // For landlords, check if they have any properties
          if (prof?.role === 'landlord' || (!prof && !firebaseUser.isAnonymous)) {
            const exists = await checkPropertiesExist(firebaseUser.uid);
            setHasProperties(exists);
          } else {
            setHasProperties(false);
          }

          // Restore saved country
          if (prof?.countryCode) {
            try {
              localStorage.setItem('gravlo_locale', JSON.stringify({ countryCode: prof.countryCode }));
            } catch { /* ignore */ }
          }
        } catch (err) {
          console.error('Auth check error:', err);
          setProfile(null);
          setHasProperties(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setHasProperties(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = () => logoutUser();

  return (
    <AuthContext.Provider value={{ user, profile, hasProperties, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

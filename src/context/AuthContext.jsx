import React, { createContext, useContext, useEffect, useState } from 'react';
import { listenAuth, subscribeProfile, logoutUser, checkPropertiesExist, subscribeProperties } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
  const [hasProperties, setHasProperties] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;
    let unsubProps = null;
    const unsubAuth = listenAuth(async (firebaseUser) => {
      // Cleanup previous subscriptions if user changes
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (unsubProps) { unsubProps(); unsubProps = null; }

      if (firebaseUser) {
        setLoading(true);
        setUser(firebaseUser);

        // Real-time profile listener
        unsubProfile = subscribeProfile(firebaseUser.uid, async (prof) => {
          setProfile(prof || null);

          // For landlords, subscribe to property existence
          if (prof?.role === 'landlord' || (!prof && !firebaseUser.isAnonymous)) {
            if (!unsubProps) {
              unsubProps = subscribeProperties(firebaseUser.uid, (list) => {
                setHasProperties(list.length > 0);
              });
            }
          } else {
            if (unsubProps) { unsubProps(); unsubProps = null; }
            setHasProperties(false);
          }

          // Restore saved country
          if (prof?.countryCode) {
            try {
              localStorage.setItem('gravlo_locale', JSON.stringify({ countryCode: prof.countryCode }));
            } catch { /* ignore */ }
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setHasProperties(false);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubProps) unsubProps();
    };
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

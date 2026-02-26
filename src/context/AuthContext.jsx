import React, { createContext, useContext, useEffect, useState } from 'react';
import { listenAuth, subscribeProfile, logoutUser, checkPropertiesExist, subscribeProperties } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
  const [hasProperties, setHasProperties] = useState(undefined);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;
    let unsubProps = null;
    const unsubAuth = listenAuth(async (firebaseUser) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (unsubProps) { unsubProps(); unsubProps = null; }

      if (firebaseUser) {
        setLoading(true);
        setUser(firebaseUser);

        unsubProfile = subscribeProfile(firebaseUser.uid, async (prof) => {
          setProfile(prof || null);

          // For landlords, subscribe to property existence
          if (prof?.role === 'landlord' || (!prof && !firebaseUser.isAnonymous)) {
            if (!unsubProps) {
              setPropertyLoading(true);
              unsubProps = subscribeProperties(firebaseUser.uid, (list) => {
                setHasProperties(list.length > 0);
                setPropertyLoading(false);
              });
            }
          } else {
            if (unsubProps) { unsubProps(); unsubProps = null; }
            setHasProperties(false);
            setPropertyLoading(false);
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
        setPropertyLoading(false);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubProps) unsubProps();
    };
  }, []);

  const refreshProperties = async () => {
    if (!user) return;
    setPropertyLoading(true);
    const exists = await checkPropertiesExist(user.uid);
    setHasProperties(exists);
    setPropertyLoading(false);
    return exists;
  };

  const logout = () => logoutUser();

  return (
    <AuthContext.Provider value={{ user, profile, hasProperties, propertyLoading, loading, logout, refreshProperties }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

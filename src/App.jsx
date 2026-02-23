// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocaleProvider } from './context/LocaleContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import RemindersPage from './pages/RemindersPage';
import PaymentsPage from './pages/PaymentsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import PropertySuccessPage from './pages/PropertySuccessPage';
import SubscriptionPage from './pages/SubscriptionPage';
import OnboardingPage from './pages/OnboardingPage';
import TenantDashboardPage from './pages/TenantDashboardPage';
import TenantPaymentsPage from './pages/TenantPaymentsPage';
import TenantRemindersPage from './pages/TenantRemindersPage';
import AppShell from './components/AppShell';
import TenantReminderAlerts from './components/TenantReminderAlerts';
import AcceptInvitePage from './pages/AcceptInvitePage';

// Full-page spinner used while auth/profile resolves
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
        <span className="font-body text-sm text-stone-400">Loading LeaseEase…</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  // Wait for both auth AND profile before proceeding
  if (loading || (user && profile === undefined)) return <LoadingSpinner />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return children;
  const role = profile?.role || 'landlord';
  return <Navigate to={role === 'tenant' ? '/tenant' : '/dashboard'} replace />;
}

function AppRoutes() {
  const { profile, loading, user } = useAuth();

  // Don't render any routes until profile has resolved — prevents role-based flash
  if (loading || (user && profile === undefined)) return <LoadingSpinner />;

  const role = profile?.role || 'landlord';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={role === 'tenant' ? '/tenant' : '/dashboard'} replace />} />

      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      {/* Public invite link — no auth required */}
      <Route path="/invite/:token" element={<AcceptInvitePage />} />

      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        {/* /dashboard is landlord-only; redirect tenants away immediately */}
        <Route path="/dashboard" element={
          role === 'tenant' ? <Navigate to="/tenant" replace /> : <DashboardPage />
        } />
        <Route path="/tenant" element={<TenantDashboardPage />} />
        <Route path="/tenant/reminders" element={<TenantRemindersPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/properties/:id/success" element={<PropertySuccessPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/tenant/payments" element={<TenantPaymentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
      </Route>

      <Route path="*" element={<Navigate to={role === 'tenant' ? '/tenant' : '/dashboard'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <AuthProvider>
          <div className="grain">
            <TenantReminderAlerts />
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1A1612',
                  color: '#F5F0E8',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  borderRadius: '12px',
                  border: '1px solid rgba(245,240,232,0.1)',
                },
                success: { iconTheme: { primary: '#4A7C59', secondary: '#F5F0E8' } },
                error: { iconTheme: { primary: '#B84C3A', secondary: '#F5F0E8' } },
              }}
            />
          </div>
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  );
}

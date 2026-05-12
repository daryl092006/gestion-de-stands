import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { JourneePage } from './pages/JourneePage';
import { RegisterPage } from './pages/RegisterPage';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { OwnerOnboarding } from './pages/OwnerOnboarding';
import { ForcePasswordChange } from './pages/ForcePasswordChange';
import { LandingPage } from './pages/LandingPage';
import { DemoDashboard } from './pages/DemoDashboard';
import { ConfigPage } from './pages/ConfigPage';
import { Loader } from './components/Loader';
import { useState } from 'react';

import { api } from './services/api';
import { supabase } from './lib/supabase';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppStore((state) => state.user);
  if (!user) return <Navigate to="/login" />;

  const isForceChangePage = window.location.pathname === '/force-password-change';
  const isSuspendedPage = window.location.pathname === '/suspended';
  const isOnboardingPage = window.location.pathname === '/onboarding';

  // Redirection forcée si le compte est suspendu
  if (user.is_suspended && !isSuspendedPage) {
    return <Navigate to="/suspended" />;
  }

  // Redirection forcée si le mot de passe doit être changé (uniquement pour les Agents)
  if (user.role === 'Agent' && user.must_change_password && !isForceChangePage && !isSuspendedPage) {
    return <Navigate to="/force-password-change" />;
  }

  // Pages sans sidebar : blocage, suspension, ou onboarding
  if (isForceChangePage || isSuspendedPage || isOnboardingPage) {
    return <>{children}</>;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  const { user, setUser, setJournee } = useAppStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check for existing session
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const sessionUser = session.user;
          const metadata = sessionUser.user_metadata || {};
          
          // 1. Définir un utilisateur par défaut immédiatement
          setUser({
            id: sessionUser.id,
            nom: metadata.nom || '',
            prenom: metadata.prenom || '',
            role: metadata.role || 'Proprietaire',
            login: sessionUser.email || '',
            is_suspended: false,
            must_change_password: false
          });

          // 2. Tenter de récupérer le profil complet (peut échouer en 403)
          try {
            const profile = await api.profiles.getById(sessionUser.id);
            if (profile) {
              setUser({
                id: sessionUser.id,
                nom: profile.nom || metadata.nom || '',
                prenom: profile.prenom || metadata.prenom || '',
                role: profile.role,
                login: sessionUser.email || '',
                must_change_password: profile.must_change_password,
                is_suspended: profile.is_suspended
              });
            }
          } catch (profileError) {
            console.warn("Profil inaccessible (RLS 403), conservation des données de session.");
          }
        }
      } catch (err) {
        console.error("Session restoration failed:", err);
      } finally {
        // Petit délai pour l'effet "premium"
        setTimeout(() => setIsInitializing(false), 800);
      }
    };
    restoreSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setJournee(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setJournee]);

  if (isInitializing) {
    return <Loader fullPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/demo" element={<DemoDashboard />} />
        {/* Landing page publique */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />

        <Route path="/suspended" element={
          <ProtectedRoute>
            <div className="flex-center" style={{ minHeight: '100vh', padding: '20px', textAlign: 'center' }}>
              <div className="glass-card animate-fade-in" style={{ maxWidth: '500px', padding: '50px', borderTop: '6px solid #ef4444' }}>
                <div style={{ width: '80px', height: '80px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                  <span style={{ fontSize: '40px' }}>🚫</span>
                </div>
                <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '16px' }}>Compte Suspendu</h2>
                <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px' }}>
                  Une irrégularité a été détectée lors de l'ouverture de votre session (écart de caisse).
                  Votre accès est temporairement bloqué par mesure de sécurité.
                </p>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', marginBottom: '32px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Action requise :</p>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Contactez immédiatement votre propriétaire pour régulariser la situation.</p>
                </div>
                <button onClick={() => api.auth.logout()} className="btn-secondary" style={{ width: '100%' }}>Se déconnecter</button>
              </div>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/force-password-change" element={
          <ProtectedRoute>
            <ForcePasswordChange />
          </ProtectedRoute>
        } />

        {/* Onboarding sans sidebar — affiché juste après la première inscription */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OwnerOnboarding onComplete={() => window.location.replace('/dashboard')} />
          </ProtectedRoute>
        } />

        {/* Dashboard protégé */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {user?.role === 'Proprietaire' ? <OwnerDashboard /> : <Dashboard />}
          </ProtectedRoute>
        } />

        <Route path="/transactions" element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        } />

        <Route path="/journee" element={
          <ProtectedRoute>
            <JourneePage />
          </ProtectedRoute>
        } />

        <Route path="/historique" element={
          <ProtectedRoute>
            <div className="glass-card">
              <h2 style={{ marginBottom: '20px' }}>Historique des Bilans</h2>
              <p style={{ color: 'var(--text-muted)' }}>Cette fonctionnalité sera disponible dans la version finale.</p>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/config" element={
          <ProtectedRoute>
            <ConfigPage />
          </ProtectedRoute>
        } />

        {/* Catch-all : si connecté → dashboard, sinon → landing */}
        <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

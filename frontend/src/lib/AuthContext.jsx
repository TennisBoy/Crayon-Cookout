import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut, redirectToLogin } from '@/lib/adapters/auth';
import { refreshEntitlements, clearEntitlements } from '@/lib/adapters/entitlements';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  // Resolves the current session. A stubbed auth adapter means "signed out",
  // not "broken" — the app must still render its routes.
  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      // Entitlements belong to a user, so this is the moment to fetch them.
      // Deliberately not awaited: gated UI reads the cache and repaints on the
      // cc-premium-change event, so a slow call must not delay the whole app.
      refreshEntitlements().catch(() => {});
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      clearEntitlements();
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setAuthError(null);
    setIsLoadingPublicSettings(true);
    setAppPublicSettings(null);
    await checkUserAuth();
    setIsLoadingPublicSettings(false);
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = useCallback((shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    clearEntitlements();
    signOut(shouldRedirect ? window.location.href : undefined).catch(() => {});
  }, []);

  const navigateToLogin = useCallback(() => {
    redirectToLogin(window.location.href).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

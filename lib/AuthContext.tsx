'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { msalInstance, signIn, signOut, getAuthUser, AuthUser } from './auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await msalInstance.initialize();
        
        // Handle redirect response
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
          console.log('Redirect response received:', response);
          msalInstance.setActiveAccount(response.account);
        }

        // Check if user is already signed in
        const authUser = await getAuthUser();
        setUser(authUser);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      // For redirect flow, we don't need to handle the response here
      // The redirect will happen and the user will be redirected back
      await signIn();
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn: handleSignIn,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
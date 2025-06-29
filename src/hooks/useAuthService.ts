import { useState, useEffect, useRef } from 'react';
import { authService } from '../lib/auth-service';
import { useAppStore } from '../store';
import { logger } from '../lib/logger';

interface AuthState {
  user: any;
  profile: any;
  session: any;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

export function useAuthService() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const initialState = authService.getAuthState();
    return {
      user: initialState.user,
      profile: initialState.profile,
      session: initialState.session,
      loading: initialState.isLoading,
      initialized: initialState.isInitialized,
      error: initialState.error
    };
  });

  const setUser = useAppStore((state) => state.setUser);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    logger.info('useAuthService hook initialized');

    // Subscribe to auth state changes
    const unsubscribe = authService.addAuthStateListener((event, state) => {
      if (!mounted.current) return;
      
      logger.debug('Auth state update received', { 
        event, 
        hasUser: !!state.user,
        isLoading: state.isLoading
      });
      
      setAuthState({
        user: state.user,
        profile: state.profile,
        session: state.session,
        loading: state.isLoading,
        initialized: state.isInitialized,
        error: state.error
      });
      
      // Update app store user state
      if (state.user && state.profile) {
        setUser({
          id: state.user.id,
          email: state.user.email || '',
          name: state.user.user_metadata?.name || state.profile?.display_name || '',
          avatar: state.profile?.avatar_url,
          plan: state.profile?.plan_type || 'free',
          usage: state.profile?.usage_stats || {
            clipsCreated: 0,
            exportsUsed: 0,
            storageUsed: 0,
            lastResetDate: new Date().toISOString()
          },
          notifications: state.profile?.preferences?.notifications || {
            email: true,
            push: true
          },
          createdAt: state.user.created_at
        });
      } else if (!state.user) {
        setUser(null);
      }
    });

    return () => {
      logger.info('useAuthService hook cleanup');
      mounted.current = false;
      unsubscribe();
    };
  }, [setUser]);

  // Expose auth service methods
  const signIn = async (email: string, password: string) => {
    return authService.signIn(email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    return authService.signUp(email, password, name);
  };

  const signOut = async () => {
    return authService.signOut();
  };

  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  const updatePassword = async (password: string) => {
    return authService.updatePassword(password);
  };

  const updateProfile = async (profile: any) => {
    return authService.updateProfile(profile);
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile
  };
}
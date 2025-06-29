import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, onAuthStateChange, getCurrentUser } from '../lib/auth';
import { useAppStore } from '../store';
import { logger } from '../lib/logger';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  const setUser = useAppStore((state) => state.setUser);
  const loadUserProfile = useAppStore((state) => state.loadUserProfile);

  useEffect(() => {
    let mounted = true;

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            const currentUser = await getCurrentUser();
            
            setAuthState({
              user: session.user,
              session,
              loading: false,
              initialized: true,
            });

            // Update app store
            if (currentUser) {
              setUser({
                id: currentUser.id,
                email: currentUser.email || '',
                name: currentUser.user_metadata?.name || currentUser.profile?.display_name || '',
                avatar: currentUser.profile?.avatar_url,
                plan: currentUser.profile?.plan_type || 'free',
                usage: currentUser.profile?.usage_stats || {
                  clipsCreated: 0,
                  exportsUsed: 0,
                  storageUsed: 0,
                  lastResetDate: new Date().toISOString()
                },
                notifications: currentUser.profile?.preferences?.notifications || {
                  email: true,
                  push: true
                },
                createdAt: currentUser.created_at
              });

              // Load additional profile data
              await loadUserProfile();
            }
          } else {
            setAuthState({
              user: null,
              session: null,
              loading: false,
              initialized: true,
            });
            setUser(null);
          }
        }
      } catch (error) {
        logger.error('Auth initialization failed', error as Error);
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          });
          setUser(null);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      logger.info('Auth state changed', { event, userId: session?.user?.id });

      if (mounted) {
        if (session?.user) {
          const currentUser = await getCurrentUser();
          
          setAuthState({
            user: session.user,
            session,
            loading: false,
            initialized: true,
          });

          if (currentUser) {
            setUser({
              id: currentUser.id,
              email: currentUser.email || '',
              name: currentUser.user_metadata?.name || currentUser.profile?.display_name || '',
              avatar: currentUser.profile?.avatar_url,
              plan: currentUser.profile?.plan_type || 'free',
              usage: currentUser.profile?.usage_stats || {
                clipsCreated: 0,
                exportsUsed: 0,
                storageUsed: 0,
                lastResetDate: new Date().toISOString()
              },
              notifications: currentUser.profile?.preferences?.notifications || {
                email: true,
                push: true
              },
              createdAt: currentUser.created_at
            });
          }
        } else {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          });
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, loadUserProfile]);

  return authState;
}
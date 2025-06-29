import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, onAuthStateChange, getCurrentUser, createUserProfileManually, clearUserCache } from '../lib/auth';
import { useAppStore } from '../store';
import { logger } from '../lib/logger';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

// Track global auth initialization to prevent duplicate initializations
const globalAuthInitialized = {
  value: false
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
    error: null
  });

  const setUser = useAppStore((state) => state.setUser);
  const loadUserProfile = useAppStore((state) => state.loadUserProfile);
  
  // Track component mount status
  const mounted = useRef(true);
  // Track initialization status for this instance
  const instanceInitialized = useRef(false);
  // Track profile loading status to prevent duplicate loads
  const isLoadingProfile = useRef(false);

  useEffect(() => {
    mounted.current = true;
    logger.info('useAuth hook initialized');

    // Initialize auth state
    const initializeAuth = async () => {
      // Prevent multiple initializations globally and per instance
      if (instanceInitialized.current) {
        logger.debug('Auth already initialized for this instance, skipping');
        return;
      }
      
      instanceInitialized.current = true;
      
      try {
        logger.info('Starting auth initialization');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted.current) {
          logger.info('Component unmounted during auth initialization, aborting');
          return;
        }
        
        if (session?.user) {
          logger.info('Session found during initialization', { userId: session.user.id });
          
          // Set basic auth state immediately to prevent perpetual loading
          setAuthState({
            user: session.user,
            session,
            loading: true, // Still loading profile
            initialized: true,
            error: null
          });
          
          // Load user profile only if not already loading
          if (!isLoadingProfile.current) {
            isLoadingProfile.current = true;
            
            try {
              logger.info('Fetching current user with profile');
              const currentUser = await getCurrentUser();
              
              if (!mounted.current) {
                logger.info('Component unmounted during profile fetch, aborting');
                return;
              }
              
              if (currentUser) {
                logger.info('User profile found', { userId: currentUser.id });
                // User with profile found
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
                
                logger.info('User profile loaded successfully', { userId: currentUser.id });
              } else {
                // User exists but no profile - create one
                logger.warn('User authenticated but no profile found, creating profile', { userId: session.user.id });
                await createUserProfileManually(
                  session.user, 
                  session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
                );
                
                // Try again to get the user with profile
                logger.info('Retrying to get user profile after creation');
                const retryUser = await getCurrentUser();
                
                if (!mounted.current) {
                  logger.info('Component unmounted during retry profile fetch, aborting');
                  return;
                }
                
                if (retryUser) {
                  logger.info('User profile retrieved after creation', { userId: retryUser.id });
                  setUser({
                    id: retryUser.id,
                    email: retryUser.email || '',
                    name: retryUser.user_metadata?.name || retryUser.profile?.display_name || '',
                    avatar: retryUser.profile?.avatar_url,
                    plan: retryUser.profile?.plan_type || 'free',
                    usage: retryUser.profile?.usage_stats || {
                      clipsCreated: 0,
                      exportsUsed: 0,
                      storageUsed: 0,
                      lastResetDate: new Date().toISOString()
                    },
                    notifications: retryUser.profile?.preferences?.notifications || {
                      email: true,
                      push: true
                    },
                    createdAt: retryUser.created_at
                  });
                } else {
                  // Still no profile, use basic user info
                  logger.error('Failed to create or retrieve user profile', { userId: session.user.id });
                  setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                    plan: 'free',
                    usage: {
                      clipsCreated: 0,
                      exportsUsed: 0,
                      storageUsed: 0,
                      lastResetDate: new Date().toISOString()
                    },
                    notifications: {
                      email: true,
                      push: true
                    },
                    createdAt: session.user.created_at || new Date().toISOString()
                  });
                }
              }
            } catch (profileError) {
              logger.error('Profile loading failed', profileError as Error, { userId: session.user.id });
              // Still consider the user authenticated even if profile fails
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                plan: 'free',
                usage: {
                  clipsCreated: 0,
                  exportsUsed: 0,
                  storageUsed: 0,
                  lastResetDate: new Date().toISOString()
                },
                notifications: {
                  email: true,
                  push: true
                },
                createdAt: session.user.created_at || new Date().toISOString()
              });
              
              if (mounted.current) {
                setAuthState(prev => ({
                  ...prev,
                  error: 'Failed to load user profile'
                }));
              }
            } finally {
              isLoadingProfile.current = false;
              
              // Always update loading state to false, regardless of profile loading success
              if (mounted.current) {
                logger.info('Finishing auth initialization with user', { userId: session.user.id });
                setAuthState(prev => ({
                  ...prev,
                  loading: false
                }));
              }
            }
          }
        } else {
          logger.info('No session found during initialization');
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
            error: null
          });
          setUser(null);
        }
      } catch (error) {
        logger.error('Auth initialization failed', error as Error);
        if (mounted.current) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
            error: (error as Error).message
          });
          setUser(null);
        }
      }
    };

    // Only initialize once
    if (!globalAuthInitialized.value) {
      globalAuthInitialized.value = true;
      initializeAuth();
    } else {
      // If already initialized globally, just update this instance's state
      logger.debug('Auth already initialized globally, updating local state');
      setAuthState(prev => ({
        ...prev,
        initialized: true
      }));
    }

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      logger.info('Auth state changed', { event, userId: session?.user?.id });

      if (!mounted.current) {
        logger.info('Component unmounted during auth state change, aborting');
        return;
      }

      if (session?.user) {
        // Set basic auth state immediately
        setAuthState(prev => ({
          ...prev,
          user: session.user,
          session,
          loading: true, // Still loading profile
          initialized: true,
          error: null
        }));

        // Load user profile only if not already loading
        if (!isLoadingProfile.current) {
          isLoadingProfile.current = true;
          
          try {
            logger.info('Fetching user profile after auth state change', { userId: session.user.id });
            const currentUser = await getCurrentUser();
            
            if (!mounted.current) {
              logger.info('Component unmounted during profile fetch after auth change, aborting');
              return;
            }
            
            if (currentUser) {
              logger.info('User profile found after auth state change', { userId: currentUser.id });
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
            } else {
              // User exists but no profile - create one
              logger.warn('User authenticated but no profile found on state change', { userId: session.user.id });
              await createUserProfileManually(
                session.user, 
                session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
              );
              
              // Use basic user info
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                plan: 'free',
                usage: {
                  clipsCreated: 0,
                  exportsUsed: 0,
                  storageUsed: 0,
                  lastResetDate: new Date().toISOString()
                },
                notifications: {
                  email: true,
                  push: true
                },
                createdAt: session.user.created_at || new Date().toISOString()
              });
            }
          } catch (error) {
            logger.error('Profile loading failed during auth change', error as Error, { userId: session.user.id });
            // Still consider the user authenticated even if profile fails
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              plan: 'free',
              usage: {
                clipsCreated: 0,
                exportsUsed: 0,
                storageUsed: 0,
                lastResetDate: new Date().toISOString()
              },
              notifications: {
                email: true,
                push: true
              },
              createdAt: session.user.created_at || new Date().toISOString()
            });
            
            if (mounted.current) {
              setAuthState(prev => ({
                ...prev,
                error: 'Failed to load user profile'
              }));
            }
          } finally {
            isLoadingProfile.current = false;
            
            // Always update loading state to false, regardless of profile loading success
            if (mounted.current) {
              logger.info('Finishing auth state change with user', { userId: session.user.id });
              setAuthState(prev => ({
                ...prev,
                loading: false
              }));
            }
          }
        }
      } else {
        logger.info('No user in auth state change event');
        setAuthState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
          error: null
        });
        setUser(null);
        
        // Clear caches on sign out
        clearUserCache();
      }
    });

    return () => {
      logger.info('useAuth hook cleanup');
      mounted.current = false;
      subscription.unsubscribe();
      instanceInitialized.current = false;
    };
  }, [setUser, loadUserProfile]);

  return authState;
}
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logger } from './logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Validation schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const updatePasswordSchema = z.object({
  password: signUpSchema.shape.password,
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }),
});

// Error message mapping for user-friendly errors
const AUTH_ERROR_MESSAGES = {
  'User already registered': 'An account with this email already exists. Please sign in instead.',
  'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
  'Email not confirmed': 'Please check your email and click the confirmation link before signing in.',
  'Password should be': 'Password does not meet requirements. Please use at least 8 characters with uppercase, lowercase, and numbers.',
  'Invalid email': 'Please enter a valid email address.',
  'Database error': 'There was a problem creating your account. Please try again in a moment.',
  'rate limit': 'Too many attempts. Please wait a moment before trying again.',
  'after': 'Too many attempts. Please wait a moment before trying again.',
  'Too many requests': 'Too many sign-in attempts. Please wait a moment before trying again.',
};

// Get user-friendly error message
function getUserFriendlyErrorMessage(error: Error): string {
  const message = error.message;
  
  for (const [key, value] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  return message;
}

// Profile creation cache to prevent duplicate creation attempts
const profileCreationCache = new Set<string>();

// Enhanced auth functions with proper error handling
export async function signUp(email: string, password: string, name: string) {
  try {
    logger.info('Starting user registration', { email });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          display_name: name,
        },
      },
    });

    if (error) {
      logger.error('Sign up failed', error, { email });
      throw new Error(getUserFriendlyErrorMessage(error));
    }

    if (!data.user) {
      throw new Error('Registration failed - no user returned');
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      logger.info('User registered, email confirmation required', { email });
      return { 
        user: data.user, 
        session: null,
        needsEmailConfirmation: true 
      };
    }

    // If session exists, the user profile should be created automatically by the trigger
    if (data.session) {
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify profile was created
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it manually
          logger.warn('Profile not created by trigger, creating manually', { userId: data.user.id });
          await createUserProfileManually(data.user, name);
        }
      } catch (profileCheckError) {
        logger.warn('Could not verify profile creation', profileCheckError as Error);
        // Continue anyway, profile might be created later
      }

      logger.info('User registered and profile created', { userId: data.user.id });
    }

    return { 
      user: data.user, 
      session: data.session,
      needsEmailConfirmation: false 
    };
  } catch (error) {
    logger.error('Sign up error', error as Error, { email });
    throw error;
  }
}

// Manual profile creation fallback - exported for use in useAuth
export async function createUserProfileManually(user: any, name: string) {
  try {
    // Prevent duplicate creation attempts for the same user
    const userId = user.id;
    if (profileCreationCache.has(userId)) {
      logger.info('Profile creation already in progress, skipping', { userId });
      return;
    }
    
    profileCreationCache.add(userId);
    
    // First check if profile already exists to avoid conflicts
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (existingProfile) {
      logger.info('Profile already exists, skipping creation', { userId });
      profileCreationCache.delete(userId);
      return;
    }
    
    // Create profile with retry logic
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      logger.info(`Attempting to create user profile (attempts left: ${retries})`, { userId });
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          display_name: name,
          plan_type: 'free',
          usage_stats: {
            clips_created: 0,
            exports_used: 0,
            storage_used: 0,
            last_reset_date: new Date().toISOString()
          },
          preferences: {
            notifications: {
              email: true,
              push: true
            },
            default_export_settings: {
              format: 'mp4',
              quality: 'high',
              include_captions: true
            }
          },
          onboarding_completed: false
        });
        
      if (!error) {
        logger.info('Profile created successfully', { userId });
        profileCreationCache.delete(userId);
        return;
      }
      
      lastError = error;
      logger.warn(`Profile creation failed, retrying (${retries} attempts left)`, error);
      retries--;
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    logger.error('Manual profile creation failed after retries', lastError);
    profileCreationCache.delete(userId);
    throw lastError;
  } catch (error) {
    profileCreationCache.delete(user.id);
    logger.error('Manual profile creation error', error as Error);
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  try {
    logger.info('Starting user sign in', { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Sign in failed', error, { email });
      throw new Error(getUserFriendlyErrorMessage(error));
    }

    if (!data.user || !data.session) {
      throw new Error('Sign in failed - invalid credentials');
    }

    // Ensure user profile exists
    await ensureUserProfile(data.user);

    logger.info('User signed in successfully', { userId: data.user.id });
    return { user: data.user, session: data.session };
  } catch (error) {
    logger.error('Sign in error', error as Error, { email });
    throw error;
  }
}

export async function signOut() {
  try {
    logger.info('Starting user sign out');

    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out failed', error);
      throw new Error(error.message);
    }

    logger.info('User signed out successfully');
  } catch (error) {
    logger.error('Sign out error', error as Error);
    throw error;
  }
}

export async function resetPassword(email: string) {
  try {
    logger.info('Starting password reset', { email });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      logger.error('Password reset failed', error, { email });
      throw new Error(getUserFriendlyErrorMessage(error));
    }

    logger.info('Password reset email sent', { email });
  } catch (error) {
    logger.error('Password reset error', error as Error, { email });
    throw error;
  }
}

export async function updatePassword(password: string) {
  try {
    logger.info('Starting password update');

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      logger.error('Password update failed', error);
      throw new Error(error.message);
    }

    logger.info('Password updated successfully');
  } catch (error) {
    logger.error('Password update error', error as Error);
    throw error;
  }
}

export async function updateProfile(profile: {
  name: string;
  email: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
}) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    logger.info('Starting profile update', { userId: user.id });

    // Update auth user metadata
    const { error: authError } = await supabase.auth.updateUser({
      email: profile.email,
      data: {
        name: profile.name,
        display_name: profile.name,
        notifications: profile.notifications,
      },
    });

    if (authError) {
      logger.error('Auth profile update failed', authError);
      throw new Error(authError.message);
    }

    // Update user profile table
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        display_name: profile.name,
        preferences: {
          notifications: profile.notifications
        },
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      logger.error('Profile table update failed', profileError);
      throw new Error(profileError.message);
    }

    logger.info('Profile updated successfully', { userId: user.id });

    // Return updated user
    const { data: updatedUser } = await supabase.auth.getUser();
    return updatedUser.user;
  } catch (error) {
    logger.error('Profile update error', error as Error);
    throw error;
  }
}

// Session management
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('Get session failed', error);
      throw new Error(error.message);
    }
    return session;
  } catch (error) {
    logger.error('Get session error', error as Error);
    throw error;
  }
}

export async function refreshSession() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      logger.error('Refresh session failed', error);
      throw new Error(error.message);
    }
    return session;
  } catch (error) {
    logger.error('Refresh session error', error as Error);
    throw error;
  }
}

// User profile cache to prevent redundant fetches
const userProfileCache = new Map();

// User profile management
async function ensureUserProfile(user: any) {
  try {
    // Check cache first
    if (userProfileCache.has(user.id)) {
      logger.debug('Using cached profile check result', { userId: user.id });
      return;
    }
    
    logger.info('Ensuring user profile exists', { userId: user.id });
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      logger.warn('Profile not found during sign-in, creating profile', { userId: user.id });
      await createUserProfileManually(
        user, 
        user.user_metadata?.name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
      );
    } else if (error) {
      logger.error('Failed to check user profile', error);
      throw error;
    } else {
      logger.info('User profile exists', { userId: user.id });
      // Cache the result
      userProfileCache.set(user.id, true);
    }
  } catch (error) {
    logger.error('Ensure user profile error', error as Error);
    throw error;
  }
}

// Auth state listener
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

// Get current user with profile - with caching
const userCache = new Map();
const pendingUserFetches = new Map();

// Get current user with profile
export async function getCurrentUser() {
  try {
    logger.debug('Getting current user');
    
    // Get the auth user first
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.error('Get current user failed', error);
      return null;
    }

    if (!user) {
      logger.debug('No current user found');
      return null;
    }
    
    // Check if we have a cached user with profile
    if (userCache.has(user.id)) {
      logger.debug('Returning cached user with profile', { userId: user.id });
      return userCache.get(user.id);
    }
    
    // Check if there's already a pending fetch for this user
    if (pendingUserFetches.has(user.id)) {
      logger.debug('Waiting for pending user fetch to complete', { userId: user.id });
      return pendingUserFetches.get(user.id);
    }
    
    // Create a promise for this fetch and store it
    const fetchPromise = (async () => {
      try {
        // Get user profile
        logger.debug('Getting user profile', { userId: user.id });
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          logger.error('Failed to get user profile', profileError);
        }

        const userWithProfile = {
          ...user,
          profile: profile || null
        };
        
        // Cache the result
        userCache.set(user.id, userWithProfile);
        
        logger.debug('Current user retrieved', { 
          userId: user.id, 
          hasProfile: !!profile 
        });
        
        return userWithProfile;
      } finally {
        // Remove from pending fetches when done
        pendingUserFetches.delete(user.id);
      }
    })();
    
    // Store the promise
    pendingUserFetches.set(user.id, fetchPromise);
    
    return fetchPromise;
  } catch (error) {
    logger.error('Get current user error', error as Error);
    return null;
  }
}

// Clear user cache
export function clearUserCache(userId?: string) {
  if (userId) {
    userCache.delete(userId);
    userProfileCache.delete(userId);
  } else {
    userCache.clear();
    userProfileCache.clear();
    profileCreationCache.clear();
  }
  
  logger.debug('User cache cleared', { userId: userId || 'all' });
}
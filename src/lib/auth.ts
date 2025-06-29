import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logger } from './logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Registration failed - no user returned');
    }

    // Create user profile
    if (data.user && !data.session) {
      logger.info('User registered, email confirmation required', { email });
      return { 
        user: data.user, 
        session: null,
        needsEmailConfirmation: true 
      };
    }

    // If session exists, create profile immediately
    if (data.session) {
      await createUserProfile(data.user);
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

export async function signIn(email: string, password: string) {
  try {
    logger.info('Starting user sign in', { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Sign in failed', error, { email });
      throw new Error(error.message);
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
      throw new Error(error.message);
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

// User profile management
async function createUserProfile(user: any) {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        display_name: user.user_metadata?.name || user.user_metadata?.display_name || '',
        plan_type: 'free',
        usage_stats: {
          clipsCreated: 0,
          exportsUsed: 0,
          storageUsed: 0,
          lastResetDate: new Date().toISOString()
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

    if (error && error.code !== '23505') { // Ignore duplicate key error
      logger.error('Failed to create user profile', error);
      throw error;
    }

    logger.info('User profile created', { userId: user.id });
  } catch (error) {
    logger.error('Create user profile error', error as Error);
    throw error;
  }
}

async function ensureUserProfile(user: any) {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      await createUserProfile(user);
    } else if (error) {
      logger.error('Failed to check user profile', error);
      throw error;
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

// Get current user with profile
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.error('Get current user failed', error);
      return null;
    }

    if (!user) {
      return null;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      ...user,
      profile: profile || null
    };
  } catch (error) {
    logger.error('Get current user error', error as Error);
    return null;
  }
}
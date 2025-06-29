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
      
      // Provide more user-friendly error messages
      if (error.message.includes('User already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('Password should be')) {
        throw new Error('Password does not meet requirements. Please use at least 8 characters with uppercase, lowercase, and numbers.');
      } else if (error.message.includes('Invalid email')) {
        throw new Error('Please enter a valid email address.');
      } else if (error.message.includes('Database error')) {
        throw new Error('There was a problem creating your account. Please try again in a moment.');
      } else if (error.message.includes('rate limit') || error.message.includes('after') || error.message.includes('Too many')) {
        throw new Error('Too many sign-up attempts. Please wait a moment before trying again.');
      } else {
        throw new Error(error.message);
      }
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
        // Try to create profile anyway
        await createUserProfileManually(data.user, name);
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
    // First check if profile already exists to avoid conflicts
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (existingProfile) {
      logger.info('Profile already exists, skipping creation', { userId: user.id });
      return;
    }
    
    // Create profile with retry logic
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
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
        logger.info('Manual profile creation successful', { userId: user.id });
        return;
      }
      
      lastError = error;
      retries--;
      
      if (retries > 0) {
        logger.warn(`Profile creation failed, retrying (${retries} attempts left)`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    logger.error('Manual profile creation failed after retries', lastError);
    throw lastError;
  } catch (error) {
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
      
      // Provide more user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and click the confirmation link before signing in.');
      } else if (error.message.includes('Too many requests') || error.message.includes('rate limit')) {
        throw new Error('Too many sign-in attempts. Please wait a moment before trying again.');
      } else {
        throw new Error(error.message);
      }
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
      
      if (error.message.includes('rate limit') || error.message.includes('after')) {
        throw new Error('Too many password reset attempts. Please wait a moment before trying again.');
      }
      
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
async function ensureUserProfile(user: any) {
  try {
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
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      logger.error('Failed to get user profile', profileError);
    }

    return {
      ...user,
      profile: profile || null
    };
  } catch (error) {
    logger.error('Get current user error', error as Error);
    return null;
  }
}
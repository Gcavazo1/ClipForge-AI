import { supabase } from './supabase';
import { z } from 'zod';
import { logger } from './logger';

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

// Auth service class
class AuthService {
  private static instance: AuthService;
  private authStateListeners: Set<(event: string, session: any) => void> = new Set();
  private isInitialized = false;
  private currentUser: any = null;
  private currentSession: any = null;
  private userProfile: any = null;
  private isLoading = true;
  private error: string | null = null;

  private constructor() {
    // Initialize auth state
    this.initialize();
    
    // Listen for auth state changes from Supabase
    supabase.auth.onAuthStateChange(this.handleAuthStateChange.bind(this));
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize auth state
  private async initialize() {
    if (this.isInitialized) return;
    
    try {
      logger.info('Initializing auth service');
      
      // Get session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.error('Failed to get session', error);
        this.setAuthState(null, null, null, false, error.message);
        return;
      }
      
      if (!session) {
        logger.info('No session found during initialization');
        this.setAuthState(null, null, null, false, null);
        return;
      }
      
      // Validate session with Edge Function
      await this.validateSession(session.access_token);
      
    } catch (error) {
      logger.error('Auth initialization failed', error as Error);
      this.setAuthState(null, null, null, false, (error as Error).message);
    } finally {
      this.isInitialized = true;
    }
  }

  // Handle auth state changes
  private async handleAuthStateChange(event: string, session: any) {
    logger.info('Auth state changed', { event, userId: session?.user?.id });
    
    try {
      if (session?.user) {
        // Set loading state
        this.isLoading = true;
        this.notifyListeners();
        
        // Validate session with Edge Function
        await this.validateSession(session.access_token);
      } else {
        // Clear auth state
        this.setAuthState(null, null, null, false, null);
      }
    } catch (error) {
      logger.error('Error handling auth state change', error as Error);
      this.setAuthState(
        session?.user || null, 
        session, 
        null, 
        false, 
        'Failed to load user profile'
      );
    }
    
    // Notify listeners
    this.notifyListeners();
  }

  // Validate session with Edge Function
  private async validateSession(token: string) {
    try {
      logger.info('Validating session with Edge Function');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth/validate-session`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Session validation failed', new Error(errorData.error));
        
        if (response.status === 401) {
          // Session is invalid, sign out
          await supabase.auth.signOut();
          this.setAuthState(null, null, null, false, 'Your session has expired. Please sign in again.');
        } else {
          this.setAuthState(null, null, null, false, errorData.error || 'Failed to validate session');
        }
        return;
      }
      
      const data = await response.json();
      
      // Update auth state
      this.setAuthState(
        data.user, 
        this.currentSession, 
        data.profile, 
        false, 
        null
      );
      
      logger.info('Session validated successfully', { userId: data.user.id });
    } catch (error) {
      logger.error('Session validation error', error as Error);
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        false, 
        'Failed to validate session'
      );
    }
  }

  // Set auth state
  private setAuthState(
    user: any, 
    session: any, 
    profile: any, 
    isLoading: boolean, 
    error: string | null
  ) {
    this.currentUser = user;
    this.currentSession = session;
    this.userProfile = profile;
    this.isLoading = isLoading;
    this.error = error;
    
    // Notify listeners
    this.notifyListeners();
  }

  // Notify listeners of auth state change
  private notifyListeners() {
    this.authStateListeners.forEach(listener => {
      listener('AUTH_STATE_CHANGE', {
        user: this.currentUser,
        session: this.currentSession,
        profile: this.userProfile,
        isLoading: this.isLoading,
        error: this.error
      });
    });
  }

  // Add auth state listener
  public addAuthStateListener(listener: (event: string, state: any) => void) {
    this.authStateListeners.add(listener);
    
    // Immediately notify with current state
    listener('AUTH_STATE_CHANGE', {
      user: this.currentUser,
      session: this.currentSession,
      profile: this.userProfile,
      isLoading: this.isLoading,
      error: this.error
    });
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(listener);
    };
  }

  // Get current auth state
  public getAuthState() {
    return {
      user: this.currentUser,
      session: this.currentSession,
      profile: this.userProfile,
      isLoading: this.isLoading,
      error: this.error,
      isInitialized: this.isInitialized
    };
  }

  // Sign in with email and password
  public async signIn(email: string, password: string) {
    try {
      logger.info('Starting user sign in', { email });
      
      // Validate input
      signInSchema.parse({ email, password });
      
      // Set loading state
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        true, 
        null
      );
      
      // Call Edge Function for sign in
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Sign in failed', new Error(errorData.error), { email });
        throw new Error(errorData.error || 'Failed to sign in');
      }
      
      const data = await response.json();
      
      // Update auth state with Supabase
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      
      logger.info('User signed in successfully', { userId: data.user.id });
      
      return { 
        user: data.user, 
        session: data.session,
        profile: data.profile
      };
    } catch (error) {
      logger.error('Sign in error', error as Error, { email });
      
      // Update error state
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        false, 
        (error as Error).message
      );
      
      throw error;
    }
  }

  // Sign up with email, password, and name
  public async signUp(email: string, password: string, name: string) {
    try {
      logger.info('Starting user registration', { email });
      
      // Validate input
      signUpSchema.parse({ email, password, name });
      
      // Set loading state
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        true, 
        null
      );
      
      // Call Edge Function for sign up
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Sign up failed', new Error(errorData.error), { email });
        throw new Error(errorData.error || 'Failed to sign up');
      }
      
      const data = await response.json();
      
      // If session exists, update auth state with Supabase
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }
      
      logger.info('User registered successfully', { 
        userId: data.user.id,
        needsEmailConfirmation: data.needsEmailConfirmation
      });
      
      return { 
        user: data.user, 
        session: data.session,
        profile: data.profile,
        needsEmailConfirmation: data.needsEmailConfirmation
      };
    } catch (error) {
      logger.error('Sign up error', error as Error, { email });
      
      // Update error state
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        false, 
        (error as Error).message
      );
      
      throw error;
    }
  }

  // Sign out
  public async signOut() {
    try {
      logger.info('Starting user sign out');
      
      // Set loading state
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        true, 
        null
      );
      
      // Sign out with Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.error('Sign out failed', error);
        throw new Error(error.message);
      }
      
      // Clear auth state
      this.setAuthState(null, null, null, false, null);
      
      logger.info('User signed out successfully');
    } catch (error) {
      logger.error('Sign out error', error as Error);
      
      // Update error state
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        false, 
        (error as Error).message
      );
      
      throw error;
    }
  }

  // Reset password
  public async resetPassword(email: string) {
    try {
      logger.info('Starting password reset', { email });
      
      // Validate input
      resetPasswordSchema.parse({ email });
      
      // Reset password with Supabase
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

  // Update password
  public async updatePassword(password: string) {
    try {
      logger.info('Starting password update');
      
      // Validate input
      updatePasswordSchema.parse({ password });
      
      // Update password with Supabase
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

  // Update profile
  public async updateProfile(profile: {
    name: string;
    email: string;
    notifications: {
      email: boolean;
      push: boolean;
    };
  }) {
    try {
      // Validate input
      updateProfileSchema.parse(profile);
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }
      
      logger.info('Starting profile update', { userId: this.currentUser.id });
      
      // Set loading state
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        true, 
        null
      );
      
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
          id: this.currentUser.id,
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
      
      // Refresh user and profile
      await this.refreshUserAndProfile();
      
      logger.info('Profile updated successfully', { userId: this.currentUser.id });
      
      return this.currentUser;
    } catch (error) {
      logger.error('Profile update error', error as Error);
      
      // Update error state
      this.setAuthState(
        this.currentUser, 
        this.currentSession, 
        this.userProfile, 
        false, 
        (error as Error).message
      );
      
      throw error;
    }
  }

  // Refresh user and profile
  private async refreshUserAndProfile() {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        this.setAuthState(null, null, null, false, null);
        return;
      }
      
      // Validate session with Edge Function
      await this.validateSession(session.access_token);
    } catch (error) {
      logger.error('Failed to refresh user and profile', error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
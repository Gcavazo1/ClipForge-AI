import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client with service role for admin access
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Initialize Supabase client with anon key for public access
const supabasePublic = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

interface SuccessResponse {
  user: any;
  profile: any;
  session: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Route handling based on path
    switch (path) {
      case 'validate-session':
        return await handleValidateSession(req);
      case 'create-profile':
        return await handleCreateProfile(req);
      case 'sign-in':
        return await handleSignIn(req);
      case 'sign-up':
        return await handleSignUp(req);
      default:
        return jsonResponse({ error: 'Invalid endpoint' }, 404);
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return jsonResponse({ 
      error: 'Internal server error', 
      details: error.message 
    }, 500);
  }
});

// Validate session and return user with profile
async function handleValidateSession(req: Request) {
  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return jsonResponse({ 
        error: 'Invalid or expired session', 
        code: 'INVALID_SESSION' 
      }, 401);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      const newProfile = await createUserProfile(user);
      
      return jsonResponse({
        user,
        profile: newProfile,
        session: { active: true, expires_at: null }
      });
    } else if (profileError) {
      console.error('Error fetching profile:', profileError);
      return jsonResponse({
        user,
        profile: null,
        error: 'Failed to fetch user profile',
        session: { active: true, expires_at: null }
      });
    }

    // Return user with profile
    return jsonResponse({
      user,
      profile,
      session: { active: true, expires_at: null }
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return jsonResponse({ 
      error: 'Failed to validate session', 
      details: error.message 
    }, 500);
  }
}

// Create user profile
async function handleCreateProfile(req: Request) {
  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return jsonResponse({ 
        error: 'Invalid or expired session', 
        code: 'INVALID_SESSION' 
      }, 401);
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return jsonResponse({ 
        error: 'Profile already exists', 
        code: 'PROFILE_EXISTS' 
      }, 400);
    }

    // Get profile data from request body
    const profileData = await req.json().catch(() => ({}));
    
    // Create profile
    const profile = await createUserProfile(user, profileData);
    
    return jsonResponse({ 
      user, 
      profile,
      created: true
    });
  } catch (error) {
    console.error('Profile creation error:', error);
    return jsonResponse({ 
      error: 'Failed to create profile', 
      details: error.message 
    }, 500);
  }
}

// Handle sign in
async function handleSignIn(req: Request) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return jsonResponse({ 
        error: 'Email and password are required', 
        code: 'MISSING_CREDENTIALS' 
      }, 400);
    }

    // Sign in with email and password
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map error messages to user-friendly errors
      let errorMessage = error.message;
      let statusCode = 400;
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.';
        statusCode = 403;
      } else if (error.message.includes('rate limit') || error.message.includes('Too many')) {
        errorMessage = 'Too many sign-in attempts. Please wait a moment before trying again.';
        statusCode = 429;
      }
      
      return jsonResponse({ 
        error: errorMessage, 
        code: error.code || 'AUTH_ERROR' 
      }, statusCode);
    }

    if (!data.user || !data.session) {
      return jsonResponse({ 
        error: 'Sign in failed - invalid credentials', 
        code: 'INVALID_CREDENTIALS' 
      }, 401);
    }

    // Get or create user profile
    let profile;
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      profile = await createUserProfile(data.user);
    } else if (profileError) {
      console.error('Error fetching profile:', profileError);
      profile = null;
    } else {
      profile = existingProfile;
    }

    // Return user, session, and profile
    return jsonResponse({
      user: data.user,
      session: data.session,
      profile
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return jsonResponse({ 
      error: 'Failed to sign in', 
      details: error.message 
    }, 500);
  }
}

// Handle sign up
async function handleSignUp(req: Request) {
  try {
    const { email, password, name } = await req.json();
    
    if (!email || !password || !name) {
      return jsonResponse({ 
        error: 'Email, password, and name are required', 
        code: 'MISSING_CREDENTIALS' 
      }, 400);
    }

    // Sign up with email and password
    const { data, error } = await supabasePublic.auth.signUp({
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
      // Map error messages to user-friendly errors
      let errorMessage = error.message;
      let statusCode = 400;
      
      if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.message.includes('Password should be')) {
        errorMessage = 'Password does not meet requirements. Please use at least 8 characters with uppercase, lowercase, and numbers.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('Database error')) {
        errorMessage = 'There was a problem creating your account. Please try again in a moment.';
        statusCode = 500;
      } else if (error.message.includes('rate limit') || error.message.includes('after')) {
        errorMessage = 'Too many sign-up attempts. Please wait a moment before trying again.';
        statusCode = 429;
      }
      
      return jsonResponse({ 
        error: errorMessage, 
        code: error.code || 'AUTH_ERROR' 
      }, statusCode);
    }

    if (!data.user) {
      return jsonResponse({ 
        error: 'Registration failed - no user returned', 
        code: 'REGISTRATION_FAILED' 
      }, 500);
    }

    // Check if email confirmation is required
    const needsEmailConfirmation = data.user && !data.session;
    
    // If session exists, create user profile
    let profile = null;
    if (data.session) {
      try {
        profile = await createUserProfile(data.user, { display_name: name });
      } catch (profileError) {
        console.error('Failed to create profile during signup:', profileError);
      }
    }

    // Return user, session, and profile
    return jsonResponse({
      user: data.user,
      session: data.session,
      profile,
      needsEmailConfirmation
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return jsonResponse({ 
      error: 'Failed to sign up', 
      details: error.message 
    }, 500);
  }
}

// Helper function to create user profile
async function createUserProfile(user: any, customData: any = {}) {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      id: user.id,
      display_name: customData.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      plan_type: customData.plan_type || 'free',
      usage_stats: customData.usage_stats || {
        clips_created: 0,
        exports_used: 0,
        storage_used: 0,
        last_reset_date: new Date().toISOString()
      },
      preferences: customData.preferences || {
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
      onboarding_completed: customData.onboarding_completed || false
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create user profile:', error);
    throw new Error(`Failed to create user profile: ${error.message}`);
  }

  return data;
}

// Helper function to return JSON response with CORS headers
function jsonResponse(data: SuccessResponse | ErrorResponse, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}
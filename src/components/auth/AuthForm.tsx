import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import Button from '../ui/button';
import { signIn, signUp, signInSchema, signUpSchema } from '../../lib/auth';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';
import { logger } from '../../lib/logger';

interface AuthFormProps {
  mode: 'signin' | 'signup';
}

const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '', variant: 'default' as const });
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const validatedData = signUpSchema.parse(formData);
        const result = await signUp(
          validatedData.email,
          validatedData.password,
          validatedData.name
        );

        if (result.needsEmailConfirmation) {
          setToastMessage({
            title: 'Check Your Email',
            description: 'We sent you a confirmation link. Please check your email and click the link to activate your account.',
            variant: 'default'
          });
          setShowToast(true);
        } else {
          setToastMessage({
            title: 'Account Created',
            description: 'Welcome to ClipForge! Your account has been created successfully.',
            variant: 'default'
          });
          setShowToast(true);
          
          // Redirect to intended page or dashboard
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      } else {
        const validatedData = signInSchema.parse(formData);
        await signIn(validatedData.email, validatedData.password);
        
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err) {
      logger.error('Authentication error', err as Error, { mode, email: formData.email });
      
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        // Handle specific auth errors
        let errorMessage = err.message;
        
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (errorMessage.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        }
        
        setError(errorMessage);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const switchMode = () => {
    const newPath = mode === 'signin' ? '/signup' : '/signin';
    navigate(newPath, { state: location.state });
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted" size={18} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted" size={18} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted" size={18} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-foreground-muted mt-1">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center text-error-500 text-sm bg-error-900/20 p-3 rounded-md">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              mode === 'signup' ? 'Create Account' : 'Sign In'
            )}
          </Button>

          <div className="text-center text-sm">
            {mode === 'signup' ? (
              <p className="text-foreground-muted">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-primary-400 hover:text-primary-500 font-medium"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <>
                <p className="text-foreground-muted">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-primary-400 hover:text-primary-500 font-medium"
                  >
                    Sign up
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="text-primary-400 hover:text-primary-500 mt-2 block mx-auto"
                >
                  Forgot password?
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast} variant={toastMessage.variant}>
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>
      )}
    </>
  );
};

export default AuthForm;
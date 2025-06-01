import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import Button from '../ui/button';
import { signIn, signUp, signInSchema, signUpSchema } from '../../lib/auth';
import { useAppStore } from '../../store';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';

interface AuthFormProps {
  mode: 'signin' | 'signup';
}

const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const setUser = useAppStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const validatedData = signUpSchema.parse(formData);
        const { user } = await signUp(
          validatedData.email,
          validatedData.password,
          validatedData.name
        );
        setUser(user);
        setShowToast(true);
        navigate('/dashboard');
      } else {
        const validatedData = signInSchema.parse(formData);
        const { user } = await signIn(validatedData.email, validatedData.password);
        setUser(user);
        navigate('/dashboard');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
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
  };

  return (
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
                className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Enter your name"
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
              className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter your email"
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
              className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter your password"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center text-error-500 text-sm">
            <AlertCircle size={16} className="mr-2" />
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
                onClick={() => navigate('/signin')}
                className="text-primary-400 hover:text-primary-500"
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
                  onClick={() => navigate('/signup')}
                  className="text-primary-400 hover:text-primary-500"
                >
                  Sign up
                </button>
              </p>
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-primary-400 hover:text-primary-500 mt-2"
              >
                Forgot password?
              </button>
            </>
          )}
        </div>
      </form>

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>Account Created</ToastTitle>
          <ToastDescription>
            Welcome to ClipForge! Your account has been created successfully.
          </ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default AuthForm;
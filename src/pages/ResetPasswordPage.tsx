import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import Button from '../components/ui/button';
import { resetPassword, resetPasswordSchema } from '../lib/auth';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const validatedData = resetPasswordSchema.parse({ email });
      await resetPassword(validatedData.email);
      
      setEmailSent(true);
      setShowToast(true);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-success-900/20 p-3 rounded-full">
              <CheckCircle size={32} className="text-success-500" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Check your email</h2>
          <p className="text-foreground-muted mb-8">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          
          <div className="space-y-4">
            <Button
              variant="primary"
              onClick={() => navigate('/signin')}
              className="w-full"
            >
              Back to Sign In
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setEmailSent(false)}
              className="w-full"
            >
              Try Different Email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Reset your password</h2>
          <p className="text-sm text-foreground-muted">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center text-error-500 text-sm bg-error-900/20 p-3 rounded-md">
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
                Sending Reset Link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="inline-flex items-center text-sm text-primary-400 hover:text-primary-500"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Sign In
            </button>
          </div>
        </form>
      </div>

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>Reset Link Sent</ToastTitle>
          <ToastDescription>
            Check your email for the password reset link.
          </ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default ResetPasswordPage;
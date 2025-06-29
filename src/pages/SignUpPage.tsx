import React from 'react';
import { Scissors } from 'lucide-react';
import AuthForm from '../components/auth/AuthForm';
import ProtectedRoute from '../components/auth/ProtectedRoute';

const SignUpPage: React.FC = () => {
  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-primary-600 h-12 w-12 rounded-lg flex items-center justify-center">
                <Scissors size={24} className="text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">Create your account</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Get started with ClipForge for free
            </p>
          </div>

          <AuthForm mode="signup" />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SignUpPage;
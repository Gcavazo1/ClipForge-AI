import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthService } from '../../hooks/useAuthService';
import { AlertCircle } from 'lucide-react';
import { logger } from '../../lib/logger';
import Loader from '../ui/loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  redirectTo = '/signin'
}) => {
  const { user, loading, initialized, error } = useAuthService();
  const location = useLocation();

  logger.debug('ProtectedRoute render state', { 
    path: location.pathname,
    initialized,
    loading,
    hasUser: !!user,
    requireAuth,
    hasError: !!error
  });

  // Show loading spinner while auth is initializing
  if (!initialized) {
    return (
      <Loader 
        fullScreen 
        size="lg" 
        message="Initializing application..." 
      />
    );
  }

  // Show loading spinner while auth state is loading
  if (loading) {
    return (
      <Loader 
        fullScreen 
        size="lg" 
        message="Loading your profile..." 
      />
    );
  }

  // Show error state if there's an authentication error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="bg-error-900/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-error-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Redirect if auth is required but user is not authenticated
  if (requireAuth && !user) {
    logger.info('Redirecting unauthenticated user', { 
      from: location.pathname, 
      to: redirectTo 
    });
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Redirect if user is authenticated but shouldn't be (e.g., on login page)
  if (!requireAuth && user) {
    const from = location.state?.from?.pathname || '/dashboard';
    logger.info('Redirecting authenticated user', { 
      from: location.pathname, 
      to: from 
    });
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
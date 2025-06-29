import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Scissors, LogOut, Settings, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import Button from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../lib/auth';
import { Tooltip } from '../ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { getCurrentSubscription } from '../../lib/stripe';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';
import { logger } from '../../lib/logger';

interface NavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, initialized, error } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  
  const showSidebarToggle = location.pathname !== '/' && 
                           !location.pathname.includes('/signin') && 
                           !location.pathname.includes('/signup') &&
                           !location.pathname.includes('/reset-password');

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: getCurrentSubscription,
    enabled: !!user && initialized && !loading,
    retry: 1,
    onError: (err) => {
      logger.error('Failed to load subscription:', err as Error);
    }
  });

  // Show error toast when auth error occurs
  useEffect(() => {
    if (error) {
      setToastError(error);
      setShowToast(true);
    }
  }, [error]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      logger.info('Signing out user', { userId: user?.id });
      await signOut();
      navigate('/');
    } catch (error) {
      logger.error('Sign out failed:', error as Error);
      setToastError('Failed to sign out. Please try again.');
      setShowToast(true);
    } finally {
      setIsSigningOut(false);
      setShowUserMenu(false);
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return '';
    return user.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  };

  // Get user initial
  const getUserInitial = () => {
    if (!user) return 'U';
    return (user.name || user.user_metadata?.name || user.email || 'U').charAt(0).toUpperCase();
  };
  
  logger.debug('Navbar render state', { 
    initialized, 
    loading, 
    hasUser: !!user, 
    isLoadingSubscription 
  });
  
  return (
    <header 
      className={`fixed top-0 left-0 right-0 h-[var(--nav-height)] z-40 transition-all duration-300 ${
        scrolled 
          ? 'bg-background/70 backdrop-blur-md border-b border-primary-500/20 shadow-lg shadow-primary-500/5' 
          : 'bg-background/40 backdrop-blur-sm border-b border-background-lighter'
      }`}
    >
      <div className="h-full px-4 md:px-6 flex items-center justify-between relative">
        {/* Liquid morphism effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[100px] bg-primary-500/5 rounded-full blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-500/5 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '8s' }}></div>
        </div>
        
        <div className="flex items-center relative z-10">
          {showSidebarToggle && user && (
            <button 
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              onClick={toggleSidebar}
              className="p-2 mr-2 rounded-md hover:bg-white/10 transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          
          <Link to="/" className="flex items-center">
            <div className="flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 h-9 w-9 rounded-md mr-2 shadow-lg shadow-primary-500/20">
              <Scissors size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent title-font">
              ClipForge AI
            </span>
          </Link>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          {!initialized ? (
            <div className="flex items-center">
              <Loader2 size={20} className="animate-spin mr-2 text-primary-400" />
              <span className="text-sm text-foreground-muted">Initializing...</span>
            </div>
          ) : loading ? (
            <div className="flex items-center">
              <Loader2 size={20} className="animate-spin mr-2 text-primary-400" />
              <span className="text-sm text-foreground-muted">Loading profile...</span>
            </div>
          ) : user ? (
            <>
              {isLoadingSubscription ? (
                <div className="w-12 h-6 bg-background-lighter/50 rounded-full animate-pulse" />
              ) : subscription && (
                <Tooltip content={`${subscription.status === 'active' ? 'Active Pro Plan' : 'Free Plan'}`}>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    subscription.status === 'active' 
                      ? 'bg-gradient-to-r from-primary-900/50 to-primary-800/50 text-primary-400 border border-primary-500/30'
                      : 'bg-background-lighter/50 text-foreground-muted backdrop-blur-sm'
                  }`}>
                    {subscription.status === 'active' ? 'Pro' : 'Free'}
                  </div>
                </Tooltip>
              )}
              
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  <div className="bg-gradient-to-br from-primary-600/80 to-secondary-600/80 h-8 w-8 rounded-full flex items-center justify-center shadow-md">
                    {getUserInitial()}
                  </div>
                  <span className="hidden md:block text-sm font-medium">
                    {getUserDisplayName()}
                  </span>
                </button>

                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-background/80 backdrop-blur-md border border-primary-500/20 rounded-lg shadow-lg shadow-primary-500/10 z-20">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-background-lighter">
                        <div className="flex items-center">
                          <div className="bg-gradient-to-br from-primary-600/80 to-secondary-600/80 h-10 w-10 rounded-full flex items-center justify-center mr-3 shadow-md">
                            {getUserInitial()}
                          </div>
                          <div>
                            <div className="font-medium">{getUserDisplayName()}</div>
                            <div className="text-sm text-foreground-muted">{user.email}</div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            navigate('/settings');
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center transition-colors"
                        >
                          <Settings size={16} className="mr-3" />
                          <span>Settings</span>
                        </button>

                        <button
                          onClick={() => {
                            navigate('/pricing');
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center transition-colors"
                        >
                          <CreditCard size={16} className="mr-3" />
                          <span>Billing</span>
                        </button>

                        <div className="border-t border-background-lighter mt-2 pt-2">
                          <button
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center text-error-500 transition-colors disabled:opacity-50"
                          >
                            {isSigningOut ? (
                              <Loader2 size={16} className="animate-spin mr-3" />
                            ) : (
                              <LogOut size={16} className="mr-3" />
                            )}
                            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/signin')}
                className="bg-background/40 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20"
              >
                Sign In
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 border-none shadow-md shadow-primary-500/20"
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>

      {showToast && toastError && (
        <Toast open={showToast} onOpenChange={setShowToast} variant="error">
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>{toastError}</ToastDescription>
        </Toast>
      )}
      
      {error && !toastError && (
        <Toast open={!!error} onOpenChange={() => setToastError(null)} variant="error">
          <ToastTitle>Authentication Error</ToastTitle>
          <ToastDescription>{error}</ToastDescription>
        </Toast>
      )}
    </header>
  );
};

export default Navbar;
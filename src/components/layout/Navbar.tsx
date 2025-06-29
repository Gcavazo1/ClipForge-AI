import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Scissors, LogOut, Settings, CreditCard, User } from 'lucide-react';
import Button from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../lib/auth';
import { Tooltip } from '../ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { getCurrentSubscription } from '../../lib/stripe';

interface NavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const showSidebarToggle = location.pathname !== '/' && 
                           !location.pathname.includes('/signin') && 
                           !location.pathname.includes('/signup') &&
                           !location.pathname.includes('/reset-password');

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: getCurrentSubscription,
    enabled: !!user,
  });

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsSigningOut(false);
      setShowUserMenu(false);
    }
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 h-[var(--nav-height)] bg-background z-40 border-b border-background-lighter">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center">
          {showSidebarToggle && user && (
            <button 
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              onClick={toggleSidebar}
              className="p-2 mr-2 rounded-md hover:bg-background-lighter md:hidden"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          
          <Link to="/" className="flex items-center">
            <div className="flex items-center justify-center bg-primary-600 h-9 w-9 rounded-md mr-2">
              <Scissors size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
              ClipForge AI
            </span>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 bg-background-lighter rounded-full animate-pulse" />
          ) : user ? (
            <>
              {subscription && (
                <Tooltip content={`${subscription.status === 'active' ? 'Active Pro Plan' : 'Free Plan'}`}>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    subscription.status === 'active' 
                      ? 'bg-primary-900/30 text-primary-400'
                      : 'bg-background-lighter text-foreground-muted'
                  }`}>
                    {subscription.status === 'active' ? 'Pro' : 'Free'}
                  </div>
                </Tooltip>
              )}
              
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-background-lighter transition-colors"
                >
                  <div className="bg-background-lighter h-8 w-8 rounded-full flex items-center justify-center">
                    {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden md:block text-sm font-medium">
                    {user.user_metadata?.name || user.email}
                  </span>
                </button>

                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-background-light border border-background-lighter rounded-lg shadow-lg z-20">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-background-lighter">
                        <div className="flex items-center">
                          <div className="bg-background-lighter h-10 w-10 rounded-full flex items-center justify-center mr-3">
                            {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-medium">{user.user_metadata?.name || 'User'}</div>
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
                          className="w-full px-4 py-2 text-left hover:bg-background-lighter flex items-center transition-colors"
                        >
                          <Settings size={16} className="mr-3" />
                          <span>Settings</span>
                        </button>

                        <button
                          onClick={() => {
                            navigate('/pricing');
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-background-lighter flex items-center transition-colors"
                        >
                          <CreditCard size={16} className="mr-3" />
                          <span>Billing</span>
                        </button>

                        <div className="border-t border-background-lighter mt-2 pt-2">
                          <button
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="w-full px-4 py-2 text-left hover:bg-background-lighter flex items-center text-error-500 transition-colors disabled:opacity-50"
                          >
                            <LogOut size={16} className="mr-3" />
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
              >
                Sign In
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
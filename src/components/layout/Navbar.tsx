import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Scissors, LogOut, Settings, CreditCard } from 'lucide-react';
import Button from '../ui/button';
import { useAppStore } from '../../store';
import { Tooltip } from '../ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { getCurrentSubscription } from '../../lib/stripe';

interface NavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const user = useAppStore((state) => state.user);
  const showSidebarToggle = location.pathname !== '/';

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: getCurrentSubscription,
    enabled: isAuthenticated,
  });
  
  return (
    <header className="fixed top-0 left-0 right-0 h-[var(--nav-height)] bg-background z-40 border-b border-background-lighter">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center">
          {showSidebarToggle && (
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
          {isAuthenticated ? (
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
              <div className="hidden md:flex items-center mr-2">
                <div className="bg-background-lighter h-8 w-8 rounded-full flex items-center justify-center mr-2">
                  {user?.name.charAt(0)}
                </div>
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  aria-label="Account settings"
                  icon={<Settings size={18} />}
                  onClick={() => window.location.href = '/settings'}
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  aria-label="Log out"
                  icon={<LogOut size={18} />}
                />
              </div>
            </>
          ) : (
            <Button variant="primary" size="sm">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
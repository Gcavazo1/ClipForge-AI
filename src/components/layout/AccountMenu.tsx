```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, Settings, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentSubscription } from '../../lib/stripe';
import { useAppStore } from '../../store';
import { formatDate } from '../../lib/utils';

const AccountMenu: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: getCurrentSubscription,
  });

  return (
    <div className="py-2">
      {/* User Info */}
      <div className="px-4 py-3 border-b border-background-lighter">
        <div className="flex items-center">
          <div className="bg-background-lighter h-10 w-10 rounded-full flex items-center justify-center mr-3">
            {user?.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium">{user?.name}</div>
            <div className="text-sm text-foreground-muted">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      {subscription && (
        <div className="px-4 py-3 border-b border-background-lighter">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              {subscription.status === 'active' ? 'Pro Plan' : 'Free Plan'}
            </span>
            {subscription.status === 'active' && (
              <span className="text-xs bg-success-900/20 text-success-500 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          {subscription.current_period_end && (
            <div className="text-xs text-foreground-muted">
              {subscription.status === 'active'
                ? \`Renews ${formatDate(subscription.current_period_end * 1000)}`
                : 'Upgrade to Pro for more features'}
            </div>
          )}
        </div>
      )}

      {/* Menu Items */}
      <div className="py-2">
        <button
          onClick={() => navigate('/settings')}
          className="w-full px-4 py-2 text-left hover:bg-background-lighter flex items-center"
        >
          <User size={16} className="mr-3" />
          <span>Account Settings</span>
        </button>

        <button
          onClick={() => navigate('/billing')}
          className="w-full px-4 py-2 text-left hover:bg-background-lighter flex items-center"
        >
          <CreditCard size={16} className="mr-3" />
          <span>Billing</span>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="w-full px-4 py-2 text-left hover:bg-background-lighter flex items-center"
        >
          <Settings size={16} className="mr-3" />
          <span>Preferences</span>
        </button>

        <div className="border-t border-background-lighter mt-2 pt-2">
          <button
            onClick={() => {/* handle logout */}}
            className="w-full px-4 py-2 text-left hover:bg-background-lighter flex items-center text-error-500"
          >
            <LogOut size={16} className="mr-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountMenu;
```
```tsx
import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentSubscription } from '../../lib/stripe';
import { formatDate } from '../../lib/utils';

interface SubscriptionAlertProps {
  className?: string;
}

const SubscriptionAlert: React.FC<SubscriptionAlertProps> = ({ className = '' }) => {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: getCurrentSubscription,
  });

  if (!subscription) return null;

  // Trial ending soon
  if (subscription.status === 'trialing' && subscription.current_period_end) {
    const daysLeft = Math.ceil(
      (subscription.current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft <= 3) {
      return (
        <div className={\`bg-warning-900/20 text-warning-500 px-4 py-2 rounded-lg flex items-center ${className}`}>
          <Clock size={16} className="mr-2" />
          <span className="text-sm">
            Trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''} on{' '}
            {formatDate(subscription.current_period_end * 1000)}
          </span>
        </div>
      );
    }
  }

  // Subscription ending
  if (subscription.cancel_at_period_end && subscription.current_period_end) {
    return (
      <div className={\`bg-error-900/20 text-error-500 px-4 py-2 rounded-lg flex items-center ${className}`}>
        <AlertCircle size={16} className="mr-2" />
        <span className="text-sm">
          Your subscription will end on {formatDate(subscription.current_period_end * 1000)}
        </span>
      </div>
    );
  }

  // Free user
  if (subscription.status === 'not_started') {
    return (
      <div className={\`bg-primary-900/20 text-primary-400 px-4 py-2 rounded-lg flex items-center ${className}`}>
        <AlertCircle size={16} className="mr-2" />
        <span className="text-sm">
          Upgrade to Pro for unlimited access to all features
        </span>
      </div>
    );
  }

  return null;
};

export default SubscriptionAlert;
```
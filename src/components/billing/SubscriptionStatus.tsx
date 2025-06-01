import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CreditCard, Calendar, AlertCircle } from 'lucide-react';
import Button from '../ui/button';
import { getCurrentSubscription } from '../../lib/stripe';
import { getPlanFromPriceId } from '../../lib/stripe';
import { STRIPE_PRODUCTS } from '../../stripe-config';

const SubscriptionStatus: React.FC = () => {
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: getCurrentSubscription,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-background-lighter rounded-lg" />
        <div className="h-16 bg-background-lighter rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-error-500 p-4 rounded-lg bg-error-900/20 flex items-center">
        <AlertCircle size={20} className="mr-2" />
        Failed to load subscription status
      </div>
    );
  }

  const plan = subscription?.price_id ? getPlanFromPriceId(subscription.price_id) : 'FREE';
  const productInfo = STRIPE_PRODUCTS[plan || 'FREE'];

  return (
    <div className="space-y-6">
      <div className="bg-background-lighter p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{productInfo.name}</h3>
          {subscription?.payment_method_brand && (
            <div className="flex items-center text-sm text-foreground-muted">
              <CreditCard size={16} className="mr-2" />
              {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
            </div>
          )}
        </div>

        {subscription?.current_period_end && (
          <div className="flex items-center text-sm text-foreground-muted">
            <Calendar size={16} className="mr-2" />
            Next billing date:{' '}
            {format(new Date(subscription.current_period_end * 1000), 'MMMM d, yyyy')}
          </div>
        )}

        {subscription?.cancel_at_period_end && (
          <div className="mt-4 p-3 bg-warning-900/20 text-warning-500 rounded-md text-sm">
            Your subscription will end on{' '}
            {format(new Date(subscription.current_period_end * 1000), 'MMMM d, yyyy')}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Plan Features</h4>
        <ul className="text-sm space-y-2">
          {productInfo.features.map((feature, index) => (
            <li key={index} className="flex items-center text-foreground-muted">
              <span className="mr-2">•</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {plan === 'FREE' && (
        <Button
          variant="primary"
          className="w-full"
          onClick={() => window.location.href = '/pricing'}
        >
          Upgrade to Pro
        </Button>
      )}
    </div>
  );
};

export default SubscriptionStatus;
import React from 'react';
import { format } from 'date-fns';
import { Receipt, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getOrderHistory } from '../../lib/stripe';

const BillingHistory: React.FC = () => {
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orderHistory'],
    queryFn: getOrderHistory,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-background-lighter rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-error-500 p-4 rounded-lg bg-error-900/20">
        Failed to load billing history
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="text-center py-8">
        <Receipt size={32} className="mx-auto mb-4 text-foreground-muted" />
        <p className="text-foreground-muted">No billing history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.order_id}
          className="bg-background-lighter p-4 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center">
            <CreditCard size={20} className="text-primary-500 mr-3" />
            <div>
              <div className="font-medium">
                {order.amount_total / 100} {order.currency.toUpperCase()}
              </div>
              <div className="text-sm text-foreground-muted">
                {format(new Date(order.order_date), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          <div className="text-sm">
            <span className={`px-2 py-1 rounded-full ${
              order.payment_status === 'paid'
                ? 'bg-success-900/20 text-success-500'
                : 'bg-warning-900/20 text-warning-500'
            }`}>
              {order.payment_status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BillingHistory;
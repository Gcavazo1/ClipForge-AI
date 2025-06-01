import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from './supabase';
import { logger } from './logger';

export async function createCheckoutSession(priceId: string, mode: 'payment' | 'subscription') {
  try {
    logger.info('Creating checkout session', { priceId, mode });
    
    const { data: { session_id } } = await supabase.auth.getSession();

    if (!session_id) {
      logger.error('Failed to create checkout session: Not authenticated');
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session_id}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: `${window.location.origin}/checkout/success`,
        cancel_url: `${window.location.origin}/checkout/cancel`,
        mode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Checkout session creation failed', new Error(error.message), { priceId, mode });
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    logger.info('Checkout session created successfully', { priceId, mode });
    return url;
  } catch (error) {
    logger.error('Unexpected error creating checkout session', error as Error, { priceId, mode });
    throw error;
  }
}

export async function getCurrentSubscription() {
  try {
    logger.debug('Fetching current subscription');
    
    const { data: subscription, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('Error fetching subscription', new Error(error.message));
      return null;
    }

    logger.debug('Subscription fetched successfully', { subscription });
    return subscription;
  } catch (error) {
    logger.error('Unexpected error fetching subscription', error as Error);
    return null;
  }
}

export async function getOrderHistory() {
  try {
    logger.debug('Fetching order history');
    
    const { data: orders, error } = await supabase
      .from('stripe_user_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (error) {
      logger.error('Error fetching orders', new Error(error.message));
      return [];
    }

    logger.debug('Order history fetched successfully', { orderCount: orders.length });
    return orders;
  } catch (error) {
    logger.error('Unexpected error fetching orders', error as Error);
    return [];
  }
}

export function getPlanFromPriceId(priceId: string): keyof typeof STRIPE_PRODUCTS | null {
  logger.debug('Getting plan from price ID', { priceId });
  
  for (const [plan, product] of Object.entries(STRIPE_PRODUCTS)) {
    if (product.priceId === priceId) {
      logger.debug('Plan found for price ID', { priceId, plan });
      return plan as keyof typeof STRIPE_PRODUCTS;
    }
  }
  
  logger.warn('No plan found for price ID', { priceId });
  return null;
}
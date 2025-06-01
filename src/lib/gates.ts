import { User } from '../types';
import { logger } from './logger';
import { PLAN_LIMITS } from './usage';
import { getCurrentSubscription } from './stripe';

export async function isProUser(user: User | null): Promise<boolean> {
  if (!user) {
    logger.debug('No user found for pro check');
    return false;
  }

  try {
    const subscription = await getCurrentSubscription();
    
    if (!subscription) {
      logger.debug('No subscription found', { userId: user.id });
      return false;
    }

    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    logger.debug('Pro status check', { 
      userId: user.id, 
      status: subscription.status,
      isActive 
    });

    return isActive;
  } catch (error) {
    logger.error('Error checking pro status', error as Error, { userId: user.id });
    return false;
  }
}

export async function canAccessFeature(user: User | null, feature: keyof typeof PLAN_LIMITS['pro']): Promise<boolean> {
  if (!user) {
    logger.debug('No user found for feature access check', { feature });
    return false;
  }

  try {
    const isPro = await isProUser(user);
    const planLimits = PLAN_LIMITS[isPro ? 'pro' : 'free'];
    
    logger.debug('Feature access check', { 
      userId: user.id,
      feature,
      isPro,
      hasAccess: !!planLimits[feature]
    });

    return !!planLimits[feature];
  } catch (error) {
    logger.error('Error checking feature access', error as Error, { 
      userId: user.id,
      feature 
    });
    return false;
  }
}

export async function checkUsageLimit(user: User | null, type: 'clips' | 'exports' | 'storage'): Promise<boolean> {
  if (!user) {
    logger.debug('No user found for usage limit check', { type });
    return false;
  }

  try {
    const isPro = await isProUser(user);
    const planLimits = PLAN_LIMITS[isPro ? 'pro' : 'free'];
    const usage = user.usage;

    let isWithinLimit = false;

    switch (type) {
      case 'clips':
        isWithinLimit = usage.clipsCreated < planLimits.maxClipsPerMonth;
        break;
      case 'exports':
        isWithinLimit = usage.exportsUsed < planLimits.maxExportsPerMonth;
        break;
      case 'storage':
        isWithinLimit = usage.storageUsed < (planLimits.maxStorageGB * 1024 * 1024 * 1024);
        break;
    }

    logger.debug('Usage limit check', {
      userId: user.id,
      type,
      isPro,
      current: usage[`${type}Created`],
      limit: planLimits[`max${type.charAt(0).toUpperCase() + type.slice(1)}PerMonth`],
      isWithinLimit
    });

    return isWithinLimit;
  } catch (error) {
    logger.error('Error checking usage limit', error as Error, {
      userId: user.id,
      type
    });
    return false;
  }
}
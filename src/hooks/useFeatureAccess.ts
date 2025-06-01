import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { canAccessFeature, checkUsageLimit } from '../lib/gates';
import { logger } from '../lib/logger';

export function useFeatureAccess(feature: string, type?: 'clips' | 'exports' | 'storage') {
  const user = useAppStore((state) => state.user);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      try {
        setIsLoading(true);
        
        // Check feature access first
        const featureAccess = await canAccessFeature(user, feature as any);
        
        // If type is provided, also check usage limits
        let usageAccess = true;
        if (type) {
          usageAccess = await checkUsageLimit(user, type);
        }

        const access = featureAccess && usageAccess;
        
        logger.debug('Feature access check result', {
          userId: user?.id,
          feature,
          type,
          featureAccess,
          usageAccess,
          access
        });

        setHasAccess(access);
      } catch (error) {
        logger.error('Error checking feature access', error as Error, {
          userId: user?.id,
          feature,
          type
        });
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [user, feature, type]);

  return {
    hasAccess,
    isLoading,
    showUpgradeModal,
    setShowUpgradeModal
  };
}
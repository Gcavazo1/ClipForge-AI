import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import UpgradeModal from '../common/UpgradeModal';
import { logger } from '../../lib/logger';

interface WithFeatureAccessProps {
  feature: string;
  type?: 'clips' | 'exports' | 'storage';
  redirectTo?: string;
}

export function withFeatureAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  { feature, type, redirectTo = '/pricing' }: WithFeatureAccessProps
) {
  return function WithFeatureAccessComponent(props: P) {
    const { hasAccess, isLoading, showUpgradeModal, setShowUpgradeModal } = useFeatureAccess(feature, type);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent" />
        </div>
      );
    }

    if (!hasAccess) {
      logger.info('Access denied to feature', { feature, type });
      
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }

      return (
        <>
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            feature={feature}
          />
          <div 
            className="relative filter blur-sm pointer-events-none"
            onClick={() => setShowUpgradeModal(true)}
          >
            <WrappedComponent {...props} />
          </div>
        </>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
import React from 'react';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import ProBadge from './ProBadge';
import { logger } from '../../lib/logger';

interface FeatureWrapperProps {
  feature: string;
  type?: 'clips' | 'exports' | 'storage';
  children: React.ReactNode;
  showBadge?: boolean;
  blur?: boolean;
}

const FeatureWrapper: React.FC<FeatureWrapperProps> = ({
  feature,
  type,
  children,
  showBadge = true,
  blur = true,
}) => {
  const { hasAccess, setShowUpgradeModal } = useFeatureAccess(feature, type);

  const handleClick = () => {
    if (!hasAccess) {
      logger.info('Pro feature area clicked', { feature, type });
      setShowUpgradeModal(true);
    }
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative group" onClick={handleClick}>
      <div className={blur ? 'filter blur-sm pointer-events-none' : ''}>
        {children}
      </div>
      
      {showBadge && (
        <div className="absolute top-2 right-2 z-10">
          <ProBadge />
        </div>
      )}
      
      <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="text-sm font-medium text-primary-400">
          Available with Pro
        </div>
      </div>
    </div>
  );
};

export default FeatureWrapper;
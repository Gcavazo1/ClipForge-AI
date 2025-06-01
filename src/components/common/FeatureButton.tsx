import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import Button from '../ui/button';
import ProBadge from './ProBadge';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { logger } from '../../lib/logger';

interface FeatureButtonProps {
  feature: string;
  type?: 'clips' | 'exports' | 'storage';
  icon?: LucideIcon;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  onClick?: () => void;
}

const FeatureButton: React.FC<FeatureButtonProps> = ({
  feature,
  type,
  icon: Icon,
  children,
  variant = 'primary',
  className = '',
  onClick,
}) => {
  const { hasAccess, setShowUpgradeModal } = useFeatureAccess(feature, type);

  const handleClick = () => {
    if (!hasAccess) {
      logger.info('Pro feature clicked', { feature, type });
      setShowUpgradeModal(true);
      return;
    }
    onClick?.();
  };

  return (
    <Button
      variant={hasAccess ? variant : 'ghost'}
      className={`relative ${!hasAccess ? 'opacity-60 hover:opacity-80' : ''} ${className}`}
      onClick={handleClick}
      icon={Icon}
    >
      <span className="flex items-center gap-2">
        {children}
        {!hasAccess && <ProBadge />}
      </span>
    </Button>
  );
};

export default FeatureButton;
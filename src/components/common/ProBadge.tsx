import React from 'react';
import { Crown } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';

interface ProBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

const ProBadge: React.FC<ProBadgeProps> = ({ className = '', showTooltip = true }) => {
  const badge = (
    <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-900/30 text-primary-400 ${className}`}>
      <Crown size={12} className="mr-1" />
      Pro
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip content="Available with Pro plan">
      {badge}
    </Tooltip>
  );
};

export default ProBadge;
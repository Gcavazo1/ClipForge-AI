import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import Button from '../ui/button';
import { useAppStore } from '../../store';
import { logger } from '../../lib/logger';

interface UpgradeBannerProps {
  source?: string;
  message?: string;
}

const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
  source = 'banner',
  message = 'Unlock advanced features and remove limits with ClipForge Pro',
}) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = React.useState(false);
  const user = useAppStore((state) => state.user);

  if (isDismissed || user?.plan === 'pro') {
    return null;
  }

  const handleUpgradeClick = () => {
    logger.info('Upgrade banner clicked', { source });
    navigate(`/pricing?source=${source}`);
  };

  return (
    <div className="bg-primary-900/20 border border-primary-500/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex h-10 w-10 rounded-full bg-primary-900/30 items-center justify-center">
            <Sparkles size={20} className="text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{message}</p>
            <p className="text-xs text-foreground-muted mt-1">
              Starting at $12/month
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpgradeClick}
          >
            Upgrade Now
          </Button>
          
          <button
            onClick={() => setIsDismissed(true)}
            className="text-foreground-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeBanner;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Button from '../ui/button';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, feature }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-light rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-center mb-6">
          <div className="bg-primary-900/30 p-3 rounded-full">
            <Sparkles size={32} className="text-primary-500" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-4">
          Upgrade to Pro
        </h2>
        
        <p className="text-center text-foreground-muted mb-6">
          {feature} is a Pro feature. Upgrade to ClipForge Pro to unlock unlimited access to all premium features.
        </p>
        
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              onClose();
              navigate('/pricing');
            }}
          >
            View Pricing
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
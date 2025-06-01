import React from 'react';
import { Video, Download, HardDrive, AlertTriangle } from 'lucide-react';
import { User, UsageLimits } from '../../types';
import { PLAN_LIMITS, checkUsageLimits } from '../../lib/usage';
import Button from '../ui/button';

interface UsageStatsProps {
  user: User;
  onUpgrade?: () => void;
}

const UsageStats: React.FC<UsageStatsProps> = ({ user, onUpgrade }) => {
  const limits = PLAN_LIMITS[user.plan];
  const usage = user.usage;
  const { canCreateClips, canExport, canUpload, nearLimit } = checkUsageLimits(user);

  const formatStorage = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const getUsagePercentage = (used: number, max: number): number => {
    return Math.min((used / max) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {nearLimit && (
        <div className="bg-warning-900/20 text-warning-500 p-4 rounded-lg flex items-center">
          <AlertTriangle size={20} className="mr-2 shrink-0" />
          <p className="text-sm">
            You're approaching your plan limits. Consider upgrading to continue creating and exporting clips.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        <div className="bg-background-lighter p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Video size={18} className="text-primary-500 mr-2" />
              <span className="text-sm font-medium">Clips Created</span>
            </div>
            <span className="text-sm">
              {usage.clipsCreated} / {limits.maxClipsPerMonth}
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{
                width: `${getUsagePercentage(usage.clipsCreated, limits.maxClipsPerMonth)}%`,
              }}
            />
          </div>
          {!canCreateClips && (
            <p className="text-xs text-error-500 mt-2">
              You've reached your clips limit for this month
            </p>
          )}
        </div>

        <div className="bg-background-lighter p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Download size={18} className="text-primary-500 mr-2" />
              <span className="text-sm font-medium">Exports Used</span>
            </div>
            <span className="text-sm">
              {usage.exportsUsed} / {limits.maxExportsPerMonth}
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{
                width: `${getUsagePercentage(usage.exportsUsed, limits.maxExportsPerMonth)}%`,
              }}
            />
          </div>
          {!canExport && (
            <p className="text-xs text-error-500 mt-2">
              You've reached your exports limit for this month
            </p>
          )}
        </div>

        <div className="bg-background-lighter p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <HardDrive size={18} className="text-primary-500 mr-2" />
              <span className="text-sm font-medium">Storage Used</span>
            </div>
            <span className="text-sm">
              {formatStorage(usage.storageUsed)} / {limits.maxStorageGB} GB
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{
                width: `${getUsagePercentage(
                  usage.storageUsed,
                  limits.maxStorageGB * 1024 * 1024 * 1024
                )}%`,
              }}
            />
          </div>
          {!canUpload && (
            <p className="text-xs text-error-500 mt-2">
              You've reached your storage limit
            </p>
          )}
        </div>
      </div>

      {user.plan === 'free' && (
        <div className="mt-6">
          <Button
            variant="primary"
            className="w-full"
            onClick={onUpgrade}
          >
            Upgrade to Pro
          </Button>
          <p className="text-xs text-center text-foreground-muted mt-2">
            Get unlimited clips, exports, and more
          </p>
        </div>
      )}

      <div className="text-xs text-foreground-muted">
        <p>Usage resets on the 1st of each month</p>
        <p>Next reset: {new Date(user.usage.lastResetDate).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default UsageStats;
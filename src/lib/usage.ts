import { supabase } from './supabase';
import { User, UsageLimits } from '../types';

// Define plan limits
export const PLAN_LIMITS: Record<User['plan'], UsageLimits> = {
  free: {
    maxClipsPerMonth: 5,
    maxExportsPerMonth: 10,
    maxStorageGB: 1,
    maxResolution: '720p',
    removeWatermark: false,
    prophetic: false,
  },
  pro: {
    maxClipsPerMonth: 50,
    maxExportsPerMonth: 100,
    maxStorageGB: 10,
    maxResolution: '1080p',
    removeWatermark: true,
    prophetic: true,
  },
  enterprise: {
    maxClipsPerMonth: Infinity,
    maxExportsPerMonth: Infinity,
    maxStorageGB: 100,
    maxResolution: '4k',
    removeWatermark: true,
    prophetic: true,
  },
};

// Check if user has exceeded their limits
export function checkUsageLimits(user: User): {
  canCreateClips: boolean;
  canExport: boolean;
  canUpload: boolean;
  nearLimit: boolean;
} {
  const limits = PLAN_LIMITS[user.plan];
  const usage = user.usage;

  return {
    canCreateClips: usage.clipsCreated < limits.maxClipsPerMonth,
    canExport: usage.exportsUsed < limits.maxExportsPerMonth,
    canUpload: usage.storageUsed < limits.maxStorageGB * 1024 * 1024 * 1024,
    nearLimit:
      usage.clipsCreated >= limits.maxClipsPerMonth * 0.8 ||
      usage.exportsUsed >= limits.maxExportsPerMonth * 0.8 ||
      usage.storageUsed >= limits.maxStorageGB * 1024 * 1024 * 1024 * 0.8,
  };
}

// Update usage stats
export async function updateUsage(
  userId: string,
  type: 'clip' | 'export' | 'storage',
  value: number
): Promise<User['usage']> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;

  const updates = {
    [`usage.${type === 'clip' ? 'clipsCreated' : type === 'export' ? 'exportsUsed' : 'storageUsed'}`]:
      value,
  };

  const { data, error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('usage')
    .single();

  if (updateError) throw updateError;
  return data.usage;
}

// Reset monthly usage
export async function resetMonthlyUsage(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      usage: {
        clipsCreated: 0,
        exportsUsed: 0,
        lastResetDate: new Date().toISOString(),
      },
    })
    .eq('id', userId);

  if (error) throw error;
}

// Schedule usage reset
export function scheduleUsageReset(user: User): void {
  const lastReset = new Date(user.usage.lastResetDate);
  const nextReset = new Date(lastReset.getFullYear(), lastReset.getMonth() + 1, 1);
  const now = new Date();

  if (now >= nextReset) {
    resetMonthlyUsage(user.id).catch(console.error);
  }
}
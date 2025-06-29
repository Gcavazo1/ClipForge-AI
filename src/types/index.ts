import { User as SupabaseUser } from '@supabase/supabase-js';

export interface User extends Omit<SupabaseUser, 'app_metadata' | 'user_metadata'> {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  notifications?: {
    email: boolean;
    push: boolean;
  };
  usage: {
    clipsCreated: number;
    exportsUsed: number;
    storageUsed: number;
    lastResetDate: string;
  };
  plan: 'free' | 'pro' | 'enterprise';
}

export interface UsageLimits {
  maxClipsPerMonth: number;
  maxExportsPerMonth: number;
  maxStorageGB: number;
  maxResolution: '720p' | '1080p' | '4k';
  removeWatermark: boolean;
  prophetic: boolean;
}

export interface VideoProject {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
  status: 'uploading' | 'processing' | 'transcribing' | 'analyzing' | 'ready' | 'error' | 'archived';
  progress?: number;
  error?: string;
  size?: number;
}

export interface ClipSegment {
  id: string;
  projectId: string;
  startTime: number;
  endTime: number;
  title?: string;
  isHighlight: boolean;
  confidence: number;
  summary?: string;
  type?: 'highlight' | 'manual' | 'auto_detected' | 'user_created' | 'ai_suggested';
}

export interface TranscriptSegment {
  id: string;
  projectId?: string;
  startTime: number;
  endTime: number;
  text: string;
  speakerId?: string;
  confidence?: number;
}

export interface CaptionStyle {
  font: string;
  size: number;
  color: string;
  backgroundColor: string;
  position: 'top' | 'bottom' | 'middle';
  opacity: number;
  outline: boolean;
  outlineColor: string;
}

export interface ExportOptions {
  format: 'mp4' | 'mov' | 'gif';
  quality: 'high' | 'medium' | 'low';
  resolution: '720p' | '1080p' | 'source';
  includeCaptions: boolean;
  captionStyle: CaptionStyle;
  platforms?: ('tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook')[];
  watermark?: boolean;
  creatorHandle?: string;
}

export interface ClipAnalytics {
  id: string;
  clipId: string;
  userId: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime: number;
  postedAt: string;
  updatedAt: string;
  viewsOverTime?: Array<{ date: string; views: number }>;
}

export type ModelType = 'linear' | 'randomForest' | 'ensemble' | 'xgboost';

export interface ProphecyRequest {
  userId: string;
  clipId?: string;
  platform?: string;
  metadata?: {
    duration: number;
    topic: string;
    hashtags: string[];
  };
}

export interface ProphecyResult {
  predictedViews: number;
  predictedLikes: number;
  predictedComments: number;
  confidence: number;
  bestTime: string;
  bestDay: string;
  recommendedDuration: number;
  trendingHashtags: string[];
  recommendations: string[];
  insights: {
    type: string;
    message: string;
    confidence: number;
  }[];
}

export interface UserFeedback {
  id: string;
  userId: string;
  prophecyId: string;
  rating: number;
  wasHelpful: boolean;
  comment?: string;
  createdAt: string;
  metadata?: {
    followedRecommendations: boolean;
    actualViews?: number;
    actualLikes?: number;
    actualComments?: number;
    predictedViews?: number;
    predictedLikes?: number;
    predictedComments?: number;
  };
}

export interface FeedbackSummary {
  averageRating: number;
  totalFeedback: number;
  helpfulPercentage: number;
  recommendationFollowRate: number;
  accuracyTrend: {
    date: string;
    accuracy: number;
  }[];
}

// Database-specific types
export interface DatabaseVideoProject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  original_filename?: string;
  duration: number;
  file_size: number;
  mime_type?: string;
  status: VideoProject['status'];
  progress: number;
  error_message?: string;
  metadata: any;
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DatabaseClipSegment {
  id: string;
  project_id: string;
  title?: string;
  start_time: number;
  end_time: number;
  is_highlight: boolean;
  confidence?: number;
  segment_type: ClipSegment['type'];
  summary?: string;
  metadata: any;
  export_count: number;
  last_exported_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTranscriptSegment {
  id: string;
  project_id: string;
  start_time: number;
  end_time: number;
  text: string;
  speaker_id?: string;
  speaker_name?: string;
  confidence?: number;
  language: string;
  word_count?: number;
  created_at: string;
}

export interface DatabaseUserProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  plan_type: User['plan'];
  usage_stats: any;
  preferences: any;
  onboarding_completed: boolean;
  last_active_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
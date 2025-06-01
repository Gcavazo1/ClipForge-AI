export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
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
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress?: number;
  error?: string;
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
  type?: 'emotion' | 'insight' | 'hook' | 'cta';
}

export interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speakerId?: string;
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
}

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
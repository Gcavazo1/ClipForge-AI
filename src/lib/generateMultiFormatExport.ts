import { generateId } from './utils';

interface ExportOptions {
  includePlatforms?: ("tiktok" | "instagram" | "youtube" | "twitter" | "facebook")[];
  watermark?: boolean;
  creatorHandle?: string;
  title?: string;
  coverTimestamp?: number;
}

interface PlatformConfig {
  maxDuration: number;
  maxFileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: {
    videoCodec: string;
    audioCodec: string;
    container: string;
  };
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  tiktok: {
    maxDuration: 600, // 10 minutes
    maxFileSize: 287 * 1024 * 1024, // 287MB
    dimensions: {
      width: 1080,
      height: 1920
    },
    format: {
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4'
    }
  },
  instagram: {
    maxDuration: 90, // 90 seconds for Reels
    maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
    dimensions: {
      width: 1080,
      height: 1920
    },
    format: {
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4'
    }
  },
  youtube: {
    maxDuration: 60, // 60 seconds for Shorts
    maxFileSize: 256 * 1024 * 1024, // 256MB
    dimensions: {
      width: 1080,
      height: 1920
    },
    format: {
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4'
    }
  },
  twitter: {
    maxDuration: 140, // 2:20
    maxFileSize: 512 * 1024 * 1024, // 512MB
    dimensions: {
      width: 1080,
      height: 1920
    },
    format: {
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4'
    }
  },
  facebook: {
    maxDuration: 90, // 90 seconds for Reels
    maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
    dimensions: {
      width: 1080,
      height: 1920
    },
    format: {
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4'
    }
  }
};

export async function generateMultiFormatExport(
  stylizedClip: File,
  options: ExportOptions = {}
): Promise<{
  tiktok?: File;
  instagram?: File;
  youtube?: File;
  twitter?: File;
  facebook?: File;
  thumbnail?: File;
}> {
  console.log('Starting multi-format export...', { options });
  
  const platforms = options.includePlatforms || ['tiktok', 'instagram', 'youtube'];
  const results: Record<string, File> = {};
  
  // Generate a unique export ID
  const exportId = generateId();
  
  // Create video element to get metadata
  const videoUrl = URL.createObjectURL(stylizedClip);
  const video = document.createElement('video');
  
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = reject;
    video.src = videoUrl;
  });
  
  const duration = video.duration;
  const originalWidth = video.videoWidth;
  const originalHeight = video.videoHeight;
  
  console.log('Video metadata:', { duration, originalWidth, originalHeight });
  
  // Generate thumbnail if requested
  if (options.coverTimestamp !== undefined) {
    console.log('Generating thumbnail...');
    const timestamp = Math.min(options.coverTimestamp, duration - 1);
    results.thumbnail = await generateThumbnail(video, timestamp);
  }
  
  // Process for each platform
  for (const platform of platforms) {
    console.log(`Processing for ${platform}...`);
    
    const config = PLATFORM_CONFIGS[platform];
    
    // Validate duration
    if (duration > config.maxDuration) {
      console.warn(`Video exceeds ${platform} duration limit`);
      continue;
    }
    
    try {
      // Process video for platform
      const processedVideo = await processForPlatform(
        stylizedClip,
        platform,
        config,
        options
      );
      
      // Validate file size
      if (processedVideo.size > config.maxFileSize) {
        console.warn(`Processed video exceeds ${platform} size limit`);
        continue;
      }
      
      results[platform] = processedVideo;
      
      console.log(`${platform} export complete`);
    } catch (error) {
      console.error(`Failed to process for ${platform}:`, error);
    }
  }
  
  // Cleanup
  URL.revokeObjectURL(videoUrl);
  
  return results;
}

// Helper function to generate thumbnail
async function generateThumbnail(
  video: HTMLVideoElement,
  timestamp: number
): Promise<File> {
  return new Promise((resolve) => {
    // Seek to timestamp
    video.currentTime = timestamp;
    
    video.onseeked = () => {
      // Create canvas and draw video frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        const file = new File([blob!], `thumbnail-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        resolve(file);
      }, 'image/jpeg', 0.95);
    };
  });
}

// Helper function to process video for specific platform
async function processForPlatform(
  video: File,
  platform: string,
  config: PlatformConfig,
  options: ExportOptions
): Promise<File> {
  // In a real implementation, this would:
  // 1. Resize video to platform dimensions
  // 2. Apply platform-specific encoding
  // 3. Add watermark if requested
  // 4. Optimize bitrate and quality
  
  // For demo, simulate processing with a delay
  await new Promise(resolve => 
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );
  
  // Add platform-specific metadata
  const metadata = {
    platform,
    title: options.title || 'Untitled',
    creator: options.creatorHandle || '',
    exportDate: new Date().toISOString()
  };
  
  // Create a new file with metadata
  return new File([await video.arrayBuffer()], `${platform}-${Date.now()}.mp4`, {
    type: 'video/mp4'
  });
}

// Helper function to add watermark
async function addWatermark(
  video: File,
  handle: string,
  platform: string
): Promise<File> {
  // In a real implementation, this would:
  // 1. Create a canvas
  // 2. Draw the video frame
  // 3. Add watermark text/logo
  // 4. Composite frames back into video
  
  console.log(`Adding watermark for ${platform}: @${handle}`);
  
  // For demo, return original file
  return video;
}

// Helper function to validate and optimize video
async function validateAndOptimize(
  video: File,
  config: PlatformConfig
): Promise<{ isValid: boolean; optimizedVideo?: File }> {
  // In a real implementation, this would:
  // 1. Check video codec compatibility
  // 2. Validate resolution and aspect ratio
  // 3. Check audio format
  // 4. Optimize bitrate if needed
  
  return {
    isValid: true,
    optimizedVideo: video
  };
}
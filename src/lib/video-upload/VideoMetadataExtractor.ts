import { logger } from '../logger';
import { performanceMonitor } from '../performance/performance-monitor';
import { getMimeTypeFromExtension, getFileExtension } from '../utils';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
  fps: number;
  bitrate: number;
  hasAudio: boolean;
  codec?: string;
  rotation?: number;
}

export class VideoMetadataExtractor {
  /**
   * Extract metadata from video file
   */
  static async extractMetadata(file: File): Promise<VideoMetadata> {
    return performanceMonitor.measure(
      'extract-video-metadata',
      async () => {
        logger.debug('Extracting video metadata', { fileName: file.name, size: file.size });
        
        return new Promise((resolve, reject) => {
          const video = document.createElement('video');
          const url = URL.createObjectURL(file);
          
          // Set up event listeners
          video.addEventListener('loadedmetadata', () => {
            try {
              // Basic metadata
              const duration = video.duration;
              const width = video.videoWidth;
              const height = video.videoHeight;
              
              // Calculate aspect ratio
              const gcd = this.calculateGCD(width, height);
              const aspectRatio = width / height;
              
              // Estimate bitrate
              const bitrate = Math.round((file.size * 8) / duration); // bits per second
              
              // Clean up
              URL.revokeObjectURL(url);
              
              const metadata: VideoMetadata = {
                duration,
                width,
                height,
                aspectRatio,
                fps: 30, // Default assumption, would need MediaInfo for accurate value
                bitrate,
                hasAudio: true, // Assume has audio, would need deeper inspection for accuracy
              };
              
              logger.debug('Video metadata extracted', { 
                fileName: file.name,
                duration,
                resolution: `${width}x${height}`,
                aspectRatio: `${width/gcd}:${height/gcd}`
              });
              
              resolve(metadata);
            } catch (error) {
              URL.revokeObjectURL(url);
              reject(error);
            }
          });
          
          video.addEventListener('error', (e) => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load video: ${video.error?.message || 'Unknown error'}`));
          });
          
          // Start loading the video
          video.preload = 'metadata';
          video.src = url;
        });
      },
      { fileName: file.name, size: file.size }
    );
  }
  
  /**
   * Calculate greatest common divisor for aspect ratio
   */
  private static calculateGCD(a: number, b: number): number {
    return b === 0 ? a : this.calculateGCD(b, a % b);
  }
  
  /**
   * Check if video is valid and supported
   */
  static validateVideo(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = [
      'video/mp4', 
      'video/quicktime', 
      'video/x-msvideo', 
      'video/webm', 
      'video/x-matroska',
      'video/mov'
    ];
    
    // Check file extension as fallback
    const fileExt = getFileExtension(file.name);
    const validExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
    
    // If MIME type is not recognized but extension is valid, consider it valid
    const hasValidExtension = fileExt && validExtensions.includes(fileExt);
    const hasValidMimeType = file.type && validTypes.includes(file.type);
    
    // Get content type - either from file or inferred from extension
    const contentType = file.type || (fileExt ? getMimeTypeFromExtension(fileExt) : '');
    
    logger.debug('Validating video file', { 
      fileName: file.name, 
      mimeType: file.type,
      inferredType: contentType,
      extension: fileExt
    });
    
    if (!hasValidMimeType && !hasValidExtension) {
      return {
        valid: false,
        error: `Unsupported video format: ${file.type || fileExt}. Please use MP4, MOV, AVI, WebM, or MKV.`
      };
    }
    
    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum size is 500MB.`
      };
    }
    
    // Check file name length
    if (file.name.length > 255) {
      return {
        valid: false,
        error: 'File name is too long. Please use a shorter name.'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Extract a frame from the video at the specified timestamp
   */
  static async extractFrame(file: File, timestamp: number = 0): Promise<Blob> {
    return performanceMonitor.measure(
      'extract-video-frame',
      async () => {
        return new Promise((resolve, reject) => {
          const video = document.createElement('video');
          const canvas = document.createElement('canvas');
          const url = URL.createObjectURL(file);
          
          video.addEventListener('loadeddata', () => {
            try {
              // Seek to timestamp
              video.currentTime = Math.min(timestamp, Math.max(0, video.duration - 0.1));
            } catch (error) {
              URL.revokeObjectURL(url);
              reject(error);
            }
          });
          
          video.addEventListener('seeked', () => {
            try {
              // Set canvas size to match video
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              
              // Draw video frame to canvas
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                throw new Error('Failed to get canvas context');
              }
              
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              // Convert canvas to blob
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    reject(new Error('Failed to create image blob'));
                    return;
                  }
                  
                  URL.revokeObjectURL(url);
                  resolve(blob);
                },
                'image/jpeg',
                0.95 // Quality
              );
            } catch (error) {
              URL.revokeObjectURL(url);
              reject(error);
            }
          });
          
          video.addEventListener('error', () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load video: ${video.error?.message || 'Unknown error'}`));
          });
          
          // Start loading the video
          video.src = url;
          video.load();
        });
      },
      { fileName: file.name, timestamp }
    );
  }
}
import { supabase } from './supabase';
import { logger } from './logger';
import { getMimeTypeFromExtension, getFileExtension } from './utils';

export interface UploadResult {
  id: string;
  url: string;
  publicUrl?: string;
  size: number;
  type: string;
}

export interface StorageUsage {
  totalBytes: number;
  videosBytes: number;
  exportsBytes: number;
  thumbnailsBytes: number;
  avatarsBytes: number;
  totalGB: number;
  videosGB: number;
  exportsGB: number;
}

export class StorageService {
  // Upload video file
  static async uploadVideo(file: File, userId: string, onProgress?: (progress: number) => void): Promise<UploadResult> {
    try {
      const fileExt = getFileExtension(file.name);
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      logger.info('Starting video upload', { fileName, size: file.size });

      // Ensure we have a valid content type
      const contentType = file.type || getMimeTypeFromExtension(fileExt);
      
      logger.info('Using content type for upload', { contentType, fileName });

      // Create a new File with explicit content type
      const fileWithContentType = new File([file], fileName, {
        type: contentType
      });

      const { data, error } = await supabase.storage
        .from('videos')
        .upload(fileName, fileWithContentType, {
          cacheControl: '3600',
          upsert: false,
          contentType, // Explicitly set content type
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            onProgress?.(percentage);
          }
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(data.path);

      logger.info('Video upload completed', { fileName, path: data.path });

      return {
        id: data.path,
        url: publicUrl,
        size: file.size,
        type: contentType
      };
    } catch (error) {
      logger.error('Video upload failed', error as Error, { userId, fileName: file.name });
      throw error;
    }
  }

  // Upload thumbnail
  static async uploadThumbnail(file: File, userId: string): Promise<UploadResult> {
    try {
      const fileExt = getFileExtension(file.name);
      const fileName = `${userId}/${Date.now()}-thumbnail.${fileExt}`;

      // Ensure we have a valid content type
      const contentType = file.type || 'image/jpeg';

      // Create a new File with explicit content type
      const fileWithContentType = new File([file], fileName, {
        type: contentType
      });

      const { data, error } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, fileWithContentType, {
          cacheControl: '3600',
          upsert: false,
          contentType // Explicitly set content type
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(data.path);

      return {
        id: data.path,
        url: publicUrl,
        publicUrl,
        size: file.size,
        type: contentType
      };
    } catch (error) {
      logger.error('Thumbnail upload failed', error as Error, { userId });
      throw error;
    }
  }

  // Upload exported video
  static async uploadExport(file: File, userId: string, clipId: string): Promise<UploadResult> {
    try {
      const fileExt = getFileExtension(file.name);
      const fileName = `${userId}/exports/${clipId}-${Date.now()}.${fileExt}`;

      // Ensure we have a valid content type
      const contentType = file.type || 'video/mp4';

      // Create a new File with explicit content type
      const fileWithContentType = new File([file], fileName, {
        type: contentType
      });

      const { data, error } = await supabase.storage
        .from('exports')
        .upload(fileName, fileWithContentType, {
          cacheControl: '3600',
          upsert: false,
          contentType // Explicitly set content type
        });

      if (error) throw error;

      // Generate signed URL for private access
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('exports')
        .createSignedUrl(data.path, 3600); // 1 hour expiry

      if (signedUrlError) throw signedUrlError;

      return {
        id: data.path,
        url: signedUrlData.signedUrl,
        size: file.size,
        type: contentType
      };
    } catch (error) {
      logger.error('Export upload failed', error as Error, { userId, clipId });
      throw error;
    }
  }

  // Upload user avatar
  static async uploadAvatar(file: File, userId: string): Promise<UploadResult> {
    try {
      const fileExt = getFileExtension(file.name);
      const fileName = `${userId}/avatar.${fileExt}`;

      // Ensure we have a valid content type
      const contentType = file.type || 'image/jpeg';

      // Create a new File with explicit content type
      const fileWithContentType = new File([file], fileName, {
        type: contentType
      });

      // Delete existing avatar first
      await supabase.storage
        .from('avatars')
        .remove([fileName]);

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileWithContentType, {
          cacheControl: '3600',
          upsert: true,
          contentType // Explicitly set content type
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      return {
        id: data.path,
        url: publicUrl,
        publicUrl,
        size: file.size,
        type: contentType
      };
    } catch (error) {
      logger.error('Avatar upload failed', error as Error, { userId });
      throw error;
    }
  }

  // Get signed URL for private video access
  static async getSignedVideoUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('videos')
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;

      return data.signedUrl;
    } catch (error) {
      logger.error('Failed to create signed URL', error as Error, { filePath });
      throw error;
    }
  }

  // Delete file
  static async deleteFile(bucket: string, filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;

      logger.info('File deleted successfully', { bucket, filePath });
    } catch (error) {
      logger.error('File deletion failed', error as Error, { bucket, filePath });
      throw error;
    }
  }

  // Get user storage usage
  static async getUserStorageUsage(userId: string): Promise<StorageUsage> {
    try {
      const { data, error } = await supabase.rpc('get_user_storage_usage', {
        user_uuid: userId
      });

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Failed to get storage usage', error as Error, { userId });
      throw error;
    }
  }

  // List user files
  static async listUserFiles(userId: string, bucket?: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('bucket_id', bucket || 'videos')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Failed to list user files', error as Error, { userId, bucket });
      throw error;
    }
  }

  // Validate file before upload
  static validateFile(file: File, type: 'video' | 'image' | 'avatar'): { valid: boolean; error?: string } {
    const limits = {
      video: {
        maxSize: 500 * 1024 * 1024, // 500MB
        allowedTypes: ['video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/webm', 'video/x-msvideo', 'video/x-matroska']
      },
      image: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
      },
      avatar: {
        maxSize: 2 * 1024 * 1024, // 2MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
      }
    };

    const config = limits[type];

    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(config.maxSize / 1024 / 1024)}MB limit`
      };
    }

    // Check file type - if MIME type is not available, try to infer from extension
    const fileType = file.type || getMimeTypeFromExtension(getFileExtension(file.name));
    
    if (!config.allowedTypes.includes(fileType)) {
      return {
        valid: false,
        error: `File type ${fileType} is not allowed. Supported types: ${config.allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  // Generate thumbnail from video file
  static async generateThumbnail(videoFile: File, timestamp: number = 1): Promise<File> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = Math.min(timestamp, video.duration - 1);
      };

      video.onseeked = () => {
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to generate thumbnail'));
            return;
          }

          const thumbnailFile = new File([blob], 'thumbnail.jpg', {
            type: 'image/jpeg'
          });

          resolve(thumbnailFile);
        }, 'image/jpeg', 0.8);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video for thumbnail generation'));
      };

      video.src = URL.createObjectURL(videoFile);
    });
  }

  // Cleanup orphaned files
  static async cleanupOrphanedFiles(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_orphaned_files');

      if (error) throw error;

      logger.info('Cleanup completed', { deletedFiles: data });
      return data;
    } catch (error) {
      logger.error('Cleanup failed', error as Error);
      throw error;
    }
  }
}
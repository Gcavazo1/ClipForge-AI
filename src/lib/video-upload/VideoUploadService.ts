import { ChunkedUploader, UploadProgress, UploadResult } from './ChunkedUploader';
import { VideoMetadataExtractor } from './VideoMetadataExtractor';
import { StorageService } from '../storage';
import { VideoProjectService } from '../database';
import { VideoProject } from '../../types';
import { logger } from '../logger';
import { performanceMonitor } from '../performance/performance-monitor';
import { generateId } from '../utils';
import { getMimeTypeFromExtension, getFileExtension } from '../utils';

export interface UploadOptions {
  title?: string;
  description?: string;
  generateThumbnail?: boolean;
  thumbnailTimestamp?: number;
  quality?: 'low' | 'medium' | 'high';
  chunkSize?: number;
  concurrentUploads?: number;
}

export interface UploadTask {
  id: string;
  file: File;
  userId: string;
  projectId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  result?: VideoProject;
  uploader?: ChunkedUploader;
  startTime: number;
  options: UploadOptions;
}

export class VideoUploadService {
  private static instance: VideoUploadService;
  private uploadTasks: Map<string, UploadTask> = new Map();
  private uploadQueue: string[] = [];
  private maxConcurrentUploads: number = 2; // Limit concurrent uploads to prevent overwhelming the system
  private activeUploads: number = 0;
  private processingQueue: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): VideoUploadService {
    if (!VideoUploadService.instance) {
      VideoUploadService.instance = new VideoUploadService();
    }
    return VideoUploadService.instance;
  }

  /**
   * Create a new upload task and add it to the queue
   */
  public createUploadTask(
    file: File,
    userId: string,
    options: UploadOptions = {}
  ): UploadTask {
    const taskId = generateId();
    const projectId = generateId();
    
    // Validate file type
    const validation = VideoMetadataExtractor.validateVideo(file);
    if (!validation.valid) {
      const task: UploadTask = {
        id: taskId,
        file,
        userId,
        projectId,
        progress: 0,
        status: 'error',
        error: validation.error,
        startTime: Date.now(),
        options: {}
      };
      
      this.uploadTasks.set(taskId, task);
      return task;
    }
    
    const task: UploadTask = {
      id: taskId,
      file,
      userId,
      projectId,
      progress: 0,
      status: 'pending',
      startTime: Date.now(),
      options: {
        title: options.title || file.name.replace(/\.[^/.]+$/, ''),
        description: options.description || '',
        generateThumbnail: options.generateThumbnail !== false,
        thumbnailTimestamp: options.thumbnailTimestamp || 1,
        quality: options.quality || 'high',
        chunkSize: options.chunkSize || 5 * 1024 * 1024, // 5MB default
        concurrentUploads: options.concurrentUploads || 3
      }
    };
    
    this.uploadTasks.set(taskId, task);
    this.uploadQueue.push(taskId);
    
    logger.info('Created upload task', { 
      taskId, 
      fileName: file.name, 
      fileSize: file.size,
      userId,
      mimeType: file.type || getMimeTypeFromExtension(getFileExtension(file.name))
    });
    
    // Start processing the queue
    this.processQueue();
    
    return task;
  }

  /**
   * Get an upload task by ID
   */
  public getUploadTask(taskId: string): UploadTask | undefined {
    return this.uploadTasks.get(taskId);
  }

  /**
   * Get all upload tasks for a user
   */
  public getUserUploadTasks(userId: string): UploadTask[] {
    return Array.from(this.uploadTasks.values())
      .filter(task => task.userId === userId)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Cancel an upload task
   */
  public cancelUploadTask(taskId: string): boolean {
    const task = this.uploadTasks.get(taskId);
    if (!task) return false;
    
    // If task is in queue, remove it
    const queueIndex = this.uploadQueue.indexOf(taskId);
    if (queueIndex >= 0) {
      this.uploadQueue.splice(queueIndex, 1);
    }
    
    // If task is active, cancel the upload
    if (task.status === 'uploading' && task.uploader) {
      task.uploader.cancel();
    }
    
    // Update task status
    task.status = 'error';
    task.error = 'Upload cancelled by user';
    
    logger.info('Upload task cancelled', { taskId });
    
    return true;
  }

  /**
   * Pause an upload task
   */
  public pauseUploadTask(taskId: string): boolean {
    const task = this.uploadTasks.get(taskId);
    if (!task || task.status !== 'uploading' || !task.uploader) return false;
    
    task.uploader.pause();
    logger.info('Upload task paused', { taskId });
    
    return true;
  }

  /**
   * Resume an upload task
   */
  public resumeUploadTask(taskId: string): boolean {
    const task = this.uploadTasks.get(taskId);
    if (!task || task.status !== 'uploading' || !task.uploader) return false;
    
    task.uploader.resume();
    logger.info('Upload task resumed', { taskId });
    
    return true;
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    // Prevent multiple queue processing
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    
    try {
      // Process queue until empty or max concurrent uploads reached
      while (this.uploadQueue.length > 0 && this.activeUploads < this.maxConcurrentUploads) {
        const taskId = this.uploadQueue.shift();
        if (!taskId) break;
        
        const task = this.uploadTasks.get(taskId);
        if (!task) continue;
        
        // Start upload in background
        this.activeUploads++;
        this.processUploadTask(task)
          .catch(error => {
            logger.error('Upload task processing failed', error as Error, { taskId });
          })
          .finally(() => {
            this.activeUploads--;
            // Continue processing queue
            this.processQueue();
          });
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process a single upload task
   */
  private async processUploadTask(task: UploadTask): Promise<void> {
    try {
      // Get file extension and ensure we have a valid content type
      const fileExt = getFileExtension(task.file.name);
      const originalContentType = task.file.type;
      
      // Use a known video MIME type based on extension if we don't have a valid one
      const contentType = (originalContentType && originalContentType !== 'application/octet-stream') 
        ? originalContentType 
        : fileExt === 'mp4' ? 'video/mp4'
        : fileExt === 'mov' ? 'video/quicktime'
        : fileExt === 'webm' ? 'video/webm'
        : fileExt === 'avi' ? 'video/x-msvideo'
        : fileExt === 'mkv' ? 'video/x-matroska'
        : 'video/mp4'; // Default to mp4 if we can't determine
      
      logger.info('Processing upload task', { 
        taskId: task.id, 
        fileName: task.file.name,
        originalContentType,
        contentType
      });
      
      // Update task status
      task.status = 'uploading';
      
      // Create project record in database
      const project = await this.createProjectRecord(task);
      
      // Extract video metadata
      const metadata = await VideoMetadataExtractor.extractMetadata(task.file);
      
      // Create chunked uploader
      const uploader = new ChunkedUploader(
        task.file,
        task.userId,
        'videos',
        {
          chunkSize: task.options.chunkSize,
          concurrentUploads: task.options.concurrentUploads
        }
      );
      
      // Store uploader reference for pause/resume/cancel
      task.uploader = uploader;
      
      // Start upload with progress tracking
      const uploadResult = await uploader.upload(
        (progress) => this.updateTaskProgress(task, progress)
      );
      
      // Generate thumbnail if requested
      let thumbnailUrl: string | undefined;
      if (task.options.generateThumbnail) {
        try {
          // Extract a frame from the video
          const thumbnailBlob = await VideoMetadataExtractor.extractFrame(
            task.file,
            task.options.thumbnailTimestamp || 1
          );
          
          // Convert blob to file
          const thumbnailFile = new File(
            [thumbnailBlob], 
            `thumbnail-${project.id}.jpg`, 
            { type: 'image/jpeg' }
          );
          
          // Upload thumbnail
          const result = await StorageService.uploadThumbnail(thumbnailFile, task.userId);
          thumbnailUrl = result.publicUrl;
          
          logger.info('Thumbnail generated and uploaded', { 
            projectId: project.id,
            thumbnailUrl
          });
        } catch (thumbnailError) {
          logger.warn('Failed to generate thumbnail', thumbnailError as Error);
          // Continue without thumbnail
        }
      }
      
      // Update task status
      task.status = 'processing';
      
      // Update project with video details
      const updatedProject = await VideoProjectService.update(project.id, {
        ...project,
        videoUrl: uploadResult.url,
        thumbnailUrl,
        duration: metadata.duration,
        size: task.file.size,
        status: 'ready',
        progress: 100
      });
      
      // Update task with result
      task.status = 'completed';
      task.progress = 100;
      task.result = updatedProject;
      
      logger.info('Upload task completed successfully', { 
        taskId: task.id,
        projectId: project.id,
        duration: (Date.now() - task.startTime) / 1000
      });
    } catch (error) {
      logger.error('Upload task failed', error as Error, { 
        taskId: task.id,
        fileName: task.file.name
      });
      
      // Update task with error
      task.status = 'error';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Update project status if created
      if (task.result?.id) {
        await VideoProjectService.updateStatus(
          task.result.id,
          'error',
          0,
          task.error
        ).catch(err => {
          logger.error('Failed to update project status', err as Error);
        });
      }
    }
  }

  /**
   * Create initial project record in database
   */
  private async createProjectRecord(task: UploadTask): Promise<VideoProject> {
    return performanceMonitor.measure(
      'create-project-record',
      async () => {
        const project: Omit<VideoProject, 'id' | 'createdAt' | 'updatedAt'> = {
          title: task.options.title || task.file.name.replace(/\.[^/.]+$/, ''),
          description: task.options.description,
          videoUrl: '',
          thumbnailUrl: '',
          duration: 0,
          status: 'uploading',
          progress: 0,
          size: task.file.size
        };
        
        return VideoProjectService.create(project);
      }
    );
  }

  /**
   * Update task progress
   */
  private updateTaskProgress(task: UploadTask, progress: UploadProgress): void {
    // Calculate overall progress (0-100)
    // For simplicity, we'll use the upload percentage directly
    task.progress = progress.percentage;
    
    // Log progress every 10%
    if (Math.floor(progress.percentage / 10) !== Math.floor((progress.percentage - 1) / 10)) {
      logger.debug('Upload progress', { 
        taskId: task.id, 
        progress: Math.round(progress.percentage),
        speed: `${(progress.speed / (1024 * 1024)).toFixed(2)} MB/s`,
        timeRemaining: `${Math.round(progress.timeRemaining)}s`
      });
    }
  }

  /**
   * Clean up completed tasks older than the specified age
   */
  public cleanupOldTasks(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    for (const [taskId, task] of this.uploadTasks.entries()) {
      const taskAge = now - task.startTime;
      
      if (taskAge > maxAgeMs && (task.status === 'completed' || task.status === 'error')) {
        this.uploadTasks.delete(taskId);
      }
    }
  }
}

// Export singleton instance
export const videoUploadService = VideoUploadService.getInstance();
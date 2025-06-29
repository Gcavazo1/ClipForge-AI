import { supabase } from '../supabase';
import { logger } from '../logger';
import { performanceMonitor } from '../performance/performance-monitor';
import { RetryManager } from '../error-handling/retry-manager';

export interface ChunkConfig {
  chunkSize: number;
  concurrentUploads: number;
  maxRetries: number;
  retryDelay: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
  currentChunk: number;
  totalChunks: number;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  duration?: number;
}

export class ChunkedUploader {
  private file: File;
  private userId: string;
  private bucket: string;
  private config: ChunkConfig;
  private abortController: AbortController;
  private uploadStartTime: number = 0;
  private lastProgressUpdate: number = 0;
  private uploadedBytes: number = 0;
  private speedSamples: number[] = [];
  private activeChunks: Set<number> = new Set();
  private completedChunks: Set<number> = new Set();
  private failedChunks: Map<number, number> = new Map(); // chunk index -> retry count
  private paused: boolean = false;

  constructor(
    file: File, 
    userId: string, 
    bucket: string = 'videos',
    config: Partial<ChunkConfig> = {}
  ) {
    this.file = file;
    this.userId = userId;
    this.bucket = bucket;
    this.config = {
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      concurrentUploads: 3,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
    this.abortController = new AbortController();
  }

  /**
   * Upload file in chunks with progress tracking
   */
  async upload(
    onProgress?: (progress: UploadProgress) => void,
    customPath?: string
  ): Promise<UploadResult> {
    try {
      this.uploadStartTime = Date.now();
      this.lastProgressUpdate = this.uploadStartTime;
      this.uploadedBytes = 0;
      this.speedSamples = [];
      this.activeChunks.clear();
      this.completedChunks.clear();
      this.failedChunks.clear();
      this.paused = false;

      // Generate a unique file path
      const fileExt = this.file.name.split('.').pop() || '';
      const fileName = customPath || `${this.userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Calculate total chunks
      const totalChunks = Math.ceil(this.file.size / this.config.chunkSize);
      
      logger.info('Starting chunked upload', { 
        fileName, 
        fileSize: this.file.size, 
        totalChunks,
        chunkSize: this.config.chunkSize,
        concurrentUploads: this.config.concurrentUploads
      });

      // For single chunk uploads, use direct upload
      if (totalChunks === 1) {
        const result = await this.uploadSingleFile(fileName, onProgress);
        return result;
      }

      // Upload all chunks
      await this.uploadAllChunks(fileName, totalChunks, onProgress);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(fileName);

      logger.info('Chunked upload completed successfully', { 
        fileName, 
        fileSize: this.file.size,
        duration: (Date.now() - this.uploadStartTime) / 1000
      });

      return {
        path: fileName,
        url: publicUrl,
        size: this.file.size,
        mimeType: this.file.type
      };
    } catch (error) {
      logger.error('Chunked upload failed', error as Error, {
        fileName: this.file.name,
        fileSize: this.file.size,
        userId: this.userId
      });
      throw error;
    }
  }

  /**
   * Upload a single file directly (no chunking)
   */
  private async uploadSingleFile(
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(fileName, this.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: this.file.type, // Explicitly set content type
          onUploadProgress: (progress) => {
            if (onProgress) {
              const percentage = (progress.loaded / progress.total) * 100;
              this.uploadedBytes = progress.loaded;
              
              onProgress({
                loaded: progress.loaded,
                total: progress.total,
                percentage,
                speed: this.calculateSpeed(progress.loaded),
                timeRemaining: this.calculateTimeRemaining(progress.loaded, progress.total),
                currentChunk: 1,
                totalChunks: 1
              });
            }
          }
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        url: publicUrl,
        size: this.file.size,
        mimeType: this.file.type
      };
    } catch (error) {
      logger.error('Single file upload failed', error as Error);
      throw error;
    }
  }

  /**
   * Pause the upload
   */
  pause(): void {
    if (!this.paused) {
      this.paused = true;
      logger.info('Upload paused', { fileName: this.file.name });
    }
  }

  /**
   * Resume the upload
   */
  resume(): void {
    if (this.paused) {
      this.paused = false;
      logger.info('Upload resumed', { fileName: this.file.name });
    }
  }

  /**
   * Cancel the upload
   */
  cancel(): void {
    this.abortController.abort();
    logger.info('Upload cancelled', { fileName: this.file.name });
  }

  /**
   * Upload all chunks with concurrency control
   */
  private async uploadAllChunks(
    fileName: string, 
    totalChunks: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let activePromises = 0;
      let nextChunkIndex = 0;
      let completed = false;

      const checkCompletion = () => {
        if (completed) return;
        
        if (this.completedChunks.size === totalChunks) {
          completed = true;
          resolve();
        } else if (activePromises === 0 && nextChunkIndex >= totalChunks && this.failedChunks.size > 0) {
          // All chunks attempted but some failed
          completed = true;
          reject(new Error(`Upload failed: ${this.failedChunks.size} chunks could not be uploaded`));
        }
      };

      const uploadNextChunk = () => {
        if (this.paused || completed || this.abortController.signal.aborted) {
          return;
        }

        // Process failed chunks first
        let chunkIndex: number;
        if (this.failedChunks.size > 0) {
          const [failedChunkIndex] = this.failedChunks.entries().next().value;
          chunkIndex = failedChunkIndex;
          this.failedChunks.delete(failedChunkIndex);
        } else if (nextChunkIndex < totalChunks) {
          chunkIndex = nextChunkIndex++;
        } else {
          checkCompletion();
          return;
        }

        if (this.completedChunks.has(chunkIndex)) {
          // Skip already completed chunks
          uploadNextChunk();
          return;
        }

        activePromises++;
        this.activeChunks.add(chunkIndex);

        const start = chunkIndex * this.config.chunkSize;
        const end = Math.min(start + this.config.chunkSize, this.file.size);
        const chunk = this.file.slice(start, end);

        this.uploadChunk(fileName, chunk, chunkIndex, totalChunks)
          .then(() => {
            this.completedChunks.add(chunkIndex);
            this.activeChunks.delete(chunkIndex);
            this.uploadedBytes += chunk.size;
            
            // Update progress
            if (onProgress) {
              const progress = this.calculateProgress(totalChunks);
              onProgress(progress);
            }
          })
          .catch(error => {
            this.activeChunks.delete(chunkIndex);
            
            const retryCount = (this.failedChunks.get(chunkIndex) || 0) + 1;
            if (retryCount <= this.config.maxRetries) {
              // Schedule retry
              this.failedChunks.set(chunkIndex, retryCount);
              logger.warn(`Chunk ${chunkIndex} failed, will retry (${retryCount}/${this.config.maxRetries})`, error);
              
              // Add exponential backoff
              setTimeout(() => {
                if (!completed && !this.abortController.signal.aborted) {
                  uploadNextChunk();
                }
              }, this.config.retryDelay * Math.pow(2, retryCount - 1));
            } else {
              logger.error(`Chunk ${chunkIndex} failed after ${this.config.maxRetries} retries`, error);
              if (!completed) {
                completed = true;
                reject(error);
              }
            }
          })
          .finally(() => {
            activePromises--;
            
            // Start next chunk if not completed
            if (!completed && !this.abortController.signal.aborted) {
              uploadNextChunk();
            }
            
            checkCompletion();
          });
      };

      // Start initial concurrent uploads
      for (let i = 0; i < this.config.concurrentUploads; i++) {
        uploadNextChunk();
      }
    });
  }

  /**
   * Upload a single chunk with retry logic
   */
  private async uploadChunk(
    fileName: string, 
    chunk: Blob, 
    chunkIndex: number,
    totalChunks: number
  ): Promise<void> {
    const chunkName = totalChunks > 1 
      ? `${fileName}.part${chunkIndex}` 
      : fileName;
    
    // Create a File object from the Blob to preserve MIME type
    const chunkFile = new File([chunk], chunkName, { 
      type: this.file.type // Use the original file's MIME type
    });
    
    return RetryManager.withRetry(
      async () => {
        if (this.abortController.signal.aborted) {
          throw new Error('Upload aborted');
        }

        const { error } = await supabase.storage
          .from(this.bucket)
          .upload(chunkName, chunkFile, {
            cacheControl: '3600',
            upsert: chunkIndex > 0 ? true : false, // Only allow upsert for chunks after the first
            contentType: this.file.type // Explicitly set content type
          });

        if (error) throw error;

        // If this is the last chunk and we're using multipart upload, combine the chunks
        if (chunkIndex === totalChunks - 1 && totalChunks > 1) {
          await this.combineChunks(fileName, totalChunks);
        }
      },
      {
        maxAttempts: this.config.maxRetries,
        baseDelay: this.config.retryDelay,
        retryCondition: (error) => {
          // Retry on network errors, timeouts, and 5xx status codes
          return error.message.includes('network') || 
                 error.message.includes('timeout') || 
                 error.message.includes('500') ||
                 error.message.includes('503');
        }
      }
    );
  }

  /**
   * Combine uploaded chunks into a single file
   */
  private async combineChunks(fileName: string, totalChunks: number): Promise<void> {
    // In a real implementation, this would call a server function to combine chunks
    // For this demo, we'll simulate the process
    
    logger.info('Combining chunks', { fileName, totalChunks });
    
    // Simulate server-side processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, we would delete the chunk files after combining
    for (let i = 0; i < totalChunks; i++) {
      const chunkName = `${fileName}.part${i}`;
      try {
        await supabase.storage
          .from(this.bucket)
          .remove([chunkName]);
      } catch (error) {
        // Log but don't fail if cleanup fails
        logger.warn(`Failed to clean up chunk ${chunkName}`, error as Error);
      }
    }
  }

  /**
   * Calculate current upload progress
   */
  private calculateProgress(totalChunks: number): UploadProgress {
    const now = Date.now();
    const elapsedMs = now - this.lastProgressUpdate;
    
    // Only update speed calculation every 500ms
    if (elapsedMs > 500) {
      const bytesPerMs = this.uploadedBytes / (now - this.uploadStartTime);
      this.speedSamples.push(bytesPerMs * 1000); // Convert to bytes per second
      
      // Keep only the last 5 samples for moving average
      if (this.speedSamples.length > 5) {
        this.speedSamples.shift();
      }
      
      this.lastProgressUpdate = now;
    }
    
    // Calculate average speed from samples
    const avgSpeed = this.speedSamples.reduce((sum, speed) => sum + speed, 0) / 
                    Math.max(1, this.speedSamples.length);
    
    // Calculate time remaining
    const remainingBytes = this.file.size - this.uploadedBytes;
    const timeRemaining = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;
    
    return {
      loaded: this.uploadedBytes,
      total: this.file.size,
      percentage: (this.uploadedBytes / this.file.size) * 100,
      speed: avgSpeed,
      timeRemaining,
      currentChunk: this.completedChunks.size,
      totalChunks
    };
  }

  /**
   * Calculate upload speed
   */
  private calculateSpeed(loadedBytes: number): number {
    const now = Date.now();
    const elapsedSeconds = (now - this.uploadStartTime) / 1000;
    return elapsedSeconds > 0 ? loadedBytes / elapsedSeconds : 0;
  }

  /**
   * Calculate time remaining
   */
  private calculateTimeRemaining(loaded: number, total: number): number {
    const now = Date.now();
    const elapsedSeconds = (now - this.uploadStartTime) / 1000;
    const bytesPerSecond = elapsedSeconds > 0 ? loaded / elapsedSeconds : 0;
    
    return bytesPerSecond > 0 ? (total - loaded) / bytesPerSecond : 0;
  }

  /**
   * Get upload status
   */
  getStatus(): {
    inProgress: boolean;
    paused: boolean;
    progress: number;
    activeChunks: number;
    completedChunks: number;
    failedChunks: number;
  } {
    return {
      inProgress: this.activeChunks.size > 0 || this.failedChunks.size > 0,
      paused: this.paused,
      progress: (this.uploadedBytes / this.file.size) * 100,
      activeChunks: this.activeChunks.size,
      completedChunks: this.completedChunks.size,
      failedChunks: this.failedChunks.size
    };
  }
}
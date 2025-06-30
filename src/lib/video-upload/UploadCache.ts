import { logger } from '../logger';

export interface CachedUpload {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: number;
  expiresAt: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: any;
}

export class UploadCache {
  private static instance: UploadCache;
  private cache: Map<string, CachedUpload> = new Map();
  private readonly STORAGE_KEY = 'clipforge_upload_cache';
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  private constructor() {
    this.loadFromStorage();
    
    // Set up automatic cleanup
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
  }
  
  public static getInstance(): UploadCache {
    if (!UploadCache.instance) {
      UploadCache.instance = new UploadCache();
    }
    return UploadCache.instance;
  }
  
  /**
   * Add an upload to the cache
   */
  public addUpload(
    id: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    url: string,
    thumbnailUrl?: string,
    metadata?: any,
    ttl: number = this.DEFAULT_TTL
  ): void {
    const now = Date.now();
    
    const cachedUpload: CachedUpload = {
      id,
      fileName,
      fileSize,
      mimeType,
      uploadedAt: now,
      expiresAt: now + ttl,
      url,
      thumbnailUrl,
      metadata
    };
    
    this.cache.set(id, cachedUpload);
    this.saveToStorage();
    
    logger.debug('Added upload to cache', { id, fileName, fileSize });
  }
  
  /**
   * Get an upload from the cache
   */
  public getUpload(id: string): CachedUpload | undefined {
    const upload = this.cache.get(id);
    
    if (upload && upload.expiresAt < Date.now()) {
      // Upload has expired
      this.cache.delete(id);
      this.saveToStorage();
      return undefined;
    }
    
    return upload;
  }
  
  /**
   * Remove an upload from the cache
   */
  public removeUpload(id: string): boolean {
    const result = this.cache.delete(id);
    if (result) {
      this.saveToStorage();
      logger.debug('Removed upload from cache', { id });
    }
    return result;
  }
  
  /**
   * Get all uploads in the cache
   */
  public getAllUploads(): CachedUpload[] {
    // First clean up expired uploads
    this.cleanup();
    
    return Array.from(this.cache.values())
      .filter(upload => upload.expiresAt >= Date.now())
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
  }
  
  /**
   * Clear all uploads from the cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.saveToStorage();
    logger.debug('Cleared upload cache');
  }
  
  /**
   * Clean up expired uploads
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [id, upload] of this.cache.entries()) {
      if (upload.expiresAt < now) {
        this.cache.delete(id);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.saveToStorage();
      logger.debug('Cleaned up expired uploads', { expiredCount });
    }
  }
  
  /**
   * Save cache to local storage
   */
  private saveToStorage(): void {
    try {
      const data = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      logger.error('Failed to save upload cache to storage', error as Error);
    }
  }
  
  /**
   * Load cache from local storage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        try {
          const entries = JSON.parse(data) as [string, CachedUpload][];
          this.cache = new Map(entries);
          
          // Clean up expired entries
          this.cleanup();
          
          logger.debug('Loaded upload cache from storage', { 
            entries: this.cache.size 
          });
        } catch (parseError) {
          logger.error('Failed to parse upload cache data', parseError as Error);
          this.cache = new Map();
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }
    } catch (error) {
      logger.error('Failed to load upload cache from storage', error as Error);
      this.cache = new Map();
    }
  }
}

// Export singleton instance
export const uploadCache = UploadCache.getInstance();
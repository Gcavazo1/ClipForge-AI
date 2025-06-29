import { supabase } from './supabase';
import { VideoProject, ClipSegment, TranscriptSegment, User } from '../types';
import { logger } from './logger';
import { OptimizedDatabaseService } from './performance/optimized-database';
import { measurePerformance } from './performance/performance-monitor';
import { withRetry } from './error-handling/retry-manager';

// Enhanced database service for video projects
export class VideoProjectService {
  @measurePerformance('video-project-create')
  @withRetry({ maxAttempts: 3 })
  static async create(projectData: Omit<VideoProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<VideoProject> {
    try {
      const { data, error } = await supabase
        .from('video_projects')
        .insert([{
          title: projectData.title,
          description: projectData.description,
          video_url: projectData.videoUrl,
          thumbnail_url: projectData.thumbnailUrl,
          original_filename: projectData.title,
          duration: projectData.duration,
          file_size: projectData.size || 0,
          status: projectData.status,
          progress: projectData.progress || 0,
          error_message: projectData.error
        }])
        .select()
        .single();

      if (error) throw error;

      // Invalidate related caches
      OptimizedDatabaseService.invalidateCache(['user-projects']);

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error('Failed to create video project', error as Error);
      throw error;
    }
  }

  static async getById(id: string): Promise<VideoProject | null> {
    return OptimizedDatabaseService.cachedQuery(
      `video-project-${id}`,
      async () => {
        const { data, error } = await supabase
          .from('video_projects')
          .select('*')
          .eq('id', id)
          .is('deleted_at', null)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null; // Not found
          throw error;
        }

        return this.mapFromDatabase(data);
      },
      { ttl: 2 * 60 * 1000 } // 2 minutes cache
    );
  }

  static async getByUserId(userId: string): Promise<VideoProject[]> {
    return OptimizedDatabaseService.cachedQuery(
      `user-projects-${userId}`,
      async () => {
        const { data, error } = await supabase
          .from('video_projects')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(this.mapFromDatabase);
      },
      { ttl: 1 * 60 * 1000 } // 1 minute cache
    );
  }

  @measurePerformance('video-project-update')
  static async update(id: string, updates: Partial<VideoProject>): Promise<VideoProject> {
    try {
      const { data, error } = await supabase
        .from('video_projects')
        .update({
          title: updates.title,
          description: updates.description,
          video_url: updates.videoUrl,
          thumbnail_url: updates.thumbnailUrl,
          duration: updates.duration,
          file_size: updates.size,
          status: updates.status,
          progress: updates.progress,
          error_message: updates.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate related caches
      OptimizedDatabaseService.invalidateCache([`video-project-${id}`, 'user-projects']);

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error('Failed to update video project', error as Error, { id });
      throw error;
    }
  }

  @measurePerformance('video-project-delete')
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('video_projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Invalidate related caches
      OptimizedDatabaseService.invalidateCache([`video-project-${id}`, 'user-projects']);
    } catch (error) {
      logger.error('Failed to delete video project', error as Error, { id });
      throw error;
    }
  }

  static async updateStatus(
    id: string, 
    status: VideoProject['status'], 
    progress?: number, 
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_project_status', {
        project_id: id,
        new_status: status,
        progress_value: progress,
        error_msg: errorMessage
      });

      if (error) throw error;

      // Invalidate related caches
      OptimizedDatabaseService.invalidateCache([`video-project-${id}`, 'user-projects']);
    } catch (error) {
      logger.error('Failed to update project status', error as Error, { id, status });
      throw error;
    }
  }

  private static mapFromDatabase(data: any): VideoProject {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      duration: data.duration,
      size: data.file_size,
      status: data.status,
      progress: data.progress,
      error: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

// Enhanced database service for clip segments
export class ClipSegmentService {
  @measurePerformance('clip-segment-create')
  static async create(clipData: Omit<ClipSegment, 'id'>): Promise<ClipSegment> {
    try {
      const { data, error } = await supabase
        .from('clip_segments')
        .insert([{
          project_id: clipData.projectId,
          title: clipData.title,
          start_time: clipData.startTime,
          end_time: clipData.endTime,
          is_highlight: clipData.isHighlight,
          confidence: clipData.confidence,
          segment_type: clipData.type || 'manual',
          summary: clipData.summary
        }])
        .select()
        .single();

      if (error) throw error;

      // Invalidate related caches
      OptimizedDatabaseService.invalidateCache([`project-clips-${clipData.projectId}`]);

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error('Failed to create clip segment', error as Error);
      throw error;
    }
  }

  static async getByProjectId(projectId: string): Promise<ClipSegment[]> {
    return OptimizedDatabaseService.cachedQuery(
      `project-clips-${projectId}`,
      async () => {
        const { data, error } = await supabase
          .from('clip_segments')
          .select('*')
          .eq('project_id', projectId)
          .order('start_time', { ascending: true });

        if (error) throw error;

        return data.map(this.mapFromDatabase);
      },
      { ttl: 2 * 60 * 1000 } // 2 minutes cache
    );
  }

  @measurePerformance('clip-segment-update')
  static async update(id: string, updates: Partial<ClipSegment>): Promise<ClipSegment> {
    try {
      const { data, error } = await supabase
        .from('clip_segments')
        .update({
          title: updates.title,
          start_time: updates.startTime,
          end_time: updates.endTime,
          is_highlight: updates.isHighlight,
          confidence: updates.confidence,
          segment_type: updates.type,
          summary: updates.summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate related caches
      const result = this.mapFromDatabase(data);
      OptimizedDatabaseService.invalidateCache([`project-clips-${result.projectId}`]);

      return result;
    } catch (error) {
      logger.error('Failed to update clip segment', error as Error, { id });
      throw error;
    }
  }

  @measurePerformance('clip-segment-delete')
  static async delete(id: string): Promise<void> {
    try {
      // Get project ID before deletion for cache invalidation
      const { data: clipData } = await supabase
        .from('clip_segments')
        .select('project_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('clip_segments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidate related caches
      if (clipData) {
        OptimizedDatabaseService.invalidateCache([`project-clips-${clipData.project_id}`]);
      }
    } catch (error) {
      logger.error('Failed to delete clip segment', error as Error, { id });
      throw error;
    }
  }

  private static mapFromDatabase(data: any): ClipSegment {
    return {
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      startTime: data.start_time,
      endTime: data.end_time,
      isHighlight: data.is_highlight,
      confidence: data.confidence,
      type: data.segment_type,
      summary: data.summary
    };
  }
}

// Enhanced database service for transcript segments
export class TranscriptSegmentService {
  @measurePerformance('transcript-batch-create')
  static async createBatch(segments: Omit<TranscriptSegment, 'id'>[]): Promise<TranscriptSegment[]> {
    try {
      // Use optimized batch insert
      const data = await OptimizedDatabaseService.batchInsert(
        'transcript_segments',
        segments.map(segment => ({
          project_id: segment.projectId,
          start_time: segment.startTime,
          end_time: segment.endTime,
          text: segment.text,
          speaker_id: segment.speakerId,
          confidence: segment.confidence || 1.0,
          language: 'en',
          word_count: segment.text.split(' ').length
        }))
      );

      // Invalidate related caches
      if (segments.length > 0) {
        OptimizedDatabaseService.invalidateCache([`project-transcript-${segments[0].projectId}`]);
      }

      return data.map(this.mapFromDatabase);
    } catch (error) {
      logger.error('Failed to create transcript segments', error as Error);
      throw error;
    }
  }

  static async getByProjectId(projectId: string): Promise<TranscriptSegment[]> {
    return OptimizedDatabaseService.cachedQuery(
      `project-transcript-${projectId}`,
      async () => {
        const { data, error } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('project_id', projectId)
          .order('start_time', { ascending: true });

        if (error) throw error;

        return data.map(this.mapFromDatabase);
      },
      { ttl: 5 * 60 * 1000 } // 5 minutes cache (transcripts don't change often)
    );
  }

  @measurePerformance('transcript-delete-by-project')
  static async deleteByProjectId(projectId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('transcript_segments')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;

      // Invalidate related caches
      OptimizedDatabaseService.invalidateCache([`project-transcript-${projectId}`]);
    } catch (error) {
      logger.error('Failed to delete transcript segments', error as Error, { projectId });
      throw error;
    }
  }

  private static mapFromDatabase(data: any): TranscriptSegment {
    return {
      id: data.id,
      projectId: data.project_id,
      startTime: data.start_time,
      endTime: data.end_time,
      text: data.text,
      speakerId: data.speaker_id,
      confidence: data.confidence
    };
  }
}

// Enhanced database service for user profiles
export class UserProfileService {
  static async getProfile(userId: string): Promise<User | null> {
    return OptimizedDatabaseService.cachedQuery(
      `user-profile-${userId}`,
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null; // Not found
          throw error;
        }

        return this.mapFromDatabase(data);
      },
      { ttl: 10 * 60 * 1000 } // 10 minutes cache
    );
  }

  @measurePerformance('user-profile-update')
  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          display_name: updates.name,
          avatar_url: updates.avatar,
          plan_type: updates.plan,
          preferences: updates.notifications ? {
            notifications: updates.notifications
          } : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Invalidate related caches
      OptimizedDatabaseService.invalidateCache([`user-profile-${userId}`]);

      return this.mapFromDatabase(data);
    } catch (error) {
      logger.error('Failed to update user profile', error as Error, { userId });
      throw error;
    }
  }

  @measurePerformance('user-usage-stats-update')
  static async updateUsageStats(userId: string): Promise<void> {
    try {
      const { data: stats, error } = await supabase.rpc('get_user_usage_stats', {
        user_uuid: userId
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          usage_stats: stats,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Invalidate related caches
      OptimizedDatabaseService.invalidateCache([`user-profile-${userId}`]);
    } catch (error) {
      logger.error('Failed to update usage stats', error as Error, { userId });
      throw error;
    }
  }

  private static mapFromDatabase(data: any): User {
    return {
      id: data.id,
      name: data.display_name || '',
      email: data.email || '',
      avatar: data.avatar_url,
      plan: data.plan_type || 'free',
      usage: data.usage_stats || {
        clipsCreated: 0,
        exportsUsed: 0,
        storageUsed: 0,
        lastResetDate: new Date().toISOString()
      },
      notifications: data.preferences?.notifications || {
        email: true,
        push: true
      },
      createdAt: data.created_at
    };
  }
}
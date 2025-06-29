import { logger } from '../logger';
import { VideoProject } from '../../types';
import { AIServiceIntegration } from '../ai/ai-service-integration';
import { VideoProjectService } from '../database';

export interface ProcessingTask {
  id: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  options: {
    transcriptionProvider?: string;
    analysisProvider?: string;
    language?: string;
    generateHighlights?: boolean;
    autoCreateClips?: boolean;
  };
}

export class VideoProcessingQueue {
  private static instance: VideoProcessingQueue;
  private queue: ProcessingTask[] = [];
  private activeTask: ProcessingTask | null = null;
  private isProcessing: boolean = false;
  private maxConcurrentTasks: number = 1; // For now, process one at a time
  
  private constructor() {
    // Start processing queue immediately
    this.processQueue();
    
    // Set up interval to check queue periodically
    setInterval(() => this.processQueue(), 10000);
  }
  
  public static getInstance(): VideoProcessingQueue {
    if (!VideoProcessingQueue.instance) {
      VideoProcessingQueue.instance = new VideoProcessingQueue();
    }
    return VideoProcessingQueue.instance;
  }
  
  /**
   * Add a task to the processing queue
   */
  public addTask(
    projectId: string,
    userId: string,
    options: ProcessingTask['options'] = {}
  ): ProcessingTask {
    const task: ProcessingTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      projectId,
      userId,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      options: {
        transcriptionProvider: options.transcriptionProvider || 'openai',
        analysisProvider: options.analysisProvider || 'groq',
        language: options.language || 'en',
        generateHighlights: options.generateHighlights !== false,
        autoCreateClips: options.autoCreateClips !== false
      }
    };
    
    this.queue.push(task);
    
    logger.info('Added task to processing queue', { 
      taskId: task.id, 
      projectId, 
      userId 
    });
    
    // Trigger queue processing
    this.processQueue();
    
    return task;
  }
  
  /**
   * Get a task by ID
   */
  public getTask(taskId: string): ProcessingTask | undefined {
    if (this.activeTask?.id === taskId) {
      return this.activeTask;
    }
    
    return this.queue.find(task => task.id === taskId);
  }
  
  /**
   * Get all tasks for a project
   */
  public getTasksForProject(projectId: string): ProcessingTask[] {
    const tasks = this.queue.filter(task => task.projectId === projectId);
    
    if (this.activeTask && this.activeTask.projectId === projectId) {
      tasks.unshift(this.activeTask);
    }
    
    return tasks;
  }
  
  /**
   * Get all tasks for a user
   */
  public getTasksForUser(userId: string): ProcessingTask[] {
    const tasks = this.queue.filter(task => task.userId === userId);
    
    if (this.activeTask && this.activeTask.userId === userId) {
      tasks.unshift(this.activeTask);
    }
    
    return tasks;
  }
  
  /**
   * Cancel a task
   */
  public cancelTask(taskId: string): boolean {
    // If task is active, we can't cancel it
    if (this.activeTask?.id === taskId) {
      return false;
    }
    
    // Find task in queue
    const index = this.queue.findIndex(task => task.id === taskId);
    if (index === -1) {
      return false;
    }
    
    // Remove task from queue
    this.queue.splice(index, 1);
    
    logger.info('Cancelled processing task', { taskId });
    
    return true;
  }
  
  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    // If already processing or queue is empty, do nothing
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Get next task
      const task = this.queue.shift();
      if (!task) {
        this.isProcessing = false;
        return;
      }
      
      this.activeTask = task;
      task.status = 'processing';
      task.startedAt = Date.now();
      
      logger.info('Processing task from queue', { 
        taskId: task.id, 
        projectId: task.projectId 
      });
      
      // Update project status
      await VideoProjectService.updateStatus(
        task.projectId,
        'processing',
        0
      );
      
      // Process the task
      await this.processTask(task);
      
    } catch (error) {
      logger.error('Error processing queue', error as Error);
    } finally {
      this.activeTask = null;
      this.isProcessing = false;
      
      // Continue processing queue if there are more tasks
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }
  
  /**
   * Process a single task
   */
  private async processTask(task: ProcessingTask): Promise<void> {
    try {
      // Get project
      const project = await VideoProjectService.getById(task.projectId);
      if (!project) {
        throw new Error(`Project not found: ${task.projectId}`);
      }
      
      // Update task progress
      const updateProgress = (stage: string, progress: number) => {
        task.progress = progress;
        
        // Update project status
        VideoProjectService.updateStatus(
          task.projectId,
          'processing',
          progress
        ).catch(err => {
          logger.error('Failed to update project status', err as Error);
        });
      };
      
      // Process with AI
      const result = await AIServiceIntegration.processVideoWithAI(
        {
          projectId: task.projectId,
          videoFile: await this.getVideoFile(project.videoUrl),
          userId: task.userId,
          options: task.options
        },
        updateProgress
      );
      
      // Update task status
      task.status = 'completed';
      task.progress = 100;
      task.completedAt = Date.now();
      
      // Update project status
      await VideoProjectService.updateStatus(
        task.projectId,
        'ready',
        100
      );
      
      logger.info('Processing task completed successfully', { 
        taskId: task.id,
        projectId: task.projectId,
        transcriptSegments: result.transcript.length,
        highlights: result.highlights.length
      });
      
    } catch (error) {
      logger.error('Processing task failed', error as Error, { 
        taskId: task.id,
        projectId: task.projectId
      });
      
      // Update task status
      task.status = 'error';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Update project status
      await VideoProjectService.updateStatus(
        task.projectId,
        'error',
        0,
        task.error
      ).catch(err => {
        logger.error('Failed to update project status', err as Error);
      });
    }
  }
  
  /**
   * Get video file from URL
   */
  private async getVideoFile(url: string): Promise<File> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], 'video.mp4', { type: 'video/mp4' });
    } catch (error) {
      logger.error('Failed to get video file', error as Error);
      throw new Error('Failed to get video file');
    }
  }
}

// Export singleton instance
export const videoProcessingQueue = VideoProcessingQueue.getInstance();
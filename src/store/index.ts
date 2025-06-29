import { create } from 'zustand';
import { VideoProject, ClipSegment, TranscriptSegment, ExportOptions, User } from '../types';
import { VideoProjectService, ClipSegmentService, TranscriptSegmentService, UserProfileService } from '../lib/database';
import { logger } from '../logger';

interface AppState {
  // User state
  isAuthenticated: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  loadUserProfile: () => Promise<void>;
  
  // Project data
  projects: VideoProject[];
  currentProject: VideoProject | null;
  clipSegments: ClipSegment[];
  transcript: TranscriptSegment[];
  
  // UI state
  currentTime: number;
  selectedClipId: string | null;
  isPlaying: boolean;
  exportOptions: ExportOptions;
  
  // Upload state
  isUploading: boolean;
  uploadProgress: number;
  isTranscribing: boolean;
  transcribeProgress: number;
  
  // Methods
  setCurrentProject: (project: VideoProject | null) => void;
  setClipSegments: (segments: ClipSegment[]) => void;
  setTranscript: (transcript: TranscriptSegment[]) => void;
  setCurrentTime: (time: number) => void;
  setSelectedClipId: (id: string | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  
  // Project management
  addProject: (project: VideoProject) => void;
  updateProject: (id: string, updates: Partial<VideoProject>) => void;
  removeProject: (id: string) => void;
  loadProjects: () => Promise<void>;
  
  // Clip management
  addClipSegment: (segment: ClipSegment) => void;
  updateClipSegment: (id: string, updates: Partial<ClipSegment>) => void;
  removeClipSegment: (id: string) => void;
  loadClipSegments: (projectId: string) => Promise<void>;
  
  // Transcript management
  loadTranscript: (projectId: string) => Promise<void>;
  saveTranscript: (projectId: string, segments: TranscriptSegment[]) => Promise<void>;
  
  // Export settings
  updateExportOptions: (options: Partial<ExportOptions>) => void;
  
  // Upload and transcribe methods
  setUploadState: (isUploading: boolean, progress?: number | ((prev: number) => number)) => void;
  setTranscribeState: (isTranscribing: boolean, progress?: number | ((prev: number) => number)) => void;
}

// Default export options
const defaultExportOptions: ExportOptions = {
  format: 'mp4',
  quality: 'high',
  resolution: '1080p',
  includeCaptions: true,
  captionStyle: {
    font: 'Inter',
    size: 24,
    color: '#FFFFFF',
    backgroundColor: '#000000',
    position: 'bottom',
    opacity: 0.8,
    outline: true,
    outlineColor: '#000000',
  },
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  projects: [],
  currentProject: null,
  clipSegments: [],
  transcript: [],
  currentTime: 0,
  selectedClipId: null,
  isPlaying: false,
  exportOptions: defaultExportOptions,
  
  // Upload state
  isUploading: false,
  uploadProgress: 0,
  isTranscribing: false,
  transcribeProgress: 0,
  
  // User methods
  setUser: (user) => {
    logger.debug('Setting user state', { 
      userId: user?.id, 
      isAuthenticated: !!user 
    });
    
    set({ 
      user,
      isAuthenticated: !!user
    });
  },
  
  loadUserProfile: async () => {
    const { user } = get();
    if (!user) {
      logger.debug('No user to load profile for');
      return;
    }
    
    try {
      logger.info('Loading user profile', { userId: user.id });
      const profile = await UserProfileService.getProfile(user.id);
      
      if (profile) {
        logger.info('User profile loaded successfully', { userId: user.id });
        set({ user: { ...user, ...profile } });
      } else {
        // If no profile exists, we'll create default values
        logger.warn('No user profile found during loadUserProfile', { userId: user.id });
        
        // Keep the user authenticated but with default values
        set({ 
          user: { 
            ...user,
            name: user.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            plan: 'free',
            usage: {
              clipsCreated: 0,
              exportsUsed: 0,
              storageUsed: 0,
              lastResetDate: new Date().toISOString()
            },
            notifications: {
              email: true,
              push: true
            }
          } 
        });
        
        // Try to create the profile
        try {
          await UserProfileService.updateProfile(user.id, {
            name: user.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            plan: 'free'
          });
          logger.info('Created default user profile', { userId: user.id });
        } catch (createError) {
          logger.error('Failed to create default user profile', createError as Error);
        }
      }
    } catch (error) {
      logger.error('Failed to load user profile', error as Error);
      
      // Don't fail completely, keep user authenticated with default values
      set({ 
        user: { 
          ...user,
          name: user.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          plan: 'free',
          usage: {
            clipsCreated: 0,
            exportsUsed: 0,
            storageUsed: 0,
            lastResetDate: new Date().toISOString()
          },
          notifications: {
            email: true,
            push: true
          }
        } 
      });
    }
  },
  
  // Methods
  setCurrentProject: (project) => set({ currentProject: project }),
  setClipSegments: (segments) => set({ clipSegments: segments }),
  setTranscript: (transcript) => set({ transcript }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  // Project management
  addProject: (project) => {
    logger.debug('Adding project to store', { projectId: project.id });
    
    // Ensure project has valid dates
    const validatedProject = {
      ...project,
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: project.updatedAt || new Date().toISOString()
    };
    
    set((state) => ({ 
      projects: [validatedProject, ...state.projects] 
    }));
  },
  
  updateProject: (id, updates) => {
    logger.debug('Updating project in store', { projectId: id });
    set((state) => ({ 
      projects: state.projects.map((project) => 
        project.id === id ? { ...project, ...updates } : project
      ),
      currentProject: state.currentProject?.id === id 
        ? { ...state.currentProject, ...updates } 
        : state.currentProject
    }));
  },
  
  removeProject: async (id) => {
    try {
      logger.info('Removing project', { projectId: id });
      await VideoProjectService.delete(id);
      set((state) => ({ 
        projects: state.projects.filter((project) => project.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject
      }));
    } catch (error) {
      logger.error('Failed to remove project', error as Error, { id });
      throw error;
    }
  },
  
  loadProjects: async () => {
    const { user } = get();
    if (!user) {
      logger.debug('No user to load projects for');
      return;
    }
    
    try {
      logger.info('Loading projects for user', { userId: user.id });
      const projects = await VideoProjectService.getByUserId(user.id);
      
      // Ensure all projects have valid dates
      const validatedProjects = projects.map(project => ({
        ...project,
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: project.updatedAt || new Date().toISOString()
      }));
      
      set({ projects: validatedProjects });
      logger.debug('Projects loaded successfully', { count: projects.length });
    } catch (error) {
      logger.error('Failed to load projects', error as Error);
    }
  },
  
  // Clip management
  addClipSegment: async (segment) => {
    try {
      logger.info('Adding clip segment', { projectId: segment.projectId });
      const createdSegment = await ClipSegmentService.create(segment);
      set((state) => ({ 
        clipSegments: [...state.clipSegments, createdSegment] 
      }));
    } catch (error) {
      logger.error('Failed to add clip segment', error as Error);
      throw error;
    }
  },
  
  updateClipSegment: async (id, updates) => {
    try {
      logger.info('Updating clip segment', { clipId: id });
      const updatedSegment = await ClipSegmentService.update(id, updates);
      set((state) => ({ 
        clipSegments: state.clipSegments.map((segment) => 
          segment.id === id ? updatedSegment : segment
        ) 
      }));
    } catch (error) {
      logger.error('Failed to update clip segment', error as Error, { id });
      throw error;
    }
  },
  
  removeClipSegment: async (id) => {
    try {
      logger.info('Removing clip segment', { clipId: id });
      await ClipSegmentService.delete(id);
      set((state) => ({ 
        clipSegments: state.clipSegments.filter((segment) => segment.id !== id),
        selectedClipId: state.selectedClipId === id ? null : state.selectedClipId
      }));
    } catch (error) {
      logger.error('Failed to remove clip segment', error as Error, { id });
      throw error;
    }
  },
  
  loadClipSegments: async (projectId) => {
    try {
      logger.info('Loading clip segments', { projectId });
      const segments = await ClipSegmentService.getByProjectId(projectId);
      set({ clipSegments: segments });
      logger.debug('Clip segments loaded successfully', { count: segments.length });
    } catch (error) {
      logger.error('Failed to load clip segments', error as Error, { projectId });
    }
  },
  
  // Transcript management
  loadTranscript: async (projectId) => {
    try {
      logger.info('Loading transcript', { projectId });
      const segments = await TranscriptSegmentService.getByProjectId(projectId);
      set({ transcript: segments });
      logger.debug('Transcript loaded successfully', { count: segments.length });
    } catch (error) {
      logger.error('Failed to load transcript', error as Error, { projectId });
    }
  },
  
  saveTranscript: async (projectId, segments) => {
    try {
      logger.info('Saving transcript', { projectId, segmentCount: segments.length });
      // Delete existing segments
      await TranscriptSegmentService.deleteByProjectId(projectId);
      
      // Create new segments
      const segmentsWithProjectId = segments.map(segment => ({
        ...segment,
        projectId
      }));
      
      const createdSegments = await TranscriptSegmentService.createBatch(segmentsWithProjectId);
      set({ transcript: createdSegments });
      logger.debug('Transcript saved successfully');
    } catch (error) {
      logger.error('Failed to save transcript', error as Error, { projectId });
      throw error;
    }
  },
  
  // Export settings
  updateExportOptions: (options) => set((state) => ({ 
    exportOptions: { ...state.exportOptions, ...options } 
  })),
  
  // Upload and transcribe methods
  setUploadState: (isUploading, progress = 0) => set((state) => ({ 
    isUploading, 
    uploadProgress: isUploading ? 
      (typeof progress === 'function' ? progress(state.uploadProgress) : progress) : 0 
  })),
  
  setTranscribeState: (isTranscribing, progress = 0) => set((state) => ({ 
    isTranscribing, 
    transcribeProgress: isTranscribing ? 
      (typeof progress === 'function' ? progress(state.transcribeProgress) : progress) : 0 
  })),
}));
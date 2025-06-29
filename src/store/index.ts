import { create } from 'zustand';
import { VideoProject, ClipSegment, TranscriptSegment, ExportOptions, User } from '../types';
import { VideoProjectService, ClipSegmentService, TranscriptSegmentService, UserProfileService } from '../lib/database';
import { logger } from '../lib/logger';

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
  setUser: (user) => set({ 
    user,
    isAuthenticated: !!user
  }),
  
  loadUserProfile: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const profile = await UserProfileService.getProfile(user.id);
      if (profile) {
        set({ user: { ...user, ...profile } });
      }
    } catch (error) {
      logger.error('Failed to load user profile', error as Error);
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
  addProject: (project) => set((state) => ({ 
    projects: [project, ...state.projects] 
  })),
  
  updateProject: (id, updates) => set((state) => ({ 
    projects: state.projects.map((project) => 
      project.id === id ? { ...project, ...updates } : project
    ),
    currentProject: state.currentProject?.id === id 
      ? { ...state.currentProject, ...updates } 
      : state.currentProject
  })),
  
  removeProject: async (id) => {
    try {
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
    if (!user) return;
    
    try {
      const projects = await VideoProjectService.getByUserId(user.id);
      set({ projects });
    } catch (error) {
      logger.error('Failed to load projects', error as Error);
    }
  },
  
  // Clip management
  addClipSegment: async (segment) => {
    try {
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
      const segments = await ClipSegmentService.getByProjectId(projectId);
      set({ clipSegments: segments });
    } catch (error) {
      logger.error('Failed to load clip segments', error as Error, { projectId });
    }
  },
  
  // Transcript management
  loadTranscript: async (projectId) => {
    try {
      const segments = await TranscriptSegmentService.getByProjectId(projectId);
      set({ transcript: segments });
    } catch (error) {
      logger.error('Failed to load transcript', error as Error, { projectId });
    }
  },
  
  saveTranscript: async (projectId, segments) => {
    try {
      // Delete existing segments
      await TranscriptSegmentService.deleteByProjectId(projectId);
      
      // Create new segments
      const segmentsWithProjectId = segments.map(segment => ({
        ...segment,
        projectId
      }));
      
      const createdSegments = await TranscriptSegmentService.createBatch(segmentsWithProjectId);
      set({ transcript: createdSegments });
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
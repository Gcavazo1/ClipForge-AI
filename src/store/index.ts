import { create } from 'zustand';
import { VideoProject, ClipSegment, TranscriptSegment, ExportOptions } from '../types';

interface AppState {
  // Current user state
  isAuthenticated: boolean;
  user: { id: string; name: string } | null;
  
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
  
  // Clip management
  addClipSegment: (segment: ClipSegment) => void;
  updateClipSegment: (id: string, updates: Partial<ClipSegment>) => void;
  removeClipSegment: (id: string) => void;
  
  // Export settings
  updateExportOptions: (options: Partial<ExportOptions>) => void;
  
  // Upload and transcribe methods
  setUploadState: (isUploading: boolean, progress?: number) => void;
  setTranscribeState: (isTranscribing: boolean, progress?: number) => void;
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

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  isAuthenticated: true, // Mock authenticated state
  user: { id: '1', name: 'Demo User' },
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
  
  // Methods
  setCurrentProject: (project) => set({ currentProject: project }),
  setClipSegments: (segments) => set({ clipSegments: segments }),
  setTranscript: (transcript) => set({ transcript }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  // Project management
  addProject: (project) => set((state) => ({ 
    projects: [...state.projects, project] 
  })),
  
  updateProject: (id, updates) => set((state) => ({ 
    projects: state.projects.map((project) => 
      project.id === id ? { ...project, ...updates } : project
    ),
    currentProject: state.currentProject?.id === id 
      ? { ...state.currentProject, ...updates } 
      : state.currentProject
  })),
  
  removeProject: (id) => set((state) => ({ 
    projects: state.projects.filter((project) => project.id !== id),
    currentProject: state.currentProject?.id === id ? null : state.currentProject
  })),
  
  // Clip management
  addClipSegment: (segment) => set((state) => ({ 
    clipSegments: [...state.clipSegments, segment] 
  })),
  
  updateClipSegment: (id, updates) => set((state) => ({ 
    clipSegments: state.clipSegments.map((segment) => 
      segment.id === id ? { ...segment, ...updates } : segment
    ) 
  })),
  
  removeClipSegment: (id) => set((state) => ({ 
    clipSegments: state.clipSegments.filter((segment) => segment.id !== id),
    selectedClipId: state.selectedClipId === id ? null : state.selectedClipId
  })),
  
  // Export settings
  updateExportOptions: (options) => set((state) => ({ 
    exportOptions: { ...state.exportOptions, ...options } 
  })),
  
  // Upload and transcribe methods
  setUploadState: (isUploading, progress = 0) => set({ 
    isUploading, 
    uploadProgress: isUploading ? progress : 0 
  }),
  
  setTranscribeState: (isTranscribing, progress = 0) => set({ 
    isTranscribing, 
    transcribeProgress: isTranscribing ? progress : 0 
  }),
}));
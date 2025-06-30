import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Download, ArrowLeft, Settings, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../components/ui/button';
import VideoPlayer from '../components/video/VideoPlayer';
import Timeline from '../components/video/Timeline';
import ClipControls from '../components/video/ClipControls';
import CaptionSettings from '../components/video/CaptionSettings';
import { useAppStore } from '../store';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';
import { ClipSegment, VideoProject } from '../types';
import { mockProjects, mockTranscript, mockClipSegments } from '../lib/mockData';
import { detectHighlights } from '../lib/utils';
import { renderCaptionsOverlay } from '../lib/renderCaptionsOverlay';
import { logger } from '../lib/logger';
import { VideoProjectService } from '../lib/database';

const EditorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  // Global state
  const projects = useAppStore((state) => state.projects);
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);
  const currentProject = useAppStore((state) => state.currentProject);
  const clipSegments = useAppStore((state) => state.clipSegments);
  const transcript = useAppStore((state) => state.transcript);
  const currentTime = useAppStore((state) => state.currentTime);
  const selectedClipId = useAppStore((state) => state.selectedClipId);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const exportOptions = useAppStore((state) => state.exportOptions);
  const loadProjects = useAppStore((state) => state.loadProjects);
  
  // Actions
  const setClipSegments = useAppStore((state) => state.setClipSegments);
  const setTranscript = useAppStore((state) => state.setTranscript);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);
  const setSelectedClipId = useAppStore((state) => state.setSelectedClipId);
  const setIsPlaying = useAppStore((state) => state.setIsPlaying);
  const updateClipSegment = useAppStore((state) => state.updateClipSegment);
  const removeClipSegment = useAppStore((state) => state.removeClipSegment);
  const updateExportOptions = useAppStore((state) => state.updateExportOptions);
  
  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });
  const [showToast, setShowToast] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempted, setLoadAttempted] = useState(false);
  
  // Load project data
  useEffect(() => {
    // Prevent infinite loop by tracking if we've already attempted to load
    if (loadAttempted) return;
    
    const loadProject = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Validate projectId
        if (!projectId || projectId === 'undefined' || projectId === 'null') {
          logger.warn('No valid project ID provided in URL');
          setError('No valid project ID provided');
          setIsLoading(false);
          return;
        }
        
        logger.info('Loading project data', { projectId });
        
        // Try to find project in store first
        const project = projects.find((p) => p.id === projectId);
        
        if (project) {
          logger.info('Project found in store', { projectId });
          setCurrentProject(project);
          
          // Load transcript and clips if needed
          if (transcript.length === 0) {
            setTranscript(mockTranscript);
          }
          
          if (clipSegments.length === 0) {
            setClipSegments(mockClipSegments);
          }
          
          setIsLoading(false);
          return;
        }
        
        // If not in store, try to load from database
        try {
          const dbProject = await VideoProjectService.getById(projectId);
          if (dbProject) {
            logger.info('Project loaded from database', { projectId });
            setCurrentProject(dbProject);
            
            // Load transcript and clips if needed
            if (transcript.length === 0) {
              setTranscript(mockTranscript);
            }
            
            if (clipSegments.length === 0) {
              setClipSegments(mockClipSegments);
            }
            
            setIsLoading(false);
            return;
          }
        } catch (dbError) {
          logger.warn('Failed to load project from database', dbError as Error);
          // Continue to try loading from mock data
        }
        
        // Try to find in mock data
        logger.info('Project not found in store or database, checking mock data', { projectId });
        const mockProject = mockProjects.find((p) => p.id === projectId);
        
        if (mockProject) {
          setCurrentProject(mockProject);
          setTranscript(mockTranscript);
          setClipSegments(mockClipSegments);
          setIsLoading(false);
        } else {
          // Try to load all projects in case it hasn't been loaded yet
          await loadProjects();
          
          // Check again after loading
          const refreshedProject = projects.find((p) => p.id === projectId);
          if (refreshedProject) {
            setCurrentProject(refreshedProject);
            setTranscript(mockTranscript);
            setClipSegments(mockClipSegments);
            setIsLoading(false);
          } else {
            logger.error('Project not found', { projectId });
            setError('Project not found');
            setIsLoading(false);
          }
        }
      } catch (error) {
        logger.error('Error loading project', error as Error);
        setError(error instanceof Error ? error.message : 'Failed to load project');
        setIsLoading(false);
      } finally {
        setLoadAttempted(true);
      }
    };
    
    loadProject();
    
    return () => {
      // Clean up
      setCurrentProject(null);
    };
  }, [projectId, projects, navigate, setCurrentProject, setTranscript, setClipSegments, loadProjects, transcript.length, clipSegments.length, loadAttempted]);
  
  const selectedClip = clipSegments.find((clip) => clip.id === selectedClipId);
  
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };
  
  const handlePlayPause = (play: boolean) => {
    setIsPlaying(play);
  };
  
  const handleClipSelect = (clipId: string | null) => {
    setSelectedClipId(clipId);
  };
  
  const handleSaveClip = (clip: ClipSegment) => {
    updateClipSegment(clip.id, clip);
    
    setToastMessage({
      title: 'Clip Updated',
      description: 'Your changes have been saved successfully.'
    });
    setShowToast(true);
  };
  
  const handleDeleteClip = (clipId: string) => {
    removeClipSegment(clipId);
    
    setToastMessage({
      title: 'Clip Deleted',
      description: 'The clip has been removed.'
    });
    setShowToast(true);
  };
  
  const handleCaptionStyleChange = (style: typeof exportOptions.captionStyle) => {
    updateExportOptions({ captionStyle: style });
  };
  
  const handleAutoDetect = () => {
    if (transcript.length > 0) {
      const highlights = detectHighlights(transcript);
      
      const newClipSegments = highlights.map((highlight, index) => ({
        id: `auto-clip-${Date.now()}-${index}`,
        projectId: currentProject?.id || '',
        startTime: highlight.startTime,
        endTime: highlight.endTime,
        title: `Auto Clip ${index + 1}`,
        isHighlight: true,
        confidence: highlight.confidence,
      }));
      
      setClipSegments([...clipSegments, ...newClipSegments]);
      
      setToastMessage({
        title: 'Highlights Detected',
        description: `Found ${newClipSegments.length} potential highlights in your video.`
      });
      setShowToast(true);
    }
  };
  
  const handleExport = async () => {
    if (!selectedClip || !currentProject) {
      setToastMessage({
        title: 'No Clip Selected',
        description: 'Please select a clip to export.'
      });
      setShowToast(true);
      return;
    }
    
    setIsExporting(true);
    
    try {
      // Get relevant transcript segments for the selected clip
      const clipTranscript = transcript.filter(segment => 
        segment.startTime >= selectedClip.startTime && 
        segment.endTime <= selectedClip.endTime
      );
      
      // Create a video file from the source URL
      const response = await fetch(currentProject.videoUrl);
      const videoBlob = await response.blob();
      const videoFile = new File([videoBlob], 'source.mp4', { type: 'video/mp4' });
      
      // Render captions
      await renderCaptionsOverlay(
        videoFile,
        clipTranscript.map(segment => ({
          start: segment.startTime,
          end: segment.endTime,
          text: segment.text
        })),
        {
          style: 'tiktok',
          fontFamily: exportOptions.captionStyle.font,
          captionColor: exportOptions.captionStyle.color,
          backgroundColor: exportOptions.captionStyle.backgroundColor,
          waveform: true
        }
      );
      
      setToastMessage({
        title: 'Export Complete',
        description: 'Your clip has been exported successfully.'
      });
    } catch (error) {
      console.error('Export failed:', error);
      setToastMessage({
        title: 'Export Failed',
        description: 'There was an error exporting your clip. Please try again.'
      });
    } finally {
      setIsExporting(false);
      setShowToast(true);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--nav-height))]">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-foreground-muted">Loading editor...</p>
        </div>
      </div>
    );
  }
  
  if (error || !currentProject) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-error-900/20 text-error-500 p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold mb-4">Error Loading Project</h2>
          <p className="mb-6">{error || 'Project not found or could not be loaded'}</p>
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="mr-2"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentProject.title}</h1>
            <p className="text-foreground-muted">Editor</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={16} className="mr-2" />
            {showSettings ? 'Hide Settings' : 'Settings'}
          </Button>
          
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting || !selectedClip}
          >
            <Download size={16} className="mr-2" />
            {isExporting ? 'Exporting...' : 'Export Clip'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <VideoPlayer
            src={currentProject.videoUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onTimeUpdate={handleTimeUpdate}
            onPlayPause={handlePlayPause}
            captions={transcript}
            showCaptions={exportOptions.includeCaptions}
          />
          
          <Timeline
            duration={currentProject.duration || 0}
            currentTime={currentTime}
            clipSegments={clipSegments}
            transcript={transcript}
            onTimeChange={handleTimeUpdate}
            onClipSelect={handleClipSelect}
            selectedClipId={selectedClipId}
          />
          
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleAutoDetect}
              className="mx-auto"
            >
              Auto-Detect Highlights
            </Button>
          </div>
        </div>
        
        <div className="space-y-6">
          <ClipControls
            selectedClip={selectedClip}
            onSaveClip={handleSaveClip}
            onDeleteClip={handleDeleteClip}
            onPlayClip={(time) => {
              setCurrentTime(time);
              setIsPlaying(true);
            }}
            duration={currentProject.duration || 0}
            onExport={handleExport}
          />
          
          {showSettings && (
            <CaptionSettings
              style={exportOptions.captionStyle}
              onChange={handleCaptionStyleChange}
            />
          )}
          
          {!showSettings && (
            <div className="bg-background-light rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">Export Tips</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <p>Select a clip from the timeline before exporting</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <p>Keep clips between 15-60 seconds for social media</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <p>Use captions to increase engagement (85% of videos are watched without sound)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showToast && (
        <Toast 
          open={showToast} 
          onOpenChange={setShowToast}
          variant="default"
        >
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default EditorPage;
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Download, ArrowLeft, Settings, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/button';
import VideoPlayer from '../components/video/VideoPlayer';
import Timeline from '../components/video/Timeline';
import ClipControls from '../components/video/ClipControls';
import CaptionSettings from '../components/video/CaptionSettings';
import { useAppStore } from '../store';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';
import { ClipSegment, ExportOptions } from '../types';
import { mockProjects, mockTranscript, mockClipSegments } from '../lib/mockData';
import { detectHighlights } from '../lib/utils';
import { renderCaptionsOverlay } from '../lib/renderCaptionsOverlay';

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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });
  const [isExporting, setIsExporting] = useState(false);
  
  // Load project data
  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      
      if (project) {
        setCurrentProject(project);
        
        if (transcript.length === 0) {
          setTranscript(mockTranscript);
        }
        
        if (clipSegments.length === 0) {
          setClipSegments(mockClipSegments);
        }
      } else {
        const mockProject = mockProjects.find((p) => p.id === projectId);
        
        if (mockProject) {
          setCurrentProject(mockProject);
          setTranscript(mockTranscript);
          setClipSegments(mockClipSegments);
        } else {
          navigate('/dashboard');
        }
      }
    } else {
      navigate('/dashboard');
    }
    
    return () => {
      setCurrentProject(null);
    };
  }, [projectId, projects, navigate, setCurrentProject, setTranscript, setClipSegments, transcript.length, clipSegments.length]);
  
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
  
  const handleCaptionStyleChange = (style: ExportOptions['captionStyle']) => {
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
  
  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--nav-height))]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent"></div>
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
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/dashboard')}
            className="mr-2"
          />
          <div>
            <h1 className="text-2xl font-bold">{currentProject.title}</h1>
            <p className="text-foreground-muted">Editor</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<Settings size={16} />}
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? 'Hide Settings' : 'Settings'}
          </Button>
          
          <Button
            variant="primary"
            icon={<Download size={16} />}
            onClick={handleExport}
            disabled={isExporting || !selectedClip}
          >
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
            duration={currentProject.duration}
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
            duration={currentProject.duration}
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
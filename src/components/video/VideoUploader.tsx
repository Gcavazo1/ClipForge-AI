import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Film, 
  AlertCircle, 
  Check, 
  Clock, 
  Zap, 
  Wifi, 
  WifiOff, 
  Loader2,
  Pause,
  Play,
  X,
  RefreshCw,
  FileVideo
} from 'lucide-react';
import Button from '../ui/button';
import Progress from '../ui/progress';
import Loader from '../ui/loader';
import { VideoProject } from '../../types';
import { VideoProjectService } from '../../lib/database';
import { AIServiceIntegration } from '../../lib/ai/ai-service-integration';
import { useAppStore } from '../../store';
import { logger } from '../../lib/logger';
import { useAuth } from '../../hooks/useAuth';
import { VideoMetadataExtractor } from '../../lib/video-upload/VideoMetadataExtractor';
import { videoUploadService } from '../../lib/video-upload/VideoUploadService';
import { uploadCache } from '../../lib/video-upload/UploadCache';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';

interface VideoUploaderProps {
  onUploadComplete: (project: VideoProject) => void;
}

interface ProcessingStage {
  name: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  icon: React.ReactNode;
  error?: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onUploadComplete }) => {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [currentProject, setCurrentProject] = useState<VideoProject | null>(null);
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '', variant: 'default' as const });
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  
  const user = useAppStore((state) => state.user);
  const isUploading = useAppStore((state) => state.isUploading);
  const isTranscribing = useAppStore((state) => state.isTranscribing);
  const setUploadState = useAppStore((state) => state.setUploadState);
  const setTranscribeState = useAppStore((state) => state.setTranscribeState);
  
  const { initialized, loading } = useAuth();
  
  // Reference for progress update interval
  const progressIntervalRef = useRef<number | null>(null);
  
  // Initialize processing stages
  const initializeProcessingStages = (): ProcessingStage[] => [
    {
      name: 'Uploading video',
      progress: 0,
      status: 'pending',
      icon: <Upload size={16} />
    },
    {
      name: 'Processing video',
      progress: 0,
      status: 'pending',
      icon: <Film size={16} />
    },
    {
      name: 'Extracting audio',
      progress: 0,
      status: 'pending',
      icon: <Zap size={16} />
    },
    {
      name: 'AI transcription',
      progress: 0,
      status: 'pending',
      icon: <Clock size={16} />
    },
    {
      name: 'Analyzing highlights',
      progress: 0,
      status: 'pending',
      icon: <Zap size={16} />
    }
  ];

  // Check AI service status on component mount
  useEffect(() => {
    const checkServiceStatus = async () => {
      try {
        const status = AIServiceIntegration.getServiceStatus();
        setServiceStatus(status);
        
        if (!status.available) {
          setError('AI services are not available. Please check your API key configuration.');
        }
      } catch (error) {
        logger.error('Failed to check AI service status', error as Error);
        setError('Unable to verify AI service status. Please try again.');
      }
    };

    checkServiceStatus();
    
    // Load recent uploads from cache
    const cachedUploads = uploadCache.getAllUploads();
    if (cachedUploads.length > 0) {
      setRecentUploads(cachedUploads.slice(0, 5));
    }
    
    return () => {
      // Clean up progress interval if exists
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);
  
  // Update progress for active upload task
  useEffect(() => {
    if (uploadTaskId) {
      // Set up interval to check progress
      progressIntervalRef.current = window.setInterval(() => {
        const task = videoUploadService.getUploadTask(uploadTaskId);
        if (task) {
          // Update progress in UI
          updateStage(0, task.progress);
          setUploadState(true, task.progress);
          
          // Check if task completed or failed
          if (task.status === 'completed' && task.result) {
            // Clear interval
            if (progressIntervalRef.current) {
              window.clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            
            // Update UI
            updateStage(0, 100, 'completed');
            updateStage(1, 100, 'completed');
            setUploadState(false);
            
            // Cache the upload
            uploadCache.addUpload(
              task.result.id,
              task.file.name,
              task.file.size,
              task.file.type,
              task.result.videoUrl,
              task.result.thumbnailUrl
            );
            
            // Refresh recent uploads
            setRecentUploads(uploadCache.getAllUploads().slice(0, 5));
            
            // Call completion callback
            onUploadComplete(task.result);
            
            // Show success toast
            setToastMessage({
              title: 'Upload Complete',
              description: 'Your video has been uploaded successfully.',
              variant: 'default'
            });
            setShowToast(true);
          } else if (task.status === 'error') {
            // Clear interval
            if (progressIntervalRef.current) {
              window.clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            
            // Update UI
            updateStage(0, 0, 'error', task.error);
            setUploadState(false);
            
            // Show error toast
            setToastMessage({
              title: 'Upload Failed',
              description: task.error || 'An unknown error occurred during upload.',
              variant: 'error'
            });
            setShowToast(true);
          }
        }
      }, 500);
      
      // Clean up interval on unmount
      return () => {
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      };
    }
  }, [uploadTaskId, onUploadComplete, setUploadState]);

  const updateStage = (stageIndex: number, progress: number, status?: ProcessingStage['status'], error?: string) => {
    setProcessingStages(prev => prev.map((stage, index) => 
      index === stageIndex 
        ? { 
            ...stage, 
            progress, 
            status: status || (progress === 100 ? 'completed' : 'active'),
            error 
          }
        : stage
    ));
  };

  const handleUpload = useCallback(async (file: File) => {
    // Check if auth is still initializing
    if (!initialized || loading) {
      setError('Please wait while we finish loading your profile...');
      return;
    }
    
    // Check if user is authenticated
    if (!user || !user.id) {
      setError('Please sign in to upload videos');
      return;
    }

    // Check AI service availability
    if (!serviceStatus?.available) {
      setError('AI services are not available. Please check your API key configuration and try again.');
      return;
    }

    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    setProcessingStages(initializeProcessingStages());
    
    // Validate file
    const validation = VideoMetadataExtractor.validateVideo(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Get processing estimate
    const estimate = AIServiceIntegration.estimateProcessing(file);
    setEstimatedTime(estimate.estimatedTime);

    try {
      // Create upload task
      const task = videoUploadService.createUploadTask(file, user.id, {
        title: file.name.replace(/\.[^/.]+$/, ''),
        generateThumbnail: true,
        thumbnailTimestamp: 1,
        quality: 'high'
      });
      
      // Store task ID for progress tracking
      setUploadTaskId(task.id);
      
      // Update UI state
      updateStage(0, 0, 'active');
      setUploadState(true, 0);
      
      // Set current project
      if (task.result) {
        setCurrentProject(task.result);
      }
      
      logger.info('Video upload started', { 
        taskId: task.id,
        fileName: file.name,
        fileSize: file.size
      });
      
      // Note: The actual upload processing happens in the VideoUploadService
      // and progress is tracked via the useEffect hook above
      
    } catch (error) {
      logger.error('Failed to start upload', error as Error);
      setError(error instanceof Error ? error.message : 'Failed to start upload');
      setUploadState(false);
      setTranscribeState(false);
    }
  }, [user, onUploadComplete, setUploadState, setTranscribeState, processingStages, currentProject, serviceStatus, initialized, loading]);
  
  const handleCancelUpload = useCallback(() => {
    if (uploadTaskId) {
      videoUploadService.cancelUploadTask(uploadTaskId);
      
      // Update UI
      setUploadState(false);
      setTranscribeState(false);
      
      // Show toast
      setToastMessage({
        title: 'Upload Cancelled',
        description: 'The upload has been cancelled.',
        variant: 'default'
      });
      setShowToast(true);
      
      // Reset state
      setUploadTaskId(null);
      setProcessingStages(initializeProcessingStages());
    }
  }, [uploadTaskId, setUploadState, setTranscribeState]);
  
  const handlePauseResumeUpload = useCallback(() => {
    if (!uploadTaskId) return;
    
    const task = videoUploadService.getUploadTask(uploadTaskId);
    if (!task) return;
    
    if (task.status === 'uploading') {
      if (task.uploader) {
        const status = task.uploader.getStatus();
        if (status.paused) {
          videoUploadService.resumeUploadTask(uploadTaskId);
        } else {
          videoUploadService.pauseUploadTask(uploadTaskId);
        }
      }
    }
  }, [uploadTaskId]);
  
  const handleUseRecentUpload = useCallback((upload: any) => {
    // Create a project from the cached upload
    const project: VideoProject = {
      id: upload.id,
      title: upload.fileName.replace(/\.[^/.]+$/, ''),
      videoUrl: upload.url,
      thumbnailUrl: upload.thumbnailUrl,
      duration: upload.metadata?.duration || 0,
      createdAt: new Date(upload.uploadedAt).toISOString(),
      updatedAt: new Date(upload.uploadedAt).toISOString(),
      status: 'ready',
      progress: 100,
      size: upload.fileSize
    };
    
    // Call completion callback
    onUploadComplete(project);
    
    // Show success toast
    setToastMessage({
      title: 'Video Selected',
      description: 'Using previously uploaded video.',
      variant: 'default'
    });
    setShowToast(true);
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0]);
      }
    },
    multiple: false,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/webm': ['.webm'],
      'video/x-matroska': ['.mkv'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    disabled: isUploading || isTranscribing || !initialized || loading
  });
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (isUploading || isTranscribing) {
    const activeStage = processingStages.find(s => s.status === 'active');
    const completedStages = processingStages.filter(s => s.status === 'completed').length;
    const errorStages = processingStages.filter(s => s.status === 'error').length;
    const totalProgress = (completedStages / processingStages.length) * 100;
    
    // Get upload task for pause/resume button
    const task = uploadTaskId ? videoUploadService.getUploadTask(uploadTaskId) : null;
    const isPaused = task?.uploader?.getStatus().paused;

    return (
      <div className="border rounded-lg p-6 bg-background-light">
        <div className="flex items-center mb-4">
          <Film size={24} className="text-primary-500 mr-3" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium truncate" title={fileName || ''}>
              {fileName}
            </h3>
            {fileSize && (
              <p className="text-xs text-foreground-muted">{formatFileSize(fileSize)}</p>
            )}
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{Math.round(totalProgress)}%</div>
            {estimatedTime && (
              <div className="text-xs text-foreground-muted">
                ~{formatTime(estimatedTime)} remaining
              </div>
            )}
          </div>
        </div>
        
        <Progress 
          value={totalProgress}
          variant={errorStages > 0 ? "error" : "primary"}
          size="md"
          className="mb-4"
        />

        {/* Processing stages */}
        <div className="space-y-3">
          {processingStages.map((stage, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                stage.status === 'completed' ? 'bg-success-500 text-white' :
                stage.status === 'active' ? 'bg-primary-500 text-white' :
                stage.status === 'error' ? 'bg-error-500 text-white' :
                'bg-background-lighter text-foreground-muted'
              }`}>
                {stage.status === 'completed' ? (
                  <Check size={12} />
                ) : stage.status === 'error' ? (
                  <AlertCircle size={12} />
                ) : (
                  stage.icon
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    stage.status === 'active' ? 'text-foreground font-medium' :
                    stage.status === 'completed' ? 'text-success-500' :
                    stage.status === 'error' ? 'text-error-500' :
                    'text-foreground-muted'
                  }`}>
                    {stage.name}
                  </span>
                  {stage.status === 'active' && (
                    <span className="text-xs text-foreground-muted">
                      {stage.progress}%
                    </span>
                  )}
                </div>
                
                {stage.status === 'active' && (
                  <Progress 
                    value={stage.progress}
                    size="sm"
                    className="mt-1"
                  />
                )}
                
                {stage.status === 'error' && stage.error && (
                  <p className="text-xs text-error-500 mt-1">{stage.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {activeStage && (
          <p className="text-sm text-foreground-muted mt-4 text-center">
            {activeStage.name}...
          </p>
        )}

        {/* Control buttons */}
        <div className="flex justify-center mt-4 space-x-3">
          {task?.status === 'uploading' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseResumeUpload}
              icon={isPaused ? <Play size={16} /> : <Pause size={16} />}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelUpload}
            icon={<X size={16} />}
          >
            Cancel
          </Button>
        </div>

        {errorStages > 0 && (
          <div className="mt-4 p-3 bg-warning-900/20 text-warning-500 rounded-md text-sm">
            <p className="font-medium">Some AI features may not be available</p>
            <p>Your video has been uploaded successfully, but some AI processing failed. You can still edit and export your video manually.</p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Auth Status Indicator */}
      {(!initialized || loading) && (
        <div className="flex items-center justify-center p-2 rounded-md text-sm bg-warning-900/20 text-warning-500">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading your profile... Please wait
        </div>
      )}
      
      {/* AI Service Status Indicator */}
      {serviceStatus && (
        <div className={`flex items-center justify-center p-2 rounded-md text-sm ${
          serviceStatus.available 
            ? 'bg-success-900/20 text-success-500' 
            : 'bg-error-900/20 text-error-500'
        }`}>
          {serviceStatus.available ? (
            <>
              <Wifi size={16} className="mr-2" />
              AI services ready ({serviceStatus.providers.length} providers available)
            </>
          ) : (
            <>
              <WifiOff size={16} className="mr-2" />
              AI services unavailable - check API keys
            </>
          )}
        </div>
      )}

      {/* Recent uploads */}
      {recentUploads.length > 0 && (
        <div className="bg-background-light rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Recent Uploads</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recentUploads.map((upload) => (
              <div 
                key={upload.id}
                className="bg-background p-2 rounded-lg cursor-pointer hover:bg-background-lighter transition-colors"
                onClick={() => handleUseRecentUpload(upload)}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-background-lighter rounded flex items-center justify-center mr-2">
                    <FileVideo size={18} className="text-primary-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-medium truncate" title={upload.fileName}>
                      {upload.fileName}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      {formatFileSize(upload.fileSize)} • {new Date(upload.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload dropzone */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          !initialized || loading ? 'opacity-50 cursor-not-allowed' :
          isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-gray-600 hover:border-primary-400 hover:bg-background-lighter'
        }`}
      >
        <input {...getInputProps()} />
        <Film size={40} className={`mx-auto mb-4 ${isDragActive ? 'text-primary-400' : 'text-foreground-muted'}`} />
        <p className="text-lg font-medium mb-2">Upload your video</p>
        <p className="text-sm text-foreground-muted mb-4">
          {!initialized || loading 
            ? 'Please wait while we finish loading your profile...'
            : 'Drag & drop a video file here, or click to select'}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          icon={<Upload size={16} />}
          disabled={!initialized || loading}
        >
          Select Video
        </Button>
        <p className="text-xs text-foreground-muted mt-4">
          Supported formats: MP4, MOV, AVI, WebM, MKV (max 500MB)
        </p>
        
        {error && (
          <div className="mt-4 text-sm text-error-500 flex items-center justify-center">
            <AlertCircle size={16} className="mr-1" />
            {error}
          </div>
        )}
      </div>
      
      {/* Toast notifications */}
      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast} variant={toastMessage.variant}>
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default VideoUploader;
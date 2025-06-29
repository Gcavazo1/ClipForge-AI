import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Film, AlertCircle, Check, Clock, Zap, Wifi, WifiOff } from 'lucide-react';
import Button from '../ui/button';
import Progress from '../ui/progress';
import { VideoProject } from '../../types';
import { generateId } from '../../lib/utils';
import { VideoProjectService } from '../../lib/database';
import { VideoProcessingService } from '../../lib/video-processing';
import { AIServiceIntegration } from '../../lib/ai/ai-service-integration';
import { useAppStore } from '../../store';
import { logger } from '../../lib/logger';

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
  
  const user = useAppStore((state) => state.user);
  const isUploading = useAppStore((state) => state.isUploading);
  const isTranscribing = useAppStore((state) => state.isTranscribing);
  const setUploadState = useAppStore((state) => state.setUploadState);
  const setTranscribeState = useAppStore((state) => state.setTranscribeState);
  
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
  React.useEffect(() => {
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
  }, []);

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
    if (!user) {
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
    const validation = VideoProcessingService.validateVideo(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Get processing estimate
    const estimate = AIServiceIntegration.estimateProcessing(file);
    setEstimatedTime(estimate.estimatedTime);

    try {
      // Stage 1: Create project record
      const projectId = generateId();
      const newProject: VideoProject = {
        id: projectId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        videoUrl: '',
        thumbnailUrl: '',
        duration: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'uploading',
        progress: 0,
        size: file.size,
      };

      const createdProject = await VideoProjectService.create(newProject);
      setCurrentProject(createdProject);
      
      // Stage 2: Upload and process video
      updateStage(0, 0, 'active');
      setUploadState(true, 0);
      
      const processingResult = await VideoProcessingService.processVideo(
        file,
        user.id,
        {
          generateThumbnail: true,
          thumbnailTimestamp: 1,
          quality: 'high'
        },
        (progress) => {
          updateStage(0, progress);
          setUploadState(true, progress);
        }
      );

      updateStage(0, 100, 'completed');
      updateStage(1, 100, 'completed');
      setUploadState(false);

      // Update project with video details
      const updatedProject = await VideoProjectService.update(createdProject.id, {
        ...createdProject,
        videoUrl: processingResult.processedVideoUrl,
        thumbnailUrl: processingResult.thumbnailUrl,
        duration: processingResult.duration,
        status: 'processing',
        progress: 40
      });

      setCurrentProject(updatedProject);

      // Stage 3: AI Processing Pipeline with comprehensive error handling
      updateStage(2, 0, 'active');
      setTranscribeState(true, 0);

      try {
        const aiResult = await AIServiceIntegration.processVideoWithAI(
          {
            projectId: updatedProject.id,
            videoFile: file,
            userId: user.id,
            options: {
              transcriptionProvider: 'openai',
              analysisProvider: 'groq',
              language: 'en',
              generateHighlights: true,
              autoCreateClips: true
            }
          },
          (stage, progress) => {
            // Map AI stages to our processing stages
            switch (stage) {
              case 'Extracting audio':
                updateStage(2, progress);
                break;
              case 'Transcribing audio':
              case 'Processing transcription':
                updateStage(3, progress);
                break;
              case 'Analyzing highlights':
              case 'Creating highlight clips':
                updateStage(4, progress);
                break;
            }
            setTranscribeState(true, progress);
          }
        );

        // Complete all stages
        updateStage(2, 100, 'completed');
        updateStage(3, 100, 'completed');
        updateStage(4, 100, 'completed');
        setTranscribeState(false);

        // Final project update
        const finalProject = await VideoProjectService.updateStatus(
          updatedProject.id,
          'ready',
          100
        );

        logger.info('Video upload and processing completed', {
          projectId: updatedProject.id,
          transcriptSegments: aiResult.transcript.length,
          highlights: aiResult.highlights.length,
          processingTime: aiResult.processingTime
        });

        // Call completion callback
        onUploadComplete({
          ...updatedProject,
          status: 'ready',
          progress: 100
        });

      } catch (aiError) {
        logger.error('AI processing failed', aiError as Error);
        
        // Update the failed stage with specific error
        const activeStageIndex = processingStages.findIndex(s => s.status === 'active');
        if (activeStageIndex >= 0) {
          updateStage(activeStageIndex, 0, 'error', (aiError as Error).message);
        }
        
        // Update project status but don't fail completely - user can still use basic features
        await VideoProjectService.updateStatus(
          updatedProject.id,
          'ready', // Mark as ready even without AI features
          100,
          `AI processing failed: ${(aiError as Error).message}`
        );

        // Still call completion callback so user can access the video
        onUploadComplete({
          ...updatedProject,
          status: 'ready',
          progress: 100,
          error: `AI processing failed: ${(aiError as Error).message}`
        });
      }

      // Reset states
      setUploadState(false);
      setTranscribeState(false);
      
    } catch (uploadError) {
      logger.error('Video upload and processing failed', uploadError as Error);
      
      // Update failed stage
      const activeStageIndex = processingStages.findIndex(s => s.status === 'active');
      if (activeStageIndex >= 0) {
        updateStage(activeStageIndex, 0, 'error', (uploadError as Error).message);
      }
      
      setError(`Upload failed: ${(uploadError as Error).message}`);
      setUploadState(false);
      setTranscribeState(false);

      // Update project status if it was created
      if (currentProject) {
        await VideoProjectService.updateStatus(
          currentProject.id,
          'error',
          0,
          uploadError instanceof Error ? uploadError.message : 'Unknown error'
        );
      }
    }
  }, [user, onUploadComplete, setUploadState, setTranscribeState, processingStages, currentProject, serviceStatus]);
  
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
      'video/mov': ['.mov'],
      'video/avi': ['.avi'],
      'video/webm': ['.webm'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    disabled: isUploading || isTranscribing
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

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-gray-600 hover:border-primary-400 hover:bg-background-lighter'
        }`}
      >
        <input {...getInputProps()} />
        <Film size={40} className={`mx-auto mb-4 ${isDragActive ? 'text-primary-400' : 'text-foreground-muted'}`} />
        <p className="text-lg font-medium mb-2">Upload your video</p>
        <p className="text-sm text-foreground-muted mb-4">
          Drag & drop a video file here, or click to select
        </p>
        <Button variant="outline" size="sm" icon={<Upload size={16} />}>
          Select Video
        </Button>
        <p className="text-xs text-foreground-muted mt-4">
          Supported formats: MP4, MOV, AVI, WebM (max 500MB)
        </p>
        
        {error && (
          <div className="mt-4 text-sm text-error-500 flex items-center justify-center">
            <AlertCircle size={16} className="mr-1" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
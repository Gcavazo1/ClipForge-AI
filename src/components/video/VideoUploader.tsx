import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Film, AlertCircle, Check } from 'lucide-react';
import Button from '../ui/button';
import Progress from '../ui/progress';
import { VideoProject } from '../../types';
import { generateId } from '../../lib/utils';
import { StorageService } from '../../lib/storage';
import { VideoProjectService } from '../../lib/database';
import { useAppStore } from '../../store';
import { logger } from '../../lib/logger';

interface VideoUploaderProps {
  onUploadComplete: (project: VideoProject) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onUploadComplete }) => {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  
  const user = useAppStore((state) => state.user);
  const setUploadState = useAppStore((state) => state.setUploadState);
  const setTranscribeState = useAppStore((state) => state.setTranscribeState);
  const isUploading = useAppStore((state) => state.isUploading);
  const uploadProgress = useAppStore((state) => state.uploadProgress);
  const isTranscribing = useAppStore((state) => state.isTranscribing);
  const transcribeProgress = useAppStore((state) => state.transcribeProgress);
  
  const handleUpload = useCallback(async (file: File) => {
    if (!user) {
      setError('Please sign in to upload videos');
      return;
    }

    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    
    // Validate file
    const validation = StorageService.validateFile(file, 'video');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }
    
    try {
      // Start upload
      setUploadState(true, 0);
      logger.info('Starting video upload', { fileName: file.name, size: file.size });
      
      // Create project record first
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

      // Create project in database
      const createdProject = await VideoProjectService.create(newProject);
      
      // Upload video file
      const uploadResult = await StorageService.uploadVideo(
        file, 
        user.id, 
        (progress) => setUploadState(true, progress)
      );
      
      // Generate and upload thumbnail
      let thumbnailUrl = '';
      try {
        const thumbnailFile = await StorageService.generateThumbnail(file, 1);
        const thumbnailResult = await StorageService.uploadThumbnail(thumbnailFile, user.id);
        thumbnailUrl = thumbnailResult.publicUrl || thumbnailResult.url;
      } catch (thumbnailError) {
        logger.warn('Thumbnail generation failed', thumbnailError as Error);
        // Continue without thumbnail
      }
      
      // Get video duration
      const duration = await getVideoDuration(file);
      
      // Update project with file details
      const updatedProject = await VideoProjectService.update(createdProject.id, {
        ...createdProject,
        videoUrl: uploadResult.url,
        thumbnailUrl,
        duration,
        status: 'processing',
        progress: 100
      });
      
      setUploadState(false);
      
      // Start transcription process
      setTranscribeState(true, 0);
      
      // Update project status to transcribing
      await VideoProjectService.updateStatus(updatedProject.id, 'transcribing', 0);
      
      // Simulate transcription progress (replace with real implementation)
      const transcribeInterval = setInterval(() => {
        setTranscribeState(true, (prev) => {
          const newProgress = prev + Math.random() * 10;
          if (newProgress >= 100) {
            clearInterval(transcribeInterval);
            return 100;
          }
          return newProgress;
        });
      }, 500);
      
      // Complete transcription (mock)
      setTimeout(async () => {
        clearInterval(transcribeInterval);
        setTranscribeState(false, 100);
        
        // Update project status to ready
        const finalProject = await VideoProjectService.updateStatus(
          updatedProject.id, 
          'ready', 
          100
        );
        
        // Reset states
        setUploadState(false);
        setTranscribeState(false);
        
        // Call completion callback
        onUploadComplete({
          ...updatedProject,
          status: 'ready',
          progress: 100
        });
        
        logger.info('Video upload and processing completed', { projectId: updatedProject.id });
      }, 3000);
      
    } catch (uploadError) {
      logger.error('Video upload failed', uploadError as Error);
      setError('Upload failed. Please try again.');
      setUploadState(false);
      setTranscribeState(false);
    }
  }, [user, onUploadComplete, setUploadState, setTranscribeState]);
  
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
  });
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Helper function to get video duration
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve(video.duration);
      };
      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };
      video.src = URL.createObjectURL(file);
    });
  };
  
  if (isUploading || isTranscribing) {
    return (
      <div className="border rounded-lg p-6">
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
          {uploadProgress === 100 && transcribeProgress === 100 ? (
            <Check size={20} className="text-success-500 ml-2" />
          ) : (
            <span className="text-sm font-medium ml-2">
              {isTranscribing ? transcribeProgress.toFixed(0) : uploadProgress.toFixed(0)}%
            </span>
          )}
        </div>
        
        <Progress 
          value={isTranscribing ? transcribeProgress : uploadProgress}
          variant={uploadProgress === 100 ? 'success' : 'primary'}
          size="md"
        />
        
        <p className="text-sm text-foreground-muted mt-4 text-center">
          {isTranscribing ? 'Processing video and generating transcript...' : 'Uploading video...'}
        </p>
      </div>
    );
  }
  
  return (
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
  );
};

export default VideoUploader;
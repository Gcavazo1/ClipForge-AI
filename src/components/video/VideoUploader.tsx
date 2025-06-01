import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Film, AlertCircle, Check } from 'lucide-react';
import Button from '../ui/button';
import Progress from '../ui/progress';
import { VideoProject } from '../../types';
import { generateId } from '../../lib/utils';
import { transcribeAndHighlight } from '../../lib/transcribeAndHighlight';
import { useAppStore } from '../../store';

interface VideoUploaderProps {
  onUploadComplete: (project: VideoProject) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onUploadComplete }) => {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  
  const setUploadState = useAppStore((state) => state.setUploadState);
  const setTranscribeState = useAppStore((state) => state.setTranscribeState);
  const setTranscript = useAppStore((state) => state.setTranscript);
  const isUploading = useAppStore((state) => state.isUploading);
  const uploadProgress = useAppStore((state) => state.uploadProgress);
  const isTranscribing = useAppStore((state) => state.isTranscribing);
  const transcribeProgress = useAppStore((state) => state.transcribeProgress);
  
  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/mov'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an MP4 or MOV file.');
      return;
    }
    
    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 500MB.');
      return;
    }
    
    // Start upload
    setUploadState(true, 0);
    
    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setUploadState(true, (prev) => {
        const newProgress = prev + Math.random() * 10;
        if (newProgress >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return newProgress;
      });
    }, 300);
    
    // Create object URL for local playback
    const videoUrl = URL.createObjectURL(file);
    
    // Create a new project
    const newProject: VideoProject = {
      id: generateId(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      videoUrl,
      thumbnailUrl: 'https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg',
      duration: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'processing',
    };
    
    // Simulate upload completion
    setTimeout(async () => {
      clearInterval(uploadInterval);
      setUploadState(true, 100);
      
      // Load video to get duration
      const video = document.createElement('video');
      video.src = videoUrl;
      
      video.onloadedmetadata = async () => {
        newProject.duration = video.duration;
        
        // Start transcription
        setTranscribeState(true, 0);
        
        try {
          // Simulate transcription progress
          const transcribeInterval = setInterval(() => {
            setTranscribeState(true, (prev) => {
              const newProgress = prev + Math.random() * 5;
              if (newProgress >= 100) {
                clearInterval(transcribeInterval);
                return 100;
              }
              return newProgress;
            });
          }, 200);
          
          // Get transcript using the correct function
          const { transcript } = await transcribeAndHighlight(file);
          setTranscript(transcript);
          
          clearInterval(transcribeInterval);
          setTranscribeState(false, 100);
          
          // Complete project creation
          newProject.status = 'ready';
          onUploadComplete(newProject);
          
          // Reset states
          setUploadState(false);
          setTranscribeState(false);
        } catch (error) {
          setError('Error processing video. Please try again.');
          setUploadState(false);
          setTranscribeState(false);
        }
      };
      
      video.onerror = () => {
        setError('Error processing video. Please try again.');
        setUploadState(false);
        setTranscribeState(false);
      };
    }, 3000);
  }, [onUploadComplete, setTranscript, setTranscribeState, setUploadState]);
  
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
    },
    maxSize: 500 * 1024 * 1024,
  });
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
              {isTranscribing ? transcribeProgress : uploadProgress}%
            </span>
          )}
        </div>
        
        <Progress 
          value={isTranscribing ? transcribeProgress : uploadProgress}
          variant={uploadProgress === 100 ? 'success' : 'primary'}
          size="md"
        />
        
        <p className="text-sm text-foreground-muted mt-4 text-center">
          {isTranscribing ? 'Transcribing video...' : 'Uploading video...'}
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
        Supported formats: MP4, MOV (max 500MB)
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
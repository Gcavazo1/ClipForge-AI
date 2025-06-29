import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Film, 
  Filter, 
  SortDesc, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import Button from '../components/ui/button';
import VideoUploader from '../components/video/VideoUploader';
import UploadProgressPanel from '../components/video/UploadProgressPanel';
import RecentUploadsPanel from '../components/video/RecentUploadsPanel';
import { useAppStore } from '../store';
import { VideoProject } from '../types';
import { videoUploadService } from '../lib/video-upload/VideoUploadService';
import { videoProcessingQueue } from '../lib/video-upload/VideoProcessingQueue';
import { uploadCache, CachedUpload } from '../lib/video-upload/UploadCache';

const UploadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [showUploader, setShowUploader] = useState(false);
  const [activeUploads, setActiveUploads] = useState<number>(0);
  const [activeProcessing, setActiveProcessing] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  const user = useAppStore((state) => state.user);
  const addProject = useAppStore((state) => state.addProject);
  
  // Check for active uploads/processing
  useEffect(() => {
    const checkActive = () => {
      if (!user) return;
      
      // Check upload tasks
      const uploads = videoUploadService.getUserUploadTasks(user.id);
      const activeUploads = uploads.filter(task => 
        task.status === 'uploading' || task.status === 'pending'
      ).length;
      
      // Check processing tasks
      const processing = videoProcessingQueue.getTasksForUser(user.id);
      const activeProcessing = processing.filter(task =>
        task.status === 'processing' || task.status === 'pending'
      ).length;
      
      setActiveUploads(activeUploads);
      setActiveProcessing(activeProcessing);
    };
    
    // Initial check
    checkActive();
    
    // Set up interval
    const interval = setInterval(checkActive, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user, refreshKey]);
  
  const handleUploadComplete = (project: VideoProject) => {
    addProject(project);
    setShowUploader(false);
    
    // Force refresh of active tasks
    setRefreshKey(prev => prev + 1);
    
    // Navigate to editor
    navigate(`/editor/${project.id}`);
  };
  
  const handleSelectRecentUpload = (upload: CachedUpload) => {
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
    
    // Add to projects
    addProject(project);
    
    // Navigate to editor
    navigate(`/editor/${project.id}`);
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold title-font">Video Uploads</h1>
          <p className="text-foreground-muted">Manage your video uploads and processing</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey(prev => prev + 1)}
            icon={<RefreshCw size={16} />}
          >
            Refresh
          </Button>
          
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setShowUploader(true)}
          >
            Upload Video
          </Button>
        </div>
      </div>
      
      {/* Active uploads/processing */}
      {(activeUploads > 0 || activeProcessing > 0) && (
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <Clock size={18} className="text-primary-500 mr-2" />
            <h2 className="text-lg font-medium">Active Tasks</h2>
          </div>
          
          {user && <UploadProgressPanel userId={user.id} />}
        </div>
      )}
      
      {/* Upload form */}
      {showUploader ? (
        <div className="bg-background-light rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Upload New Video</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUploader(false)}
              icon={<X size={16} />}
            >
              Cancel
            </Button>
          </div>
          
          <VideoUploader onUploadComplete={handleUploadComplete} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Upload stats */}
          <div className="bg-background-light rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Upload size={20} className="text-primary-500 mr-2" />
              <h2 className="text-lg font-medium">Upload Statistics</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background p-4 rounded-lg">
                <div className="text-sm text-foreground-muted mb-1">Active Uploads</div>
                <div className="text-2xl font-bold">{activeUploads}</div>
              </div>
              
              <div className="bg-background p-4 rounded-lg">
                <div className="text-sm text-foreground-muted mb-1">Processing</div>
                <div className="text-2xl font-bold">{activeProcessing}</div>
              </div>
              
              <div className="bg-background p-4 rounded-lg">
                <div className="text-sm text-foreground-muted mb-1">Recent Uploads</div>
                <div className="text-2xl font-bold">{uploadCache.getAllUploads().length}</div>
              </div>
              
              <div className="bg-background p-4 rounded-lg">
                <div className="text-sm text-foreground-muted mb-1">Storage Used</div>
                <div className="text-2xl font-bold">
                  {(user?.usage?.storageUsed || 0) / (1024 * 1024 * 1024) < 1 
                    ? `${((user?.usage?.storageUsed || 0) / (1024 * 1024)).toFixed(0)} MB`
                    : `${((user?.usage?.storageUsed || 0) / (1024 * 1024 * 1024)).toFixed(1)} GB`}
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setShowUploader(true)}
                icon={<Upload size={16} />}
              >
                Upload New Video
              </Button>
            </div>
          </div>
          
          {/* Recent uploads */}
          <RecentUploadsPanel onSelectUpload={handleSelectRecentUpload} />
        </div>
      )}
      
      {/* Upload tips */}
      <div className="bg-background-light rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Upload Tips</h2>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="bg-primary-900/20 p-2 rounded-full mr-3 mt-1">
              <CheckCircle size={18} className="text-primary-500" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Supported Formats</h3>
              <p className="text-sm text-foreground-muted">
                Upload videos in MP4, MOV, AVI, WebM, or MKV format for best results. MP4 is recommended for fastest processing.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-primary-900/20 p-2 rounded-full mr-3 mt-1">
              <CheckCircle size={18} className="text-primary-500" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Chunked Uploads</h3>
              <p className="text-sm text-foreground-muted">
                Large files are automatically split into smaller chunks for reliable uploads. You can pause and resume uploads at any time.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-primary-900/20 p-2 rounded-full mr-3 mt-1">
              <CheckCircle size={18} className="text-primary-500" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Processing Time</h3>
              <p className="text-sm text-foreground-muted">
                After upload, videos are processed for transcription and highlight detection. This typically takes 2-5 minutes depending on video length.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-warning-900/20 p-2 rounded-full mr-3 mt-1">
              <AlertCircle size={18} className="text-warning-500" />
            </div>
            <div>
              <h3 className="font-medium mb-1">File Size Limits</h3>
              <p className="text-sm text-foreground-muted">
                Maximum file size is 500MB. For optimal performance, we recommend videos under 100MB and less than 30 minutes in length.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadsPage;
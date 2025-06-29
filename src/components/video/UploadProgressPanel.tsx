import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Check, 
  AlertCircle, 
  Clock, 
  Pause, 
  Play, 
  X, 
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Button from '../ui/button';
import Progress from '../ui/progress';
import { videoUploadService } from '../../lib/video-upload/VideoUploadService';
import { videoProcessingQueue } from '../../lib/video-upload/VideoProcessingQueue';
import { formatTime } from '../../lib/utils';

interface UploadProgressPanelProps {
  userId: string;
  onCancel?: () => void;
}

const UploadProgressPanel: React.FC<UploadProgressPanelProps> = ({ 
  userId,
  onCancel
}) => {
  const [uploadTasks, setUploadTasks] = useState<any[]>([]);
  const [processingTasks, setProcessingTasks] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(true);
  
  // Refresh tasks periodically
  useEffect(() => {
    const fetchTasks = () => {
      // Get upload tasks
      const uploads = videoUploadService.getUserUploadTasks(userId);
      setUploadTasks(uploads.filter(task => 
        task.status === 'uploading' || task.status === 'pending'
      ));
      
      // Get processing tasks
      const processing = videoProcessingQueue.getTasksForUser(userId);
      setProcessingTasks(processing);
    };
    
    // Initial fetch
    fetchTasks();
    
    // Set up interval
    const interval = setInterval(fetchTasks, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [userId]);
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Handle pause/resume
  const handlePauseResume = (taskId: string) => {
    const task = videoUploadService.getUploadTask(taskId);
    if (!task) return;
    
    if (task.status === 'uploading') {
      if (task.uploader) {
        const status = task.uploader.getStatus();
        if (status.paused) {
          videoUploadService.resumeUploadTask(taskId);
        } else {
          videoUploadService.pauseUploadTask(taskId);
        }
      }
    }
  };
  
  // Handle cancel
  const handleCancel = (taskId: string) => {
    videoUploadService.cancelUploadTask(taskId);
    if (onCancel) onCancel();
  };
  
  // If no active tasks, don't render anything
  if (uploadTasks.length === 0 && processingTasks.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-background-light rounded-lg overflow-hidden border border-background-lighter">
      {/* Header */}
      <div 
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <Film size={18} className="text-primary-500 mr-2" />
          <h3 className="font-medium text-sm">
            {uploadTasks.length > 0 ? 'Uploading' : 'Processing'} 
            {' '}({uploadTasks.length + processingTasks.length})
          </h3>
        </div>
        <button className="text-foreground-muted hover:text-foreground">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      {/* Content */}
      {expanded && (
        <div className="p-3 border-t border-background-lighter space-y-3">
          {/* Upload tasks */}
          {uploadTasks.map(task => {
            const isPaused = task.uploader?.getStatus().paused;
            
            return (
              <div key={task.id} className="bg-background rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-background-lighter rounded flex items-center justify-center mr-2">
                      <Film size={16} className="text-primary-400" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-medium truncate" title={task.file.name}>
                        {task.file.name}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {formatFileSize(task.file.size)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {Math.round(task.progress)}%
                  </div>
                </div>
                
                <Progress 
                  value={task.progress}
                  size="sm"
                  className="mb-2"
                />
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePauseResume(task.id)}
                    icon={isPaused ? <Play size={14} /> : <Pause size={14} />}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(task.id)}
                    icon={<X size={14} />}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          })}
          
          {/* Processing tasks */}
          {processingTasks.map(task => (
            <div key={task.id} className="bg-background rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded flex items-center justify-center mr-2 ${
                    task.status === 'completed' ? 'bg-success-900/20 text-success-500' :
                    task.status === 'error' ? 'bg-error-900/20 text-error-500' :
                    'bg-primary-900/20 text-primary-500'
                  }`}>
                    {task.status === 'completed' ? (
                      <Check size={16} />
                    ) : task.status === 'error' ? (
                      <AlertCircle size={16} />
                    ) : (
                      <RefreshCw size={16} className="animate-spin" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {task.status === 'processing' ? 'Processing' : 
                       task.status === 'completed' ? 'Completed' : 
                       task.status === 'error' ? 'Failed' : 'Pending'}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      Project ID: {task.projectId.substring(0, 8)}...
                    </div>
                  </div>
                </div>
                
                {task.status === 'processing' && (
                  <div className="text-xs text-foreground-muted flex items-center">
                    <Clock size={12} className="mr-1" />
                    {task.startedAt ? formatTime((Date.now() - task.startedAt) / 1000) : '0:00'}
                  </div>
                )}
              </div>
              
              {task.status === 'processing' && (
                <Progress 
                  value={task.progress}
                  size="sm"
                />
              )}
              
              {task.status === 'error' && task.error && (
                <div className="text-xs text-error-500 mt-1">
                  {task.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadProgressPanel;
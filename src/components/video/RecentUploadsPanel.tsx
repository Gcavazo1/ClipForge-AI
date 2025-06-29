import React, { useState, useEffect } from 'react';
import { FileVideo, Clock, Trash2, ExternalLink } from 'lucide-react';
import { uploadCache, CachedUpload } from '../../lib/video-upload/UploadCache';
import { formatDate } from '../../lib/utils';
import Button from '../ui/button';

interface RecentUploadsPanelProps {
  onSelectUpload: (upload: CachedUpload) => void;
}

const RecentUploadsPanel: React.FC<RecentUploadsPanelProps> = ({ onSelectUpload }) => {
  const [uploads, setUploads] = useState<CachedUpload[]>([]);
  
  // Load uploads from cache
  useEffect(() => {
    const loadUploads = () => {
      const cachedUploads = uploadCache.getAllUploads();
      setUploads(cachedUploads);
    };
    
    // Initial load
    loadUploads();
    
    // Set up interval to refresh
    const interval = setInterval(loadUploads, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Handle delete
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    uploadCache.removeUpload(id);
    setUploads(uploadCache.getAllUploads());
  };
  
  // If no uploads, don't render
  if (uploads.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-background-light rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Recent Uploads</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            uploadCache.clearCache();
            setUploads([]);
          }}
        >
          Clear All
        </Button>
      </div>
      
      <div className="space-y-2">
        {uploads.map((upload) => (
          <div 
            key={upload.id}
            className="bg-background p-3 rounded-lg cursor-pointer hover:bg-background-lighter transition-colors flex items-center justify-between"
            onClick={() => onSelectUpload(upload)}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-background-lighter rounded flex items-center justify-center mr-3">
                <FileVideo size={18} className="text-primary-400" />
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-medium truncate" title={upload.fileName}>
                  {upload.fileName}
                </div>
                <div className="text-xs text-foreground-muted flex items-center">
                  <span className="mr-2">{formatFileSize(upload.fileSize)}</span>
                  <Clock size={12} className="mr-1" />
                  <span>{formatDate(upload.uploadedAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                className="p-1.5 text-foreground-muted hover:text-error-500 transition-colors"
                onClick={(e) => handleDelete(e, upload.id)}
                title="Remove from recent uploads"
              >
                <Trash2 size={16} />
              </button>
              <a
                href={upload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-foreground-muted hover:text-primary-500 transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentUploadsPanel;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileVideo, Clock, Trash2, ExternalLink } from 'lucide-react';
import { VideoProject } from '../../types';
import { formatDate, formatLongTime, isValidUrl } from '../../lib/utils';
import Button from '../ui/button';
import Progress from '../ui/progress';
import { logger } from '../../lib/logger';

interface ProjectCardProps {
  project: VideoProject;
  onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
  const navigate = useNavigate();
  
  const handleEdit = () => {
    if (!project.id) {
      logger.error('Cannot navigate to editor: Project ID is missing', { project });
      return;
    }
    
    logger.info('Navigating to editor', { projectId: project.id });
    navigate(`/editor/${project.id}`);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project.id);
  };
  
  // Format the creation date - handle invalid dates gracefully
  const formattedDate = project.createdAt ? 
    formatDate(new Date(project.createdAt).getTime()) : 
    'Unknown date';
  
  return (
    <div 
      className="group bg-background-light rounded-lg overflow-hidden transition-all hover:shadow-lg hover:translate-y-[-2px]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-background-lighter">
        {project.thumbnailUrl && isValidUrl(project.thumbnailUrl) ? (
          <img 
            src={project.thumbnailUrl} 
            alt={project.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // If thumbnail fails to load, show placeholder
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center');
              const icon = document.createElement('div');
              icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-foreground-muted"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18" /><path d="M3 7.5h4" /><path d="M3 12h18" /><path d="M3 16.5h4" /><path d="M17 3v18" /><path d="M17 7.5h4" /><path d="M17 16.5h4" /></svg>';
              (e.target as HTMLImageElement).parentElement?.appendChild(icon);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background-lighter">
            <FileVideo size={40} className="text-foreground-muted" />
          </div>
        )}
        
        {/* Duration badge */}
        {project.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs py-1 px-2 rounded">
            <Clock size={12} className="inline mr-1" />
            {formatLongTime(project.duration)}
          </div>
        )}
        
        {/* Play overlay */}
        <div 
          className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          onClick={handleEdit}
        >
          <Button 
            variant="primary" 
            size="icon"
            className="rounded-full bg-primary-500/90 hover:bg-primary-500"
            onClick={handleEdit}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between">
          <h3 className="font-medium line-clamp-1" title={project.title}>
            {project.title}
          </h3>
          <button 
            aria-label="More options"
            className="p-1 rounded-full hover:bg-background-lighter text-foreground-muted hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>
        </div>
        
        <div className="text-xs text-foreground-muted mt-1">
          Created on {formattedDate}
        </div>
        
        {project.status === 'processing' && (
          <div className="mt-3">
            <Progress 
              value={project.progress || 0}
              size="sm"
              variant="primary"
              showValue
              valueLabel="Processing"
            />
          </div>
        )}
        
        {project.status === 'error' && (
          <div className="mt-3 text-xs text-error-500">
            {project.error || 'Error processing video'}
          </div>
        )}
        
        <div className="flex mt-4 gap-2">
          <Button 
            variant="primary" 
            size="sm"
            className="flex-1"
            onClick={handleEdit}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDelete}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
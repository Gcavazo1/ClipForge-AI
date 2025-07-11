import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Edit2, MoreVertical, Trash2 } from 'lucide-react';
import { VideoProject } from '../../types';
import { formatLongTime } from '../../lib/utils';
import Button from '../ui/button';
import Progress from '../ui/progress';

interface ProjectCardProps {
  project: VideoProject;
  onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
  const navigate = useNavigate();
  
  const handleEdit = () => {
    navigate(`/editor/${project.id}`);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project.id);
  };
  
  // Format the creation date
  const formattedDate = new Date(project.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  return (
    <div 
      className="group bg-background-light rounded-lg overflow-hidden transition-all hover:shadow-lg hover:translate-y-[-2px]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-background-lighter">
        {project.thumbnailUrl ? (
          <img 
            src={project.thumbnailUrl} 
            alt={project.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background-lighter">
            <Film size={40} className="text-foreground-muted" />
          </div>
        )}
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs py-1 px-2 rounded">
          <Clock size={12} className="inline mr-1" />
          {formatLongTime(project.duration)}
        </div>
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button 
            variant="primary" 
            size="icon"
            className="rounded-full bg-primary-500/90 hover:bg-primary-500"
            icon={<Play size={18} />}
            onClick={handleEdit}
          />
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
            <MoreVertical size={16} />
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
            icon={<Edit2 size={14} />}
          >
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDelete}
            icon={<Trash2 size={14} />}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

// Import the Film component as it was not defined earlier
const Film = (props: { size: number; className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </svg>
  );
};

export default ProjectCard;
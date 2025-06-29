import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, Search, SortDesc } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/button';
import MagicText from '../components/ui/magic-text';
import ProjectCard from '../components/dashboard/ProjectCard';
import { useAppStore } from '../store';
import { mockProjects } from '../lib/mockData';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const projects = useAppStore((state) => state.projects);
  const addProject = useAppStore((state) => state.addProject);
  const removeProject = useAppStore((state) => state.removeProject);
  
  // Load mock projects if no projects exist
  useEffect(() => {
    if (projects.length === 0) {
      // Add mock projects to the store
      mockProjects.forEach(project => {
        addProject(project);
      });
    }
  }, [projects.length, addProject]);
  
  const handleCreateNew = () => {
    navigate('/');
  };
  
  const handleDelete = (id: string) => {
    // In a real app, you might want to show a confirmation dialog
    removeProject(id);
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Your <MagicText>Creative Projects</MagicText>
          </h1>
          <p className="text-foreground-muted">Manage your video projects and clips</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search projects..."
              className="pl-9 pr-4 py-2 bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 w-full md:w-60"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            icon={<SortDesc size={16} />}
          >
            Sort
          </Button>
          
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={handleCreateNew}
          >
            New Project
          </Button>
        </div>
      </div>
      
      {projects.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ProjectCard 
                project={project} 
                onDelete={handleDelete}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <Video size={48} className="mx-auto mb-4 text-foreground-muted" />
          <h2 className="text-xl font-semibold mb-2">
            No <MagicText>projects</MagicText> yet
          </h2>
          <p className="text-foreground-muted mb-6">
            Upload your first video to get started with AI-powered clip creation
          </p>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={handleCreateNew}
          >
            Create Project
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
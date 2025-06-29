import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Video, Wand2, Upload, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import VideoUploader from '../components/video/VideoUploader';
import Button from '../components/ui/button';
import MagicText from '../components/ui/magic-text';
import { useAppStore } from '../store';
import { VideoProject } from '../types';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const addProject = useAppStore((state) => state.addProject);
  const [showUploader, setShowUploader] = useState(false);
  
  const handleUploadComplete = (project: VideoProject) => {
    addProject(project);
    navigate(`/editor/${project.id}`);
  };
  
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };
  
  const featureItems = [
    { 
      icon: <Upload />,
      title: "Upload Your Video",
      description: "Upload videos in MP4 or MOV format up to 500MB in size."
    },
    { 
      icon: <Wand2 />,
      title: "AI Transcription",
      description: "Our AI automatically transcribes your video with timestamps."
    },
    { 
      icon: <Zap />,
      title: "Smart Clip Detection",
      description: "Identifies the most engaging 15-60 second moments in your video."
    },
    { 
      icon: <Scissors />,
      title: "Edit & Export",
      description: "Fine-tune clips and export with professional-looking captions."
    }
  ];
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="py-10 md:py-16">
        <motion.div 
          className="text-center max-w-3xl mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block bg-primary-900/30 p-2 rounded-lg mb-6">
            <Scissors size={28} className="text-primary-400" />
          </div>
          
          <MagicText 
            as="h1" 
            className="text-4xl md:text-5xl font-bold mb-6"
            starCount={4}
          >
            Turn Long Videos Into Engaging Clips with AI
          </MagicText>
          
          <p className="text-lg text-foreground-muted mb-8 max-w-2xl mx-auto">
            ClipForge AI automatically finds the most engaging moments in your videos,
            creates perfect captions, and helps you share them on social media.
          </p>
          
          {!showUploader ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => setShowUploader(true)}
                icon={<Upload size={18} />}
              >
                Upload a Video
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/dashboard')}
              >
                View Dashboard
              </Button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto">
              <VideoUploader onUploadComplete={handleUploadComplete} />
              <div className="mt-4">
                <button 
                  className="text-sm text-foreground-muted hover:text-foreground"
                  onClick={() => setShowUploader(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </section>
      
      {/* Features Section */}
      <section className="py-12 md:py-20 bg-background-light clip-path-slant">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <MagicText 
              as="h2" 
              className="text-2xl md:text-3xl font-bold"
              starCount={3}
            >
              How ClipForge AI Works
            </MagicText>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featureItems.map((item, i) => (
              <motion.div
                key={i}
                className="bg-background p-6 rounded-lg"
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
              >
                <div className="w-12 h-12 bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-400 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-foreground-muted text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Demo Video Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <motion.div 
              className="md:w-1/2"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <MagicText 
                as="h2" 
                className="text-2xl md:text-3xl font-bold mb-6"
                starCount={2}
              >
                Find the Perfect Moments in Your Content
              </MagicText>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary-500 mt-0.5 shrink-0" />
                  <p>Save hours of editing time with automatic clip detection</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary-500 mt-0.5 shrink-0" />
                  <p>Generate accurate captions synchronized with your video</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary-500 mt-0.5 shrink-0" />
                  <p>Export in formats optimized for social media platforms</p>
                </div>
              </div>
              <Button 
                onClick={() => setShowUploader(true)} 
                className="w-full sm:w-auto"
                icon={<Video size={18} />}
              >
                Try With Your Video
              </Button>
            </motion.div>
            
            <motion.div 
              className="md:w-1/2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-xl">
                <img 
                  src="https://images.pexels.com/photos/3379244/pexels-photo-3379244.jpeg" 
                  alt="Video editing interface"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-primary-900/20 rounded-lg mx-4 mb-12">
        <div className="max-w-4xl mx-auto text-center px-4">
          <MagicText 
            as="h2" 
            className="text-2xl md:text-3xl font-bold mb-6"
            starCount={3}
          >
            Ready to Create Engaging Video Clips?
          </MagicText>
          
          <p className="text-lg text-foreground-muted mb-8 max-w-2xl mx-auto">
            Upload your first video and see how ClipForge AI can transform your content strategy.
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowUploader(true)}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
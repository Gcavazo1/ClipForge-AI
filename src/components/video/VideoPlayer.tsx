import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatTime } from '../../lib/utils';
import { TranscriptSegment } from '../../types';
import { logger } from '../../lib/logger';

interface VideoPlayerProps {
  src: string;
  isPlaying: boolean;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onPlayPause: (isPlaying: boolean) => void;
  captions?: TranscriptSegment[];
  showCaptions?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  isPlaying,
  currentTime,
  onTimeUpdate,
  onPlayPause,
  captions = [],
  showCaptions = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<TranscriptSegment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if src is valid
  useEffect(() => {
    if (!src) {
      setError('No video source provided');
      setIsLoading(false);
    } else {
      setError(null);
      setIsLoading(true);
    }
  }, [src]);
  
  // Sync playback state with props
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch((err) => {
          logger.error('Video playback error', err);
          onPlayPause(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, onPlayPause]);
  
  // Sync current time with props
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);
  
  // Find current caption
  useEffect(() => {
    if (captions.length && showCaptions) {
      const activeCaption = captions.find(
        caption => currentTime >= caption.startTime && currentTime <= caption.endTime
      ) || null;
      
      setCurrentCaption(activeCaption);
    } else {
      setCurrentCaption(null);
    }
  }, [currentTime, captions, showCaptions]);
  
  // Handle metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };
  
  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };
  
  // Handle progress click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;
      
      videoRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    const videoContainer = videoRef.current?.parentElement;
    
    if (!videoContainer) return;
    
    if (!isFullscreen) {
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Skip forward/backward
  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
      videoRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };
  
  // Handle video error
  const handleVideoError = () => {
    setIsLoading(false);
    setError('Failed to load video. Please check the URL and try again.');
    logger.error('Video loading error', { src });
  };
  
  return (
    <div className="relative bg-black rounded-lg overflow-hidden group">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-lighter z-10">
          <div className="animate-spin h-12 w-12 border-4 border-primary-500 rounded-full border-t-transparent"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-lighter z-10">
          <div className="text-center p-4">
            <div className="text-error-500 mb-2">Error Loading Video</div>
            <div className="text-sm text-foreground-muted">{error}</div>
          </div>
        </div>
      )}
      
      {src && (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-auto max-h-[70vh] object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleMetadataLoaded}
          onEnded={() => onPlayPause(false)}
          onError={handleVideoError}
          playsInline
        />
      )}
      
      {/* Caption overlay */}
      {currentCaption && showCaptions && (
        <div className="absolute bottom-16 left-0 right-0 text-center px-4">
          <div className="inline-block bg-black bg-opacity-70 text-white p-2 rounded-md text-sm max-w-md mx-auto">
            {currentCaption.text}
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress bar */}
        <div 
          ref={progressRef}
          className="h-1.5 bg-gray-700 rounded-full mb-3 cursor-pointer relative"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-primary-500 rounded-full"
            style={{ width: `${(currentTime / Math.max(duration, 0.1)) * 100}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              className="p-1.5 rounded-full hover:bg-white/20 transition"
              onClick={() => onPlayPause(!isPlaying)}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            
            <button
              className="p-1.5 rounded-full hover:bg-white/20 transition"
              onClick={() => skipTime(-10)}
            >
              <ChevronLeft size={18} />
            </button>
            
            <button
              className="p-1.5 rounded-full hover:bg-white/20 transition"
              onClick={() => skipTime(10)}
            >
              <ChevronRight size={18} />
            </button>
            
            <div className="flex items-center space-x-2 ml-1">
              <button
                className="p-1.5 rounded-full hover:bg-white/20 transition"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-700 rounded-full accent-primary-500"
              />
            </div>
            
            <div className="text-xs ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          <button
            className="p-1.5 rounded-full hover:bg-white/20 transition"
            onClick={toggleFullscreen}
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
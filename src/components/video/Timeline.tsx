import React, { useRef, useEffect, useState } from 'react';
import { ClipSegment, TranscriptSegment } from '../../types';
import { formatTime } from '../../lib/utils';

interface TimelineProps {
  duration: number;
  currentTime: number;
  clipSegments: ClipSegment[];
  transcript: TranscriptSegment[];
  onTimeChange: (time: number) => void;
  onClipSelect: (clipId: string | null) => void;
  selectedClipId: string | null;
}

const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  clipSegments,
  transcript,
  onTimeChange,
  onClipSelect,
  selectedClipId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [timeMarkers, setTimeMarkers] = useState<number[]>([]);
  
  // Calculate time markers
  useEffect(() => {
    if (duration > 0) {
      let interval = 30;
      
      if (duration > 3600) {
        interval = 300;
      } else if (duration > 1800) {
        interval = 180;
      } else if (duration > 600) {
        interval = 60;
      }
      
      const markers = [];
      for (let time = 0; time <= duration; time += interval) {
        markers.push(time);
      }
      
      if (markers[markers.length - 1] !== duration) {
        markers.push(duration);
      }
      
      setTimeMarkers(markers);
    }
  }, [duration]);
  
  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const clickPos = e.clientX - rect.left;
      const percentage = clickPos / rect.width;
      const newTime = percentage * duration;
      
      onTimeChange(Math.max(0, Math.min(newTime, duration)));
    }
  };
  
  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleTimelineClick(e);
  };
  
  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const movePos = e.clientX - rect.left;
        const percentage = movePos / rect.width;
        const newTime = percentage * duration;
        
        onTimeChange(Math.max(0, Math.min(newTime, duration)));
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, onTimeChange]);
  
  // Get percentage position
  const getPositionPercentage = (time: number) => {
    return (time / duration) * 100;
  };
  
  // Handle clip click
  const handleClipClick = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onClipSelect(clipId === selectedClipId ? null : clipId);
  };
  
  return (
    <div className="bg-background-light rounded-lg p-4" ref={containerRef}>
      <div className="mb-2 flex justify-between text-xs text-foreground-muted">
        {timeMarkers.map((time, index) => (
          <div 
            key={index} 
            className="relative"
            style={{ 
              left: `${getPositionPercentage(time)}%`,
              marginLeft: index === 0 ? 0 : '-10px'
            }}
          >
            {formatTime(time)}
          </div>
        ))}
      </div>
      
      <div 
        ref={trackRef}
        className="timeline-track"
        onMouseDown={handleMouseDown}
        onClick={handleTimelineClick}
      >
        {/* Clip segments */}
        {clipSegments.map((clip) => (
          <div
            key={clip.id}
            className={`timeline-segment ${clip.isHighlight ? 'highlight' : ''} ${clip.id === selectedClipId ? 'selected' : ''}`}
            style={{
              left: `${getPositionPercentage(clip.startTime)}%`,
              width: `${getPositionPercentage(clip.endTime - clip.startTime)}%`,
              backgroundColor: clip.isHighlight ? `rgba(139, 92, 246, ${clip.confidence})` : 'rgba(75, 85, 99, 0.5)'
            }}
            onClick={(e) => handleClipClick(clip.id, e)}
            title={clip.title || `Clip ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium overflow-hidden p-1">
              {clip.title || `${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`}
            </div>
          </div>
        ))}
        
        {/* Current time indicator */}
        <div 
          className="timeline-scrubber"
          style={{ left: `${getPositionPercentage(currentTime)}%` }}
        />
      </div>
      
      <div className="mt-4 text-sm">
        <div className="font-medium mb-1">Transcript</div>
        <div className="max-h-32 overflow-y-auto space-y-1 p-1">
          {transcript.map((segment) => (
            <div 
              key={segment.id}
              className={`p-1.5 rounded text-sm cursor-pointer transition-colors ${
                currentTime >= segment.startTime && currentTime <= segment.endTime
                  ? 'bg-primary-900/50 text-primary-300'
                  : 'hover:bg-background-lighter'
              }`}
              onClick={() => onTimeChange(segment.startTime)}
            >
              <div className="text-xs text-foreground-muted mb-0.5">
                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
              </div>
              {segment.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
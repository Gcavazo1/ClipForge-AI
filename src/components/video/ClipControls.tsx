import React, { useState, useEffect } from 'react';
import { Save, Trash2, Play, Clock, Scissors } from 'lucide-react';
import Button from '../ui/button';
import { ClipSegment } from '../../types';
import { formatTime } from '../../lib/utils';

interface ClipControlsProps {
  selectedClip: ClipSegment | null;
  onSaveClip: (clip: ClipSegment) => void;
  onDeleteClip: (clipId: string) => void;
  onPlayClip: (startTime: number) => void;
  duration: number;
  onExport?: () => void;
}

const ClipControls: React.FC<ClipControlsProps> = ({
  selectedClip,
  onSaveClip,
  onDeleteClip,
  onPlayClip,
  duration,
  onExport
}) => {
  const [clipTitle, setClipTitle] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  
  useEffect(() => {
    if (selectedClip) {
      setClipTitle(selectedClip.title || '');
      setStartTime(selectedClip.startTime);
      setEndTime(selectedClip.endTime);
    } else {
      setClipTitle('');
      setStartTime(0);
      setEndTime(0);
    }
  }, [selectedClip]);
  
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = parseFloat(e.target.value);
    setStartTime(newStartTime);
    
    if (newStartTime >= endTime) {
      setEndTime(Math.min(newStartTime + 5, duration));
    }
  };
  
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndTime = parseFloat(e.target.value);
    setEndTime(newEndTime);
    
    if (newEndTime <= startTime) {
      setStartTime(Math.max(newEndTime - 5, 0));
    }
  };
  
  const handleSave = () => {
    if (selectedClip) {
      onSaveClip({
        ...selectedClip,
        title: clipTitle,
        startTime,
        endTime,
      });
    }
  };
  
  const handleDelete = () => {
    if (selectedClip) {
      onDeleteClip(selectedClip.id);
    }
  };
  
  const handlePlay = () => {
    onPlayClip(startTime);
  };
  
  if (!selectedClip) {
    return (
      <div className="bg-background-light rounded-lg p-6 text-center">
        <div className="flex flex-col items-center justify-center py-6 text-foreground-muted">
          <Scissors size={32} className="mb-3 text-primary-500" />
          <p className="text-sm">Select a clip from the timeline to edit</p>
          <p className="text-xs mt-2">or create a new clip by selecting a portion of the timeline</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-background-light rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Edit Clip</h3>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handlePlay}
            icon={<Play size={16} />}
          >
            Play
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={handleDelete}
            icon={<Trash2 size={16} />}
          >
            Delete
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Clip Title</label>
          <input
            type="text"
            value={clipTitle}
            onChange={(e) => setClipTitle(e.target.value)}
            placeholder="Enter clip title"
            className="w-full px-3 py-2 bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              <Clock size={14} className="inline mr-1" />
              Start Time
            </label>
            <div className="flex items-center">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={startTime}
                onChange={handleStartTimeChange}
                className="w-full h-1 bg-gray-700 rounded-full accent-primary-500 mr-2"
              />
              <span className="text-sm font-mono">{formatTime(startTime)}</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              <Clock size={14} className="inline mr-1" />
              End Time
            </label>
            <div className="flex items-center">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={endTime}
                onChange={handleEndTimeChange}
                className="w-full h-1 bg-gray-700 rounded-full accent-primary-500 mr-2"
              />
              <span className="text-sm font-mono">{formatTime(endTime)}</span>
            </div>
          </div>
        </div>
        
        <div className="text-sm">
          <span className="text-foreground-muted">Duration: </span>
          <span className="font-medium">{formatTime(endTime - startTime)}</span>
          <span className="text-xs ml-2 text-foreground-muted">
            {endTime - startTime < 15 && 'Clips shorter than 15s may not perform well on social media'}
            {endTime - startTime > 60 && 'Clips longer than 60s may be too long for some platforms'}
          </span>
        </div>
        
        <div className="pt-2 space-y-2">
          <Button
            variant="primary"
            onClick={handleSave}
            icon={<Save size={16} />}
            className="w-full"
          >
            Save Changes
          </Button>
          
          {onExport && (
            <Button
              variant="outline"
              onClick={onExport}
              className="w-full"
            >
              Export Clip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClipControls;
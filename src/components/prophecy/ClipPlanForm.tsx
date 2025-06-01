import React, { useState } from 'react';
import { Clock, Hash, FileText, AlertCircle } from 'lucide-react';
import Button from '../ui/button';

interface ClipPlanFormProps {
  onSubmit: (plan: {
    topic: string;
    duration: number;
    hashtags: string[];
    notes: string;
  }) => void;
  isLoading?: boolean;
}

const ClipPlanForm: React.FC<ClipPlanFormProps> = ({ onSubmit, isLoading }) => {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(30);
  const [hashtags, setHashtags] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topic) {
      setError('Please enter a topic for your clip');
      return;
    }

    const hashtagArray = hashtags
      .split(' ')
      .map(tag => tag.startsWith('#') ? tag.slice(1) : tag)
      .filter(Boolean);

    onSubmit({
      topic,
      duration,
      hashtags: hashtagArray,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-background-light rounded-lg p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Clip Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter the main topic or theme"
          className="w-full px-3 py-2 bg-background border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          <Clock size={16} className="inline mr-2" />
          Target Duration
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={15}
            max={60}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="flex-1 h-1 bg-background rounded-full accent-primary-500"
          />
          <span className="text-sm font-mono w-16">{duration}s</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          <Hash size={16} className="inline mr-2" />
          Hashtags
        </label>
        <input
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="Enter hashtags separated by spaces"
          className="w-full px-3 py-2 bg-background border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          <FileText size={16} className="inline mr-2" />
          Additional Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional details about your clip"
          rows={3}
          className="w-full px-3 py-2 bg-background border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {error && (
        <div className="flex items-center text-error-500 text-sm">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Generating Prophecy...' : 'Get Prophecy'}
      </Button>
    </form>
  );
};

export default ClipPlanForm;
import React, { useState } from 'react';
import { Share2, TrendingUp, AlertCircle, Check, ExternalLink } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import Button from '../ui/button';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';
import { VideoProject, ExportOptions } from '../../types';
import { generateMultiFormatExport } from '../../lib/generateMultiFormatExport';

interface Platform {
  id: string;
  name: string;
  icon: JSX.Element;
  constraints: {
    maxDuration: string;
    aspectRatio: string;
    maxFileSize: string;
    format: string;
  };
}

const platforms: Platform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <TrendingUp className="w-5 h-5" />,
    constraints: {
      maxDuration: '10 minutes',
      aspectRatio: '9:16',
      maxFileSize: '287MB',
      format: 'MP4 (H.264)',
    },
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    icon: <TrendingUp className="w-5 h-5" />,
    constraints: {
      maxDuration: '60 seconds',
      aspectRatio: '9:16',
      maxFileSize: '256MB',
      format: 'MP4 (H.264)',
    },
  },
  {
    id: 'instagram',
    name: 'Instagram Reels',
    icon: <TrendingUp className="w-5 h-5" />,
    constraints: {
      maxDuration: '90 seconds',
      aspectRatio: '9:16',
      maxFileSize: '4GB',
      format: 'MP4 (H.264)',
    },
  },
];

interface DistributionPanelProps {
  project: VideoProject;
  exportOptions: ExportOptions;
}

const DistributionPanel: React.FC<DistributionPanelProps> = ({
  project,
  exportOptions,
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleExport = async () => {
    if (selectedPlatforms.length === 0) {
      setToastMessage({
        title: 'No Platforms Selected',
        description: 'Please select at least one platform to export to.',
      });
      setShowToast(true);
      return;
    }

    setIsExporting(true);

    try {
      // Get the video file from the project URL
      const response = await fetch(project.videoUrl);
      const videoBlob = await response.blob();
      const videoFile = new File([videoBlob], 'source.mp4', { type: 'video/mp4' });

      // Generate exports for selected platforms
      const exports = await generateMultiFormatExport(videoFile, {
        includePlatforms: selectedPlatforms as any[],
        watermark: exportOptions.watermark,
        creatorHandle: exportOptions.creatorHandle,
        title: project.title,
      });

      // Simulate platform uploads
      for (const platform of selectedPlatforms) {
        await simulatePlatformUpload(platform, exports[platform as keyof typeof exports]);
      }

      setToastMessage({
        title: 'Export Complete',
        description: 'Your video has been exported and prepared for distribution.',
      });
    } catch (error) {
      console.error('Export failed:', error);
      setToastMessage({
        title: 'Export Failed',
        description: 'There was an error exporting your video. Please try again.',
      });
    } finally {
      setIsExporting(false);
      setShowToast(true);
    }
  };

  const simulatePlatformUpload = async (platform: string, file: File | undefined) => {
    if (!file) return;

    // Simulate OAuth flow
    const authWindow = window.open(
      `/auth/${platform}`,
      'Auth',
      'width=600,height=600'
    );

    return new Promise(resolve => {
      setTimeout(() => {
        authWindow?.close();
        resolve(true);
      }, 2000);
    });
  };

  return (
    <div className="bg-background-light rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Distribution</h2>
          <p className="text-sm text-foreground-muted">
            Export and share your clip across platforms
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={isExporting || selectedPlatforms.length === 0}
          icon={<Share2 size={16} />}
        >
          {isExporting ? 'Exporting...' : 'Export & Share'}
        </Button>
      </div>

      <Tabs.Root defaultValue="platforms" className="space-y-6">
        <Tabs.List className="flex space-x-2 border-b border-background-lighter">
          <Tabs.Trigger
            value="platforms"
            className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground data-[state=active]:text-primary-400 data-[state=active]:border-b-2 data-[state=active]:border-primary-400"
          >
            Platforms
          </Tabs.Trigger>
          <Tabs.Trigger
            value="history"
            className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground data-[state=active]:text-primary-400 data-[state=active]:border-b-2 data-[state=active]:border-primary-400"
          >
            History
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="platforms" className="space-y-4">
          {platforms.map(platform => (
            <div
              key={platform.id}
              className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                selectedPlatforms.includes(platform.id)
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-background-lighter hover:border-primary-400/50'
              }`}
              onClick={() => handlePlatformToggle(platform.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {platform.icon}
                  <h3 className="font-medium">{platform.name}</h3>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlatforms.includes(platform.id)
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-600'
                  }`}
                >
                  {selectedPlatforms.includes(platform.id) && (
                    <Check size={12} className="text-white" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-foreground-muted">
                <div>
                  <span className="block font-medium text-foreground">Max Duration</span>
                  {platform.constraints.maxDuration}
                </div>
                <div>
                  <span className="block font-medium text-foreground">Aspect Ratio</span>
                  {platform.constraints.aspectRatio}
                </div>
                <div>
                  <span className="block font-medium text-foreground">Max File Size</span>
                  {platform.constraints.maxFileSize}
                </div>
                <div>
                  <span className="block font-medium text-foreground">Format</span>
                  {platform.constraints.format}
                </div>
              </div>

              {platform.id === 'tiktok' && (
                <div className="mt-4 flex items-center text-sm text-warning-400">
                  <AlertCircle size={14} className="mr-2" />
                  TikTok API access coming soon
                </div>
              )}
            </div>
          ))}
        </Tabs.Content>

        <Tabs.Content value="history" className="space-y-4">
          <div className="space-y-4">
            {/* Mock history items */}
            <div className="flex items-center justify-between p-4 bg-background-lighter rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-12 bg-black rounded overflow-hidden">
                  <img
                    src="https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg"
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-medium">Project Highlights</h4>
                  <p className="text-sm text-foreground-muted">YouTube Shorts</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-success-400">Published</span>
                <ExternalLink size={16} className="text-foreground-muted" />
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default DistributionPanel;
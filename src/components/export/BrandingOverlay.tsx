import React, { useState } from 'react';
import { Upload, Trash2, Eye, EyeOff } from 'lucide-react';
import Button from '../ui/button';

interface BrandingOverlayProps {
  watermark?: string;
  logo?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showClipForgeBadge?: boolean;
  onUpdate: (settings: {
    watermark?: string;
    logo?: string;
    position?: string;
    showClipForgeBadge?: boolean;
  }) => void;
}

const BrandingOverlay: React.FC<BrandingOverlayProps> = ({
  watermark = '',
  logo = '',
  position = 'bottom-right',
  showClipForgeBadge = true,
  onUpdate,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePositionChange = (newPosition: string) => {
    onUpdate({ position: newPosition });
  };

  const handleWatermarkChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ watermark: event.target.value });
  };

  const handleBadgeToggle = () => {
    onUpdate({ showClipForgeBadge: !showClipForgeBadge });
  };

  const positionOptions = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
  ];

  return (
    <div className="bg-background-light rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Branding</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewVisible(!previewVisible)}
          icon={previewVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        >
          {previewVisible ? 'Hide Preview' : 'Show Preview'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Logo</label>
          <div className="flex items-center space-x-4">
            {logo ? (
              <div className="relative w-16 h-16 bg-background-lighter rounded-lg overflow-hidden">
                <img src={logo} alt="Brand logo" className="w-full h-full object-contain" />
                <button
                  onClick={() => onUpdate({ logo: '' })}
                  className="absolute top-1 right-1 p-1 bg-background/80 rounded-full hover:bg-background"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 bg-background-lighter rounded-lg flex items-center justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Upload size={24} className="text-foreground-muted" />
                </label>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm text-foreground-muted">
                Upload a transparent PNG logo (recommended size: 200x200px)
              </p>
            </div>
          </div>
        </div>

        {/* Logo Position */}
        <div>
          <label className="block text-sm font-medium mb-2">Position</label>
          <div className="grid grid-cols-2 gap-2">
            {positionOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handlePositionChange(option.value)}
                className={`p-2 text-sm rounded-md transition-colors ${
                  position === option.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-background-lighter text-foreground-muted hover:bg-background'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Watermark Text */}
        <div>
          <label className="block text-sm font-medium mb-2">Watermark Text</label>
          <input
            type="text"
            value={watermark}
            onChange={handleWatermarkChange}
            placeholder="@username"
            className="w-full px-3 py-2 bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-1 text-xs text-foreground-muted">
            This text will appear in the selected corner of your videos
          </p>
        </div>

        {/* ClipForge Badge Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Show "Made with ClipForge" Badge</h3>
            <p className="text-xs text-foreground-muted">
              Adds a subtle badge to help spread the word
            </p>
          </div>
          <button
            onClick={handleBadgeToggle}
            className={`w-11 h-6 rounded-full transition-colors ${
              showClipForgeBadge ? 'bg-primary-500' : 'bg-background-lighter'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                showClipForgeBadge ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Preview */}
        {previewVisible && (
          <div className="mt-6">
            <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
              <img
                src="https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg"
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {logo && (
                <div
                  className={`absolute ${
                    position === 'top-left'
                      ? 'top-4 left-4'
                      : position === 'top-right'
                      ? 'top-4 right-4'
                      : position === 'bottom-left'
                      ? 'bottom-4 left-4'
                      : 'bottom-4 right-4'
                  }`}
                >
                  <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
                </div>
              )}
              {watermark && (
                <div
                  className={`absolute ${
                    position === 'top-left'
                      ? 'top-4 left-4'
                      : position === 'top-right'
                      ? 'top-4 right-4'
                      : position === 'bottom-left'
                      ? 'bottom-4 left-4'
                      : 'bottom-4 right-4'
                  } text-white text-sm font-medium bg-black/50 px-2 py-1 rounded`}
                >
                  {watermark}
                </div>
              )}
              {showClipForgeBadge && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  Made with ClipForge
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandingOverlay;
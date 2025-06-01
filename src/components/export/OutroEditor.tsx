import React, { useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import Button from '../ui/button';

interface OutroEditorProps {
  onUpdate: (settings: {
    text: string;
    backgroundColor: string;
    ctaText: string;
    audioEnabled: boolean;
  }) => void;
  settings: {
    text: string;
    backgroundColor: string;
    ctaText: string;
    audioEnabled: boolean;
  };
}

const OutroEditor: React.FC<OutroEditorProps> = ({
  onUpdate,
  settings: initialSettings,
}) => {
  const [settings, setSettings] = useState(initialSettings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleChange = (key: keyof typeof settings, value: string | boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onUpdate(newSettings);
  };

  const presetBackgrounds = [
    '#000000',
    '#1e1e1e',
    '#18181b',
    '#1e293b',
    '#1e1b4b',
    '#3b0764',
  ];

  const presetTexts = [
    'Follow for more!',
    'Like & Subscribe',
    'New videos every week',
    'Check out my channel',
    'More content coming soon',
  ];

  const presetCTAs = [
    'Subscribe Now',
    'Follow Me',
    'Learn More',
    'Visit Channel',
    'Join Now',
  ];

  return (
    <div className="bg-background-light rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Outro Scene</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            icon={isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            icon={isPlaying ? <Pause size={16} /> : <Play size={16} />}
          >
            Preview
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Background Color */}
        <div>
          <label className="block text-sm font-medium mb-2">Background</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
            />
            <div className="flex-1 grid grid-cols-6 gap-2">
              {presetBackgrounds.map((color) => (
                <button
                  key={color}
                  onClick={() => handleChange('backgroundColor', color)}
                  className="w-8 h-8 rounded-md border border-background-lighter"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Outro Text */}
        <div>
          <label className="block text-sm font-medium mb-2">Outro Text</label>
          <input
            type="text"
            value={settings.text}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Enter outro text"
            className="w-full px-3 py-2 bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 mb-2"
          />
          <div className="flex flex-wrap gap-2">
            {presetTexts.map((text) => (
              <button
                key={text}
                onClick={() => handleChange('text', text)}
                className="px-3 py-1 text-sm bg-background-lighter rounded-full hover:bg-background"
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {/* CTA Button Text */}
        <div>
          <label className="block text-sm font-medium mb-2">Call-to-Action</label>
          <input
            type="text"
            value={settings.ctaText}
            onChange={(e) => handleChange('ctaText', e.target.value)}
            placeholder="Enter CTA text"
            className="w-full px-3 py-2 bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 mb-2"
          />
          <div className="flex flex-wrap gap-2">
            {presetCTAs.map((cta) => (
              <button
                key={cta}
                onClick={() => handleChange('ctaText', cta)}
                className="px-3 py-1 text-sm bg-background-lighter rounded-full hover:bg-background"
              >
                {cta}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Enable Outro Sound</h3>
            <p className="text-xs text-foreground-muted">
              Add a subtle audio sting to your outro
            </p>
          </div>
          <button
            onClick={() => handleChange('audioEnabled', !settings.audioEnabled)}
            className={`w-11 h-6 rounded-full transition-colors ${
              settings.audioEnabled ? 'bg-primary-500' : 'bg-background-lighter'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                settings.audioEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Preview */}
        <div className="mt-6">
          <div
            className="aspect-video rounded-lg overflow-hidden relative"
            style={{ backgroundColor: settings.backgroundColor }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <h3 className="text-2xl font-bold mb-4 text-center px-6">
                {settings.text}
              </h3>
              <button className="px-6 py-2 bg-primary-500 rounded-full font-medium hover:bg-primary-600 transition-colors">
                {settings.ctaText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutroEditor;
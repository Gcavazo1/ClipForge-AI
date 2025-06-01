import React from 'react';
import { Type, AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { CaptionStyle } from '../../types';

interface CaptionSettingsProps {
  style: CaptionStyle;
  onChange: (style: CaptionStyle) => void;
}

const CaptionSettings: React.FC<CaptionSettingsProps> = ({ style, onChange }) => {
  const handleChange = <K extends keyof CaptionStyle>(key: K, value: CaptionStyle[K]) => {
    onChange({
      ...style,
      [key]: value,
    });
  };
  
  const positions = [
    { value: 'top', label: 'Top', icon: <AlignCenter className="rotate-180\" size={16} /> },
    { value: 'middle', label: 'Middle', icon: <AlignCenter size={16} /> },
    { value: 'bottom', label: 'Bottom', icon: <AlignCenter className="rotate-0\" size={16} /> },
  ];
  
  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Courier', label: 'Courier' },
    { value: 'Impact', label: 'Impact' },
  ];
  
  return (
    <div className="bg-background-light rounded-lg p-4">
      <div className="flex items-center mb-4">
        <Type size={18} className="mr-2 text-primary-500" />
        <h3 className="text-lg font-medium">Caption Style</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Font</label>
          <select
            value={style.font}
            onChange={(e) => handleChange('font', e.target.value)}
            className="w-full px-3 py-2 bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Size</label>
          <div className="flex items-center">
            <input
              type="range"
              min={12}
              max={36}
              step={1}
              value={style.size}
              onChange={(e) => handleChange('size', parseInt(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-full accent-primary-500 mr-2"
            />
            <span className="text-sm font-mono w-8 text-right">{style.size}px</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Position</label>
          <div className="flex space-x-2">
            {positions.map((pos) => (
              <button
                key={pos.value}
                onClick={() => handleChange('position', pos.value as any)}
                className={`flex-1 flex items-center justify-center py-2 rounded-md transition-colors ${
                  style.position === pos.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-background-lighter text-foreground-muted hover:bg-background'
                }`}
                title={pos.label}
              >
                {pos.icon}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Text Color</label>
            <div className="flex">
              <input
                type="color"
                value={style.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={style.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="flex-1 px-3 py-2 bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 ml-2"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Background</label>
            <div className="flex">
              <input
                type="color"
                value={style.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={style.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                className="flex-1 px-3 py-2 bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 ml-2"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Background Opacity</label>
          <div className="flex items-center">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={style.opacity}
              onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-full accent-primary-500 mr-2"
            />
            <span className="text-sm font-mono w-12 text-right">{Math.round(style.opacity * 100)}%</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="outline"
            checked={style.outline}
            onChange={(e) => handleChange('outline', e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="outline" className="ml-2 block text-sm">
            Add text outline
          </label>
          {style.outline && (
            <input
              type="color"
              value={style.outlineColor}
              onChange={(e) => handleChange('outlineColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 ml-3"
            />
          )}
        </div>
      </div>
      
      <div className="mt-4 bg-black p-3 rounded">
        <div className="text-center font-medium mb-1 text-xs">Preview</div>
        <div 
          className="p-2 text-center rounded"
          style={{ 
            fontFamily: style.font,
            fontSize: `${style.size}px`,
            color: style.color,
            backgroundColor: `${style.backgroundColor}${Math.round(style.opacity * 255).toString(16).padStart(2, '0')}`,
            textShadow: style.outline ? `1px 1px 1px ${style.outlineColor}, -1px -1px 1px ${style.outlineColor}, 1px -1px 1px ${style.outlineColor}, -1px 1px 1px ${style.outlineColor}` : 'none'
          }}
        >
          Sample Caption Text
        </div>
      </div>
    </div>
  );
};

export default CaptionSettings;
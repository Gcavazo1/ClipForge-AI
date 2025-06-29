import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Info } from 'lucide-react';

interface FeatureImportanceProps {
  featureImportance: Record<string, number>;
  title?: string;
}

const FeatureImportancePanel: React.FC<FeatureImportanceProps> = ({
  featureImportance,
  title = 'Feature Importance'
}) => {
  // Format feature names for display
  const formatFeatureName = (name: string): string => {
    const parts = name.split('.');
    if (parts.length > 1) {
      // Convert camelCase to Title Case with spaces
      const featureName = parts[1]
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
      
      return featureName;
    }
    return name;
  };

  // Prepare data for chart
  const data = Object.entries(featureImportance)
    .map(([feature, importance]) => ({
      name: formatFeatureName(feature),
      value: importance * 100, // Convert to percentage
      category: feature.split('.')[0] // Get category (content, temporal, etc.)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Show top 8 features

  // Color mapping for feature categories
  const categoryColors: Record<string, string> = {
    content: '#8b5cf6', // primary
    temporal: '#22c55e', // success
    user: '#f59e0b', // warning
    platform: '#ef4444', // error
    default: '#a1a1aa' // foreground-muted
  };

  // Get color for a feature
  const getFeatureColor = (category: string): string => {
    return categoryColors[category] || categoryColors.default;
  };

  // Feature descriptions
  const featureDescriptions: Record<string, string> = {
    duration: 'Length of the video in seconds',
    hasMusic: 'Whether the video has background music',
    hasCaptions: 'Whether the video has captions',
    topicCategory: 'The main topic category of the content',
    sentimentScore: 'Emotional tone of the content (positive/negative)',
    contentComplexity: 'How complex or simple the content is',
    paceScore: 'Speed and rhythm of content delivery',
    thumbnailQuality: 'Visual appeal of the thumbnail',
    titleQuality: 'Effectiveness of the title',
    dayOfWeek: 'Day of the week when posted',
    hourOfDay: 'Hour of the day when posted',
    isWeekend: 'Whether posted on a weekend',
    isHoliday: 'Whether posted on a holiday',
    seasonality: 'Seasonal factors affecting engagement',
    followersCount: 'Number of account followers',
    engagementRate: 'Average engagement on previous content',
    postFrequency: 'How often new content is posted',
    platform: 'Social media platform',
    algorithmTrend: 'Current platform algorithm preferences'
  };

  return (
    <div className="bg-background-light rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4 title-font">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis 
              type="number" 
              stroke="#a1a1aa"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="#a1a1aa" 
              width={120}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Importance']}
              contentStyle={{ 
                backgroundColor: '#1e1e1e', 
                border: '1px solid #2a2a2a',
                borderRadius: '8px'
              }}
              labelFormatter={(label) => {
                const feature = data.find(d => d.name === label);
                const featureName = label.toLowerCase().replace(/\s/g, '');
                const description = featureDescriptions[featureName] || 'Feature importance';
                return (
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-foreground-muted mt-1">{description}</div>
                  </div>
                );
              }}
            />
            <Bar 
              dataKey="value" 
              name="Importance" 
              radius={[0, 4, 4, 0]}
              background={{ fill: '#2a2a2a' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getFeatureColor(entry.category)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {Object.entries(categoryColors).slice(0, 4).map(([category, color]) => (
          <div key={category} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-xs text-foreground-muted capitalize">{category}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-foreground-muted flex items-center justify-center">
        <Info size={14} className="mr-2" />
        <span>These factors have the greatest influence on your content performance</span>
      </div>
    </div>
  );
};

export default FeatureImportancePanel;
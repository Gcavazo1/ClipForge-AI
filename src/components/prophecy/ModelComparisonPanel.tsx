import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { ProphecyResult, ModelType } from '../../types';
import { formatNumber } from '../../lib/utils';

interface ModelComparisonPanelProps {
  modelPredictions: Record<ModelType, ProphecyResult>;
  selectedModel: ModelType;
  onSelectModel: (model: ModelType) => void;
}

const ModelComparisonPanel: React.FC<ModelComparisonPanelProps> = ({
  modelPredictions,
  selectedModel,
  onSelectModel
}) => {
  // Prepare data for comparison chart
  const viewsData = Object.entries(modelPredictions).map(([model, prediction]) => ({
    name: formatModelName(model as ModelType),
    views: prediction.predictedViews,
    confidence: prediction.confidence
  }));

  // Prepare data for radar chart
  const radarData = Object.entries(modelPredictions).map(([model, prediction]) => {
    const engagementRate = (prediction.predictedLikes + prediction.predictedComments) / 
                          Math.max(1, prediction.predictedViews) * 100;
    
    return {
      model: formatModelName(model as ModelType),
      views: normalizeForRadar(prediction.predictedViews, 'views'),
      likes: normalizeForRadar(prediction.predictedLikes, 'likes'),
      comments: normalizeForRadar(prediction.predictedComments, 'comments'),
      confidence: prediction.confidence,
      engagement: Math.min(100, engagementRate * 10) // Scale engagement rate for radar
    };
  });

  // Format model name for display
  function formatModelName(model: ModelType): string {
    switch (model) {
      case 'linear':
        return 'Linear';
      case 'randomForest':
        return 'Random Forest';
      case 'ensemble':
        return 'Ensemble';
      case 'xgboost':
        return 'XGBoost';
      default:
        return model;
    }
  }

  // Normalize values for radar chart (0-100 scale)
  function normalizeForRadar(value: number, metric: string): number {
    const maxValues = {
      views: Math.max(...Object.values(modelPredictions).map(p => p.predictedViews)),
      likes: Math.max(...Object.values(modelPredictions).map(p => p.predictedLikes)),
      comments: Math.max(...Object.values(modelPredictions).map(p => p.predictedComments))
    };
    
    return (value / maxValues[metric as keyof typeof maxValues]) * 100;
  }

  return (
    <div className="bg-background-light rounded-lg p-6">
      <h3 className="text-lg font-medium mb-6 title-font">Model Comparison</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Views Comparison Chart */}
        <div className="bg-background p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-4">Predicted Views by Model</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="name" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" tickFormatter={formatNumber} />
                <Tooltip 
                  formatter={(value: number) => [formatNumber(value), 'Views']}
                  contentStyle={{ 
                    backgroundColor: '#1e1e1e', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="views" 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => {
                    const modelIndex = viewsData.findIndex(item => item.name === data.name);
                    if (modelIndex >= 0) {
                      const modelType = Object.keys(modelPredictions)[modelIndex] as ModelType;
                      onSelectModel(modelType);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Radar Comparison Chart */}
        <div className="bg-background p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-4">Model Performance Comparison</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius={90} data={radarData}>
                <PolarGrid stroke="#2a2a2a" />
                <PolarAngleAxis dataKey="model" stroke="#a1a1aa" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#a1a1aa" />
                <Radar
                  name="Views"
                  dataKey="views"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Likes"
                  dataKey="likes"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Comments"
                  dataKey="comments"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                  contentStyle={{ 
                    backgroundColor: '#1e1e1e', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {Object.entries(modelPredictions).map(([model, prediction]) => {
          const modelType = model as ModelType;
          return (
            <div 
              key={model}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                selectedModel === modelType
                  ? 'bg-primary-500/20 border border-primary-500/50'
                  : 'bg-background hover:bg-background-lighter border border-transparent'
              }`}
              onClick={() => onSelectModel(modelType)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{formatModelName(modelType)}</h4>
                <div className="text-xs px-2 py-0.5 rounded-full bg-primary-900/30 text-primary-400">
                  {prediction.confidence}% confidence
                </div>
              </div>
              
              <div className="text-sm text-foreground-muted">
                {modelType === 'linear' && 'Fast predictions based on trends'}
                {modelType === 'randomForest' && 'Advanced predictions with feature analysis'}
                {modelType === 'ensemble' && 'Combined models for highest accuracy'}
                {modelType === 'xgboost' && 'Gradient boosting for complex patterns'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModelComparisonPanel;
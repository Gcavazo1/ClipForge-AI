import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Clock, 
  Calendar, 
  Hash, 
  TrendingUp, 
  Star, 
  MessageCircle,
  Info,
  Share2,
  BarChart4,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Button from '../ui/button';
import { ProphecyResult, ModelType } from '../../types';
import { formatNumber } from '../../lib/utils';
import ProphecyVisualizer from '../../lib/ml/ProphecyVisualizer';

interface ProphecyPanelProps {
  prophecy: ProphecyResult | null;
  isLoading: boolean;
  onRefresh: () => void;
  onChangeModel?: (model: ModelType) => void;
  selectedModel?: ModelType;
  availableModels?: ModelType[];
  showVisualization?: boolean;
  feedbackSummary?: any;
}

const ProphecyPanel: React.FC<ProphecyPanelProps> = ({ 
  prophecy, 
  isLoading, 
  onRefresh,
  onChangeModel,
  selectedModel = 'ensemble',
  availableModels = ['linear', 'randomForest', 'ensemble'],
  showVisualization = false,
  feedbackSummary
}) => {
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-background-light rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-primary-500"
          >
            <Sparkles size={32} />
          </motion.div>
        </div>
      </div>
    );
  }

  if (!prophecy) {
    return (
      <div className="bg-background-light rounded-lg p-6">
        <div className="text-center py-8">
          <Sparkles size={32} className="mx-auto mb-4 text-primary-500" />
          <h3 className="text-lg font-medium mb-2 title-font">No Prophecy Available</h3>
          <p className="text-sm text-foreground-muted mb-4">
            Generate a prophecy to see predictions for your content
          </p>
          <Button variant="primary" onClick={onRefresh} icon={<Sparkles size={16} />}>
            Generate Prophecy
          </Button>
        </div>
      </div>
    );
  }

  const modelOptions = [
    { value: 'linear', label: 'Linear Regression', description: 'Fast, simple predictions based on trends' },
    { value: 'randomForest', label: 'Random Forest', description: 'Advanced predictions with feature analysis' },
    { value: 'ensemble', label: 'Ensemble', description: 'Combined models for highest accuracy' }
  ];

  return (
    <div className="space-y-8">
      <div className="bg-background-light rounded-lg p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium title-font">Prophetic Insights</h3>
            <div className="flex items-center">
              <div className="w-full bg-background-lighter h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-primary-500 h-full rounded-full"
                  style={{ width: `${prophecy.confidence}%` }}
                ></div>
              </div>
              <span className="text-xs text-foreground-muted ml-2">
                {prophecy.confidence}% confidence
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onChangeModel && (
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => onChangeModel(e.target.value as ModelType)}
                  className="bg-background border border-background-lighter rounded-md py-1 pl-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {modelOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-foreground-muted" />
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              icon={<RefreshCw size={16} />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background p-4 rounded-lg">
            <div className="flex items-center text-primary-500 mb-2">
              <TrendingUp size={18} className="mr-2" />
              <span className="text-sm font-medium">Predicted Views</span>
            </div>
            <div className="text-2xl font-bold title-font">
              {formatNumber(prophecy.predictedViews)}
            </div>
          </div>
          
          <div className="bg-background p-4 rounded-lg">
            <div className="flex items-center text-primary-500 mb-2">
              <Star size={18} className="mr-2" />
              <span className="text-sm font-medium">Predicted Likes</span>
            </div>
            <div className="text-2xl font-bold title-font">
              {formatNumber(prophecy.predictedLikes)}
            </div>
          </div>
          
          <div className="bg-background p-4 rounded-lg">
            <div className="flex items-center text-primary-500 mb-2">
              <MessageCircle size={18} className="mr-2" />
              <span className="text-sm font-medium">Predicted Comments</span>
            </div>
            <div className="text-2xl font-bold title-font">
              {formatNumber(prophecy.predictedComments)}
            </div>
          </div>
          
          <div className="bg-background p-4 rounded-lg">
            <div className="flex items-center text-primary-500 mb-2">
              <Share2 size={18} className="mr-2" />
              <span className="text-sm font-medium">Engagement Rate</span>
            </div>
            <div className="text-2xl font-bold title-font">
              {((prophecy.predictedLikes + prophecy.predictedComments) / Math.max(1, prophecy.predictedViews) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Timing Section */}
        <div className="space-y-4">
          <h4 className="font-medium title-font">Optimal Timing</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Clock size={18} className="text-primary-500 mr-2" />
              <div>
                <div className="text-sm font-medium">Best Time</div>
                <div className="text-sm text-foreground-muted">{prophecy.bestTime}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar size={18} className="text-primary-500 mr-2" />
              <div>
                <div className="text-sm font-medium">Best Day</div>
                <div className="text-sm text-foreground-muted">{prophecy.bestDay}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Trending Hashtags */}
        <div>
          <h4 className="font-medium mb-3 title-font">Trending Hashtags</h4>
          <div className="flex flex-wrap gap-2">
            {prophecy.trendingHashtags.map((tag, index) => (
              <div
                key={index}
                className="bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full text-sm"
              >
                <Hash size={14} className="inline mr-1" />
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div>
          <h4 className="font-medium mb-3 title-font">Key Insights</h4>
          <div className="space-y-2">
            {prophecy.insights.map((insight, index) => (
              <motion.div
                key={index}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedInsight === index 
                    ? 'bg-primary-500/20' 
                    : 'bg-background hover:bg-background-lighter'
                }`}
                onClick={() => setSelectedInsight(selectedInsight === index ? null : index)}
                initial={false}
                animate={{ height: selectedInsight === index ? 'auto' : '48px' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Info size={16} className="text-primary-500 mr-2" />
                    <span className="text-sm">{insight.message}</span>
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {insight.confidence}% sure
                  </div>
                </div>
                {selectedInsight === index && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-foreground-muted"
                  >
                    Based on analysis of your historical performance and current trends.
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="font-medium mb-3 title-font">Recommendations</h4>
          <div className="space-y-2">
            {prophecy.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2">
                <Sparkles size={16} className="text-primary-500 mt-1 shrink-0" />
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Visualization Toggle */}
        <div className="pt-2 border-t border-background-lighter">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-center w-full text-sm text-primary-400 hover:text-primary-300"
          >
            <BarChart4 size={16} className="mr-2" />
            {showAdvanced ? 'Hide Advanced Analytics' : 'Show Advanced Analytics'}
            {showAdvanced ? (
              <ChevronUp size={16} className="ml-2" />
            ) : (
              <ChevronDown size={16} className="ml-2" />
            )}
          </button>
        </div>
      </div>

      {/* Advanced Visualization */}
      {showAdvanced && (
        <ProphecyVisualizer 
          prophecy={prophecy}
          feedbackSummary={feedbackSummary}
        />
      )}
    </div>
  );
};

export default ProphecyPanel;
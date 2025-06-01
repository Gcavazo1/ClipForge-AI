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
  Info
} from 'lucide-react';
import Button from '../ui/button';
import { ProphecyResult } from '../../types';
import { formatNumber } from '../../lib/utils';

interface ProphecyPanelProps {
  prophecy: ProphecyResult | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const ProphecyPanel: React.FC<ProphecyPanelProps> = ({ prophecy, isLoading, onRefresh }) => {
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null);

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
          <h3 className="text-lg font-medium mb-2">No Prophecy Available</h3>
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

  return (
    <div className="bg-background-light rounded-lg p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Prophetic Insights</h3>
          <p className="text-sm text-foreground-muted">
            Confidence: {prophecy.confidence}%
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          icon={<Sparkles size={16} />}
        >
          Refresh
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background p-4 rounded-lg">
          <div className="flex items-center text-primary-500 mb-2">
            <TrendingUp size={18} className="mr-2" />
            <span className="text-sm font-medium">Predicted Views</span>
          </div>
          <div className="text-2xl font-bold">
            {formatNumber(prophecy.predictedViews)}
          </div>
        </div>
        
        <div className="bg-background p-4 rounded-lg">
          <div className="flex items-center text-primary-500 mb-2">
            <Star size={18} className="mr-2" />
            <span className="text-sm font-medium">Predicted Likes</span>
          </div>
          <div className="text-2xl font-bold">
            {formatNumber(prophecy.predictedLikes)}
          </div>
        </div>
      </div>

      {/* Timing Section */}
      <div className="space-y-4">
        <h4 className="font-medium">Optimal Timing</h4>
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
        <h4 className="font-medium mb-3">Trending Hashtags</h4>
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
        <h4 className="font-medium mb-3">Key Insights</h4>
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
        <h4 className="font-medium mb-3">Recommendations</h4>
        <div className="space-y-2">
          {prophecy.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <Sparkles size={16} className="text-primary-500 mt-1 shrink-0" />
              <p>{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProphecyPanel;
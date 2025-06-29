import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Italic as Crystal, 
  TrendingUp, 
  Clock, 
  Calendar, 
  Hash, 
  Star, 
  Sparkles, 
  AlertCircle,
  LineChart
} from 'lucide-react';
import Button from '../components/ui/button';
import MagicText from '../components/ui/magic-text';
import FeedbackPanel from '../components/prophecy/FeedbackPanel';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { getProphecy } from '../lib/prophecy';
import { getFeedbackSummary } from '../lib/feedback';
import { formatNumber } from '../lib/utils';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';
import { FeedbackSummary } from '../types';

interface Prophecy {
  predictedViews: number;
  predictedLikes: number;
  confidence: number;
  bestTime: string;
  bestDay: string;
  trendingHashtags: string[];
  recommendations: string[];
}

const ProphecyPage: React.FC = () => {
  const [prophecy, setProphecy] = useState<Prophecy | null>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });

  const user = useAppStore((state) => state.user);
  const currentProject = useAppStore((state) => state.currentProject);

  useEffect(() => {
    if (user && currentProject) {
      generateProphecy();
      loadFeedbackSummary();
    }
  }, [user, currentProject]);

  const generateProphecy = async () => {
    if (!user || !currentProject) return;

    try {
      setIsLoading(true);
      setError(null);

      const prophecyResult = await getProphecy(user.id, currentProject.id);
      setProphecy(prophecyResult);

      setToastMessage({
        title: 'New Prophecy Generated',
        description: 'The oracle has revealed insights about your content.'
      });
      setShowToast(true);
    } catch (err) {
      console.error('Error generating prophecy:', err);
      setError('The oracle is temporarily unavailable. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeedbackSummary = async () => {
    if (!user) return;

    try {
      const summary = await getFeedbackSummary(user.id);
      setFeedbackSummary(summary);
    } catch (err) {
      console.error('Error loading feedback summary:', err);
    }
  };

  const handleFeedbackSubmit = () => {
    loadFeedbackSummary(); // Refresh feedback summary after new submission
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--nav-height))]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 text-primary-500"
        >
          <Crystal size={64} />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-error-900/20 text-error-500 p-4 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <MagicText 
            as="h1" 
            className="text-2xl font-bold"
            starCount={3}
          >
            Prophetic Insights
          </MagicText>
          <p className="text-foreground-muted">Divine predictions for your content</p>
        </div>
        <Button
          variant="primary"
          onClick={generateProphecy}
          icon={<Sparkles size={16} />}
        >
          New Prophecy
        </Button>
      </div>

      {prophecy && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Predictions Panel */}
          <div className="bg-background-light rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <MagicText 
                as="h2" 
                className="text-lg font-medium"
                starCount={2}
              >
                Performance Prophecy
              </MagicText>
              <div className="text-xs text-foreground-muted">
                {prophecy.confidence}% confidence
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp size={20} className="text-primary-500 mr-2" />
                  <span>Predicted Views</span>
                </div>
                <span className="font-bold">{formatNumber(prophecy.predictedViews)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star size={20} className="text-warning-500 mr-2" />
                  <span>Predicted Likes</span>
                </div>
                <span className="font-bold">{formatNumber(prophecy.predictedLikes)}</span>
              </div>
            </div>

            {feedbackSummary && (
              <div className="pt-4 border-t border-background-lighter">
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                  <span>Prediction Accuracy</span>
                  <span className="font-medium">
                    {feedbackSummary.accuracyTrend[feedbackSummary.accuracyTrend.length - 1]?.accuracy.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Timing Panel */}
          <div className="bg-background-light rounded-lg p-6 space-y-6">
            <MagicText 
              as="h2" 
              className="text-lg font-medium"
              starCount={2}
            >
              Optimal Timing
            </MagicText>

            <div className="space-y-4">
              <div className="flex items-center">
                <Clock size={20} className="text-primary-500 mr-2" />
                <div>
                  <div className="font-medium">Best Time to Post</div>
                  <div className="text-sm text-foreground-muted">{prophecy.bestTime}</div>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar size={20} className="text-primary-500 mr-2" />
                <div>
                  <div className="font-medium">Best Day</div>
                  <div className="text-sm text-foreground-muted">{prophecy.bestDay}</div>
                </div>
              </div>
            </div>

            {feedbackSummary && (
              <div className="pt-4 border-t border-background-lighter">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Recommendation Follow Rate</span>
                  <span className="font-medium">
                    {feedbackSummary.recommendationFollowRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Panel */}
          <FeedbackPanel
            prophecyId={currentProject?.id || ''}
            prophecy={prophecy}
            onFeedbackSubmit={handleFeedbackSubmit}
          />
        </div>
      )}

      {/* Feedback Summary */}
      {feedbackSummary && feedbackSummary.accuracyTrend.length > 0 && (
        <div className="mt-8 bg-background-light rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <MagicText 
              as="h2" 
              className="text-lg font-medium"
              starCount={2}
            >
              Prediction Accuracy Trend
            </MagicText>
            <div className="flex items-center text-sm text-foreground-muted">
              <LineChart size={16} className="mr-2" />
              Based on {feedbackSummary.totalFeedback} predictions
            </div>
          </div>

          <div className="h-64">
            {/* Add a chart here using recharts to show accuracyTrend data */}
          </div>
        </div>
      )}

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default ProphecyPage;
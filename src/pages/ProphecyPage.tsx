import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Italic as Crystal, TrendingUp, Clock, Calendar, Hash, Star, Sparkles, AlertCircle } from 'lucide-react';
import Button from '../components/ui/button';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { getProphecy } from '../lib/prophecy';
import { formatNumber } from '../lib/utils';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });

  const user = useAppStore((state) => state.user);
  const currentProject = useAppStore((state) => state.currentProject);

  useEffect(() => {
    if (user && currentProject) {
      generateProphecy();
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
          <h1 className="text-2xl font-bold">Prophetic Insights</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Predictions Panel */}
          <div className="bg-background-light rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Performance Prophecy</h2>
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

            <div className="pt-4 border-t border-background-lighter">
              <div className="text-sm text-foreground-muted">
                Based on your historical performance and current trends
              </div>
            </div>
          </div>

          {/* Timing Panel */}
          <div className="bg-background-light rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium">Optimal Timing</h2>

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

            <div className="pt-4 border-t border-background-lighter">
              <div className="text-sm text-foreground-muted">
                Timing recommendations based on audience activity patterns
              </div>
            </div>
          </div>

          {/* Trending Topics */}
          <div className="bg-background-light rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium">Trending Topics</h2>

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

            <div className="space-y-3">
              {prophecy.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Sparkles size={16} className="text-primary-500 mt-1 shrink-0" />
                  <p>{rec}</p>
                </div>
              ))}
            </div>
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
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
  LineChart,
  BarChart4,
  Layers
} from 'lucide-react';
import Button from '../components/ui/button';
import ProphecyPanel from '../components/prophecy/ProphecyPanel';
import FeedbackPanel from '../components/prophecy/FeedbackPanel';
import ClipPlanForm from '../components/prophecy/ClipPlanForm';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { getProphecy, generateProphecyWithAllModels, getAvailableModelTypes } from '../lib/prophecy';
import { getFeedbackSummary } from '../lib/feedback';
import { formatNumber } from '../lib/utils';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';
import { FeedbackSummary, ProphecyResult, ModelType } from '../types';
import ProphecyVisualizer from '../lib/ml/ProphecyVisualizer';

const ProphecyPage: React.FC = () => {
  const [prophecy, setProphecy] = useState<ProphecyResult | null>(null);
  const [allModelProphecies, setAllModelProphecies] = useState<Record<ModelType, ProphecyResult> | null>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAllModels, setIsLoadingAllModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });
  const [selectedModel, setSelectedModel] = useState<ModelType>('ensemble');
  const [availableModels, setAvailableModels] = useState<ModelType[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const user = useAppStore((state) => state.user);
  const currentProject = useAppStore((state) => state.currentProject);

  useEffect(() => {
    if (user && currentProject) {
      generateProphecy();
      loadFeedbackSummary();
      setAvailableModels(getAvailableModelTypes());
    }
  }, [user, currentProject]);

  const generateProphecy = async (modelType: ModelType = 'ensemble') => {
    if (!user || !currentProject) return;

    try {
      setIsLoading(true);
      setError(null);

      const prophecyResult = await getProphecy(user.id, currentProject.id, modelType);
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

  const generateAllModelProphecies = async () => {
    if (!user || !currentProject) return;

    try {
      setIsLoadingAllModels(true);
      setError(null);

      const prophecies = await generateProphecyWithAllModels({
        userId: user.id,
        clipId: currentProject.id
      });
      
      setAllModelProphecies(prophecies);
      setShowComparison(true);

      setToastMessage({
        title: 'Model Comparison Ready',
        description: 'Compare predictions from different AI models.'
      });
      setShowToast(true);
    } catch (err) {
      console.error('Error generating multi-model prophecies:', err);
      setError('Unable to generate model comparison. You may need more historical data.');
    } finally {
      setIsLoadingAllModels(false);
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

  const handleModelChange = (modelType: ModelType) => {
    setSelectedModel(modelType);
    generateProphecy(modelType);
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
          <h1 className="text-2xl font-bold title-font">Prophetic Insights</h1>
          <p className="text-foreground-muted">AI-powered predictions for your content</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generateAllModelProphecies}
            disabled={isLoadingAllModels}
            icon={<Layers size={16} />}
          >
            {isLoadingAllModels ? 'Comparing...' : 'Compare Models'}
          </Button>
          <Button
            variant="primary"
            onClick={() => generateProphecy(selectedModel)}
            icon={<Sparkles size={16} />}
          >
            New Prophecy
          </Button>
        </div>
      </div>

      {showComparison && allModelProphecies && (
        <div className="mb-8 bg-background-light rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium title-font">Model Comparison</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(false)}
            >
              Hide Comparison
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(allModelProphecies).map(([model, modelProphecy]) => (
              <div 
                key={model}
                className={`bg-background p-4 rounded-lg border-2 transition-colors ${
                  selectedModel === model 
                    ? 'border-primary-500' 
                    : 'border-background-lighter hover:border-primary-500/50'
                }`}
                onClick={() => handleModelChange(model as ModelType)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{model === 'linear' ? 'Linear Regression' : model === 'randomForest' ? 'Random Forest' : 'Ensemble'}</h3>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-primary-900/30 text-primary-400">
                    {modelProphecy.confidence}% confidence
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-foreground-muted">Views</div>
                    <div className="font-medium">{formatNumber(modelProphecy.predictedViews)}</div>
                  </div>
                  <div>
                    <div className="text-foreground-muted">Likes</div>
                    <div className="font-medium">{formatNumber(modelProphecy.predictedLikes)}</div>
                  </div>
                  <div>
                    <div className="text-foreground-muted">Comments</div>
                    <div className="font-medium">{formatNumber(modelProphecy.predictedComments)}</div>
                  </div>
                  <div>
                    <div className="text-foreground-muted">Best Time</div>
                    <div className="font-medium">{modelProphecy.bestTime}</div>
                  </div>
                </div>
                
                <Button
                  variant={selectedModel === model ? 'primary' : 'outline'}
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => handleModelChange(model as ModelType)}
                >
                  {selectedModel === model ? 'Selected' : 'Select Model'}
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-foreground-muted">
            <p>
              <span className="font-medium">Linear Regression:</span> Fast, simple predictions based on trends
            </p>
            <p>
              <span className="font-medium">Random Forest:</span> Advanced predictions with feature analysis
            </p>
            <p>
              <span className="font-medium">Ensemble:</span> Combined models for highest accuracy
            </p>
          </div>
        </div>
      )}

      {prophecy && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Prophecy Panel */}
          <div className="lg:col-span-2">
            <ProphecyPanel
              prophecy={prophecy}
              isLoading={isLoading}
              onRefresh={() => generateProphecy(selectedModel)}
              onChangeModel={handleModelChange}
              selectedModel={selectedModel}
              availableModels={availableModels}
              feedbackSummary={feedbackSummary}
              showVisualization={true}
            />
          </div>

          {/* Feedback Panel */}
          <div>
            <FeedbackPanel
              prophecyId={currentProject?.id || ''}
              prophecy={prophecy}
              onFeedbackSubmit={handleFeedbackSubmit}
            />
          </div>
        </div>
      )}

      {/* Feedback Summary */}
      {feedbackSummary && feedbackSummary.accuracyTrend.length > 0 && (
        <div className="mt-8 bg-background-light rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium title-font">Prediction Accuracy Trend</h2>
            <div className="flex items-center text-sm text-foreground-muted">
              <BarChart4 size={16} className="mr-2" />
              Based on {feedbackSummary.totalFeedback} predictions
            </div>
          </div>

          <div className="h-64">
            <ProphecyVisualizer 
              prophecy={prophecy}
              feedbackSummary={feedbackSummary}
            />
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
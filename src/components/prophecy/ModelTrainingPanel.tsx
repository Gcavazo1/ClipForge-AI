import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  BarChart4,
  Database,
  Zap,
  TrendingUp,
  LineChart
} from 'lucide-react';
import Button from '../ui/button';
import { modelTrainingService } from '../../lib/ml/ModelTrainingService';
import { ModelType } from '../../types';
import { formatDate } from '../../lib/utils';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface ModelTrainingPanelProps {
  userId: string;
}

const ModelTrainingPanel: React.FC<ModelTrainingPanelProps> = ({ userId }) => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<{
    lastTrained: string | null;
    dataPoints: number;
    modelConfidence: Record<ModelType, number>;
    bestModel: ModelType;
    isTrainingQueued: boolean;
  } | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    accuracy: Record<ModelType, number>;
    predictions: Record<ModelType, number>;
    trend: Array<{
      date: string;
      accuracy: Record<ModelType, number>;
    }>;
  } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchTrainingStatus();
    fetchPerformanceMetrics();
  }, [userId]);

  const fetchTrainingStatus = async () => {
    try {
      const status = await modelTrainingService.getTrainingStatus(userId);
      setTrainingStatus(status);
    } catch (error) {
      console.error('Failed to fetch training status:', error);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const metrics = await modelTrainingService.getModelPerformanceMetrics(userId);
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  };

  const handleTrainModels = async () => {
    try {
      setIsTraining(true);
      
      const success = await modelTrainingService.trainModelsForUser(userId, true);
      
      if (success) {
        setToastMessage({
          title: 'Models Trained Successfully',
          description: 'Your prediction models have been updated with the latest data.'
        });
      } else {
        setToastMessage({
          title: 'Training Scheduled',
          description: 'Your models will be trained as soon as resources are available.'
        });
      }
      
      setShowToast(true);
      await fetchTrainingStatus();
      await fetchPerformanceMetrics();
    } catch (error) {
      console.error('Training failed:', error);
      setToastMessage({
        title: 'Training Failed',
        description: 'There was an error training the models. Please try again.'
      });
      setShowToast(true);
    } finally {
      setIsTraining(false);
    }
  };

  const formatModelName = (model: string): string => {
    switch (model) {
      case 'linear':
        return 'Linear Regression';
      case 'randomForest':
        return 'Random Forest';
      case 'ensemble':
        return 'Ensemble';
      case 'xgboost':
        return 'XGBoost';
      case 'hybrid':
        return 'Hybrid Ensemble';
      default:
        return model;
    }
  };

  // Prepare data for accuracy trend chart
  const prepareAccuracyTrendData = () => {
    if (!performanceMetrics || performanceMetrics.trend.length === 0) {
      return [];
    }
    
    return performanceMetrics.trend.map(point => {
      const formattedDate = new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      return {
        date: formattedDate,
        ...point.accuracy
      };
    });
  };

  // Prepare data for model comparison chart
  const prepareModelComparisonData = () => {
    if (!performanceMetrics) {
      return [];
    }
    
    return Object.entries(performanceMetrics.accuracy).map(([model, accuracy]) => ({
      model: formatModelName(model),
      accuracy,
      predictions: performanceMetrics.predictions[model as ModelType] || 0
    }));
  };

  if (!trainingStatus) {
    return (
      <div className="bg-background-light rounded-lg p-6">
        <div className="flex items-center justify-center py-6">
          <RefreshCw size={24} className="animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  const trendData = prepareAccuracyTrendData();
  const comparisonData = prepareModelComparisonData();

  return (
    <div className="bg-background-light rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium title-font">Model Training</h3>
          <p className="text-sm text-foreground-muted">
            {trainingStatus.lastTrained 
              ? `Last trained ${formatDate(new Date(trainingStatus.lastTrained).getTime())}` 
              : 'Models not yet trained'}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleTrainModels}
          disabled={isTraining || trainingStatus.isTrainingQueued}
          icon={isTraining ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
        >
          {isTraining 
            ? 'Training...' 
            : trainingStatus.isTrainingQueued 
              ? 'Queued for Training' 
              : 'Train Models'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-background p-4 rounded-lg">
              <div className="flex items-center text-primary-500 mb-2">
                <Database size={18} className="mr-2" />
                <span className="text-sm font-medium">Training Data</span>
              </div>
              <div className="text-2xl font-bold title-font">
                {trainingStatus.dataPoints} data points
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                {trainingStatus.dataPoints < 5 
                  ? 'Need at least 5 data points for basic models' 
                  : trainingStatus.dataPoints < 20
                  ? 'More data will improve prediction accuracy'
                  : 'Good data volume for accurate predictions'}
              </p>
            </div>
            
            <div className="bg-background p-4 rounded-lg">
              <div className="flex items-center text-primary-500 mb-2">
                <BarChart4 size={18} className="mr-2" />
                <span className="text-sm font-medium">Best Model</span>
              </div>
              <div className="text-2xl font-bold title-font">
                {formatModelName(trainingStatus.bestModel)}
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                Selected based on historical prediction accuracy
              </p>
            </div>
          </div>

          <h4 className="text-sm font-medium mb-3">Model Confidence</h4>
          <div className="space-y-4">
            {Object.entries(trainingStatus.modelConfidence).map(([model, confidence]) => (
              <div key={model} className="bg-background p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    {model === trainingStatus.bestModel && (
                      <CheckCircle size={14} className="text-success-500 mr-2" />
                    )}
                    <span className="text-sm">{formatModelName(model)}</span>
                  </div>
                  <span className="text-xs text-primary-400">{confidence.toFixed(1)}% confidence</span>
                </div>
                <div className="w-full bg-background-lighter h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-primary-500 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  ></motion.div>
                </div>
              </div>
            ))}
          </div>

          {trainingStatus.dataPoints < 5 && (
            <div className="mt-6 p-4 bg-warning-900/20 text-warning-500 rounded-lg flex items-start">
              <AlertTriangle size={18} className="mr-2 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Not enough data for accurate predictions</p>
                <p className="text-sm mt-1">
                  Upload more content and track performance to improve prediction accuracy.
                  We recommend at least 5 data points for basic models and 20+ for advanced models.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <h4 className="text-sm font-medium mb-4">Model Performance Comparison</h4>
          
          {comparisonData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="model" stroke="#a1a1aa" />
                  <YAxis 
                    yAxisId="left"
                    orientation="left"
                    stroke="#8b5cf6"
                    domain={[0, 100]}
                    label={{ 
                      value: 'Accuracy (%)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#8b5cf6' }
                    }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#22c55e"
                    label={{ 
                      value: 'Predictions', 
                      angle: 90, 
                      position: 'insideRight',
                      style: { fill: '#22c55e' }
                    }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1e1e1e', 
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="accuracy" 
                    name="Accuracy" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="predictions" 
                    name="Predictions" 
                    fill="#22c55e" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-background p-6 rounded-lg text-center">
              <TrendingUp size={24} className="mx-auto mb-2 text-foreground-muted" />
              <p className="text-foreground-muted">No performance data available yet</p>
              <p className="text-sm text-foreground-muted mt-1">
                Performance metrics will appear after making predictions
              </p>
            </div>
          )}
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-background p-4 rounded-lg">
              <h5 className="text-sm font-medium mb-2">Model Strengths</h5>
              <ul className="text-sm text-foreground-muted space-y-2">
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">•</span>
                  <span><strong>Linear Regression:</strong> Fast, works with limited data</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">•</span>
                  <span><strong>Random Forest:</strong> Handles non-linear relationships</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">•</span>
                  <span><strong>XGBoost:</strong> High accuracy, captures complex patterns</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">•</span>
                  <span><strong>Hybrid Ensemble:</strong> Combines strengths of all models</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-background p-4 rounded-lg">
              <h5 className="text-sm font-medium mb-2">Data Requirements</h5>
              <ul className="text-sm text-foreground-muted space-y-2">
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">•</span>
                  <span><strong>Linear:</strong> Minimum 3 data points</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">•</span>
                  <span><strong>Random Forest:</strong> Minimum 10 data points</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">•</span>
                  <span><strong>XGBoost:</strong> Minimum 15 data points</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">•</span>
                  <span><strong>Hybrid:</strong> Minimum 20 data points for optimal performance</span>
                </li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-0">
          <h4 className="text-sm font-medium mb-4">Accuracy Trends Over Time</h4>
          
          {trendData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart
                  data={trendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" stroke="#a1a1aa" />
                  <YAxis 
                    domain={[0, 100]}
                    stroke="#a1a1aa"
                    label={{ 
                      value: 'Accuracy (%)', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1e1e1e', 
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="linear" 
                    name="Linear" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="randomForest" 
                    name="Random Forest" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ensemble" 
                    name="Ensemble" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="xgboost" 
                    name="XGBoost" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hybrid" 
                    name="Hybrid" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-background p-6 rounded-lg text-center">
              <LineChart size={24} className="mx-auto mb-2 text-foreground-muted" />
              <p className="text-foreground-muted">No trend data available yet</p>
              <p className="text-sm text-foreground-muted mt-1">
                Accuracy trends will appear after making multiple predictions
              </p>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-background rounded-lg">
            <h5 className="text-sm font-medium mb-2">Accuracy Improvement</h5>
            <p className="text-sm text-foreground-muted">
              Model accuracy improves over time as more data becomes available and the system learns from prediction results. The Hybrid Ensemble model typically achieves the highest accuracy by combining the strengths of multiple models.
            </p>
            <p className="text-sm text-foreground-muted mt-2">
              For best results, provide feedback on predictions and track actual performance metrics.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default ModelTrainingPanel;
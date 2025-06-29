import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  BarChart4,
  Database,
  Zap
} from 'lucide-react';
import Button from '../ui/button';
import { modelTrainingService } from '../../lib/ml/ModelTrainingService';
import { ModelType } from '../../types';
import { formatDate } from '../../lib/utils';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';
import { motion } from 'framer-motion';

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
  } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTrainingStatus();
  }, [userId]);

  const fetchTrainingStatus = async () => {
    try {
      const status = await modelTrainingService.getTrainingStatus(userId);
      setTrainingStatus(status);
    } catch (error) {
      console.error('Failed to fetch training status:', error);
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
          title: 'Training Skipped',
          description: 'Not enough data available or training already in progress.'
        });
      }
      
      setShowToast(true);
      await fetchTrainingStatus();
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
      default:
        return model;
    }
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
          disabled={isTraining}
          icon={isTraining ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
        >
          {isTraining ? 'Training...' : 'Train Models'}
        </Button>
      </div>

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
import { ClipAnalytics, ModelType } from '../../types';
import { advancedProphecyEngine } from './AdvancedProphecyEngine';
import { dataIntegrationPipeline } from './DataIntegrationPipeline';
import { advancedFeatureEngineering } from './AdvancedFeatureEngineering';
import { supabase } from '../supabase';
import { logger } from '../logger';

export class ModelTrainingService {
  private isTraining = false;
  private lastTrainingTime: Record<string, number> = {};
  private readonly TRAINING_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private trainingQueue: string[] = [];
  private modelPerformanceCache: Record<string, Record<ModelType, number>> = {};

  // Train models for a specific user
  async trainModelsForUser(userId: string, forceRetrain = false): Promise<boolean> {
    try {
      // Check if training is already in progress
      if (this.isTraining) {
        logger.info('Model training already in progress, adding to queue', { userId });
        if (!this.trainingQueue.includes(userId)) {
          this.trainingQueue.push(userId);
        }
        return false;
      }

      // Check if we need to retrain based on last training time
      if (!forceRetrain && this.lastTrainingTime[userId]) {
        const timeSinceLastTraining = Date.now() - this.lastTrainingTime[userId];
        if (timeSinceLastTraining < this.TRAINING_INTERVAL) {
          logger.info('Models recently trained, skipping', { 
            userId, 
            hoursSinceLastTraining: Math.round(timeSinceLastTraining / (60 * 60 * 1000)) 
          });
          return false;
        }
      }

      this.isTraining = true;
      logger.info('Starting model training for user', { userId });

      // Fetch analytics data
      const analytics = await dataIntegrationPipeline.fetchAllData(userId);
      
      if (analytics.length < 5) {
        logger.warn('Not enough data for model training', { 
          userId, 
          dataPoints: analytics.length 
        });
        this.isTraining = false;
        this.processQueue();
        return false;
      }

      // Extract features using advanced feature engineering
      const features = await advancedFeatureEngineering.extractAdvancedFeatures(analytics);
      
      // Train models
      await advancedProphecyEngine.trainModels(analytics, features);
      
      // Update last training time
      this.lastTrainingTime[userId] = Date.now();
      
      // Store training metadata
      await this.storeTrainingMetadata(userId, analytics.length);
      
      // Update model performance cache
      this.updateModelPerformanceCache(userId);
      
      logger.info('Model training completed successfully', { 
        userId, 
        dataPoints: analytics.length 
      });
      
      this.isTraining = false;
      this.processQueue();
      return true;
    } catch (error) {
      logger.error('Model training failed', error as Error, { userId });
      this.isTraining = false;
      this.processQueue();
      return false;
    }
  }

  // Process the training queue
  private async processQueue(): Promise<void> {
    if (this.trainingQueue.length > 0 && !this.isTraining) {
      const nextUserId = this.trainingQueue.shift();
      if (nextUserId) {
        logger.info('Processing next user in training queue', { userId: nextUserId });
        await this.trainModelsForUser(nextUserId, true);
      }
    }
  }

  // Store training metadata
  private async storeTrainingMetadata(userId: string, dataPoints: number): Promise<void> {
    try {
      // Get model confidence scores
      const modelTypes = advancedProphecyEngine.getAvailableModels();
      const confidenceScores: Record<string, number> = {};
      
      for (const modelType of modelTypes) {
        confidenceScores[modelType] = advancedProphecyEngine.getModelConfidence(modelType);
      }
      
      // Store in database
      const { error } = await supabase
        .from('model_training_history')
        .insert({
          user_id: userId,
          data_points: dataPoints,
          confidence_scores: confidenceScores,
          trained_at: new Date().toISOString()
        });
      
      if (error) {
        logger.error('Failed to store training metadata', error);
      }
    } catch (error) {
      logger.error('Error storing training metadata', error as Error);
    }
  }

  // Update model performance cache
  private async updateModelPerformanceCache(userId: string): Promise<void> {
    try {
      // Get model performance from database
      const { data, error } = await supabase
        .from('prophecy_accuracy_analysis')
        .select('model_type, avg_accuracy')
        .eq('user_id', userId)
        .order('prediction_date', { ascending: false })
        .limit(10);
      
      if (error) {
        logger.error('Failed to fetch model performance', error);
        return;
      }
      
      // Group by model type and calculate average accuracy
      const modelPerformance: Record<ModelType, number> = {} as Record<ModelType, number>;
      
      data.forEach(row => {
        const modelType = row.model_type as ModelType;
        if (!modelPerformance[modelType]) {
          modelPerformance[modelType] = row.avg_accuracy;
        }
      });
      
      // Store in cache
      this.modelPerformanceCache[userId] = modelPerformance;
      
      logger.debug('Updated model performance cache', { 
        userId, 
        modelPerformance 
      });
    } catch (error) {
      logger.error('Failed to update model performance cache', error as Error);
    }
  }

  // Get best model for a user based on historical accuracy
  async getBestModelForUser(userId: string): Promise<ModelType> {
    try {
      // Check cache first
      if (this.modelPerformanceCache[userId]) {
        const performance = this.modelPerformanceCache[userId];
        const entries = Object.entries(performance);
        
        if (entries.length > 0) {
          // Find model with highest accuracy
          const [bestModel] = entries.reduce((best, current) => {
            return current[1] > best[1] ? current : best;
          });
          
          logger.debug('Using cached best model', { 
            userId, 
            bestModel, 
            accuracy: performance[bestModel as ModelType] 
          });
          
          return bestModel as ModelType;
        }
      }
      
      // Query the database for the best model
      const { data, error } = await supabase.rpc('get_best_model_for_user', {
        user_uuid: userId
      });
      
      if (error) throw error;
      
      // If we have a result, return it
      if (data) {
        logger.debug('Found best model from database', { 
          userId, 
          bestModel: data 
        });
        return data as ModelType;
      }
      
      // Default to hybrid if no data
      return 'hybrid';
    } catch (error) {
      logger.error('Failed to get best model for user', error as Error, { userId });
      return 'hybrid'; // Default to hybrid on error
    }
  }

  // Schedule automatic model training
  scheduleTraining(userId: string, intervalHours = 24): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(() => {
      this.trainModelsForUser(userId)
        .catch(error => {
          logger.error('Scheduled training failed', error as Error, { userId });
        });
    }, intervalMs);
    
    logger.info('Scheduled automatic model training', { 
      userId, 
      intervalHours 
    });
  }

  // Get training status for a user
  async getTrainingStatus(userId: string): Promise<{
    lastTrained: string | null;
    dataPoints: number;
    modelConfidence: Record<ModelType, number>;
    bestModel: ModelType;
    isTrainingQueued: boolean;
  }> {
    try {
      // Get last training record
      const { data, error } = await supabase
        .from('model_training_history')
        .select('*')
        .eq('user_id', userId)
        .order('trained_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Get best model
      const bestModel = await this.getBestModelForUser(userId);
      
      // Check if user is in training queue
      const isTrainingQueued = this.trainingQueue.includes(userId);
      
      // If no training history, return defaults
      if (!data) {
        return {
          lastTrained: null,
          dataPoints: 0,
          modelConfidence: {
            linear: 0,
            randomForest: 0,
            ensemble: 0,
            xgboost: 0,
            hybrid: 0
          },
          bestModel,
          isTrainingQueued
        };
      }
      
      return {
        lastTrained: data.trained_at,
        dataPoints: data.data_points,
        modelConfidence: data.confidence_scores,
        bestModel,
        isTrainingQueued
      };
    } catch (error) {
      logger.error('Failed to get training status', error as Error, { userId });
      
      // Return defaults on error
      return {
        lastTrained: null,
        dataPoints: 0,
        modelConfidence: {
          linear: 0,
          randomForest: 0,
          ensemble: 0,
          xgboost: 0,
          hybrid: 0
        },
        bestModel: 'hybrid',
        isTrainingQueued: false
      };
    }
  }

  // Get model performance metrics
  async getModelPerformanceMetrics(userId: string): Promise<{
    accuracy: Record<ModelType, number>;
    predictions: Record<ModelType, number>;
    trend: Array<{
      date: string;
      accuracy: Record<ModelType, number>;
    }>;
  }> {
    try {
      // Get model performance from database
      const { data, error } = await supabase
        .from('prophecy_accuracy_analysis')
        .select('model_type, prediction_date, avg_accuracy, prediction_count')
        .eq('user_id', userId)
        .order('prediction_date', { ascending: true });
      
      if (error) throw error;
      
      // Process data
      const accuracy: Record<ModelType, number> = {} as Record<ModelType, number>;
      const predictions: Record<ModelType, number> = {} as Record<ModelType, number>;
      const trendMap = new Map<string, Record<ModelType, number>>();
      
      // Initialize with all model types
      const modelTypes = advancedProphecyEngine.getAvailableModels();
      modelTypes.forEach(model => {
        accuracy[model] = 0;
        predictions[model] = 0;
      });
      
      // Process data
      data.forEach(row => {
        const modelType = row.model_type as ModelType;
        const date = new Date(row.prediction_date).toISOString().split('T')[0];
        
        // Update accuracy and prediction counts
        accuracy[modelType] = row.avg_accuracy;
        predictions[modelType] = (predictions[modelType] || 0) + row.prediction_count;
        
        // Update trend data
        if (!trendMap.has(date)) {
          const dateRecord: Record<ModelType, number> = {} as Record<ModelType, number>;
          modelTypes.forEach(model => {
            dateRecord[model] = 0;
          });
          trendMap.set(date, dateRecord);
        }
        
        trendMap.get(date)![modelType] = row.avg_accuracy;
      });
      
      // Convert trend map to array
      const trend = Array.from(trendMap.entries()).map(([date, accuracyRecord]) => ({
        date,
        accuracy: accuracyRecord
      }));
      
      return { accuracy, predictions, trend };
    } catch (error) {
      logger.error('Failed to get model performance metrics', error as Error, { userId });
      
      // Return empty data on error
      const emptyRecord: Record<ModelType, number> = {} as Record<ModelType, number>;
      advancedProphecyEngine.getAvailableModels().forEach(model => {
        emptyRecord[model] = 0;
      });
      
      return {
        accuracy: emptyRecord,
        predictions: emptyRecord,
        trend: []
      };
    }
  }
}

// Export singleton instance
export const modelTrainingService = new ModelTrainingService();
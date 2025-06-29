import { ClipAnalytics, ModelType } from '../../types';
import { advancedProphecyEngine } from './AdvancedProphecyEngine';
import { dataIntegrationPipeline } from './DataIntegrationPipeline';
import { supabase } from '../supabase';
import { logger } from '../logger';

export class ModelTrainingService {
  private isTraining = false;
  private lastTrainingTime: Record<string, number> = {};
  private readonly TRAINING_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  // Train models for a specific user
  async trainModelsForUser(userId: string, forceRetrain = false): Promise<boolean> {
    try {
      // Check if training is already in progress
      if (this.isTraining) {
        logger.info('Model training already in progress, skipping', { userId });
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
        return false;
      }

      // Extract features
      const features = await dataIntegrationPipeline.extractFeaturesFromAnalytics(analytics);
      
      // Train models
      await advancedProphecyEngine.trainModels(analytics, features);
      
      // Update last training time
      this.lastTrainingTime[userId] = Date.now();
      
      // Store training metadata
      await this.storeTrainingMetadata(userId, analytics.length);
      
      logger.info('Model training completed successfully', { 
        userId, 
        dataPoints: analytics.length 
      });
      
      this.isTraining = false;
      return true;
    } catch (error) {
      logger.error('Model training failed', error as Error, { userId });
      this.isTraining = false;
      return false;
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

  // Get best model for a user based on historical accuracy
  async getBestModelForUser(userId: string): Promise<ModelType> {
    try {
      // Query the database for the best model
      const { data, error } = await supabase.rpc('get_best_model_for_user', {
        user_uuid: userId
      });
      
      if (error) throw error;
      
      // If we have a result, return it
      if (data) {
        return data as ModelType;
      }
      
      // Default to ensemble if no data
      return 'ensemble';
    } catch (error) {
      logger.error('Failed to get best model for user', error as Error, { userId });
      return 'ensemble'; // Default to ensemble on error
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
      
      // If no training history, return defaults
      if (!data) {
        return {
          lastTrained: null,
          dataPoints: 0,
          modelConfidence: {
            linear: 0,
            randomForest: 0,
            ensemble: 0,
            xgboost: 0
          },
          bestModel
        };
      }
      
      return {
        lastTrained: data.trained_at,
        dataPoints: data.data_points,
        modelConfidence: data.confidence_scores,
        bestModel
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
          xgboost: 0
        },
        bestModel: 'ensemble'
      };
    }
  }
}

// Export singleton instance
export const modelTrainingService = new ModelTrainingService();
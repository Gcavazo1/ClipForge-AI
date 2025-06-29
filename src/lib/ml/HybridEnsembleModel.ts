import { ClipAnalytics } from '../../types';
import { 
  PredictionModel, 
  ProphecyFeatures, 
  ProphecyPrediction,
  LinearRegressionModel,
  RandomForestModel
} from './AdvancedProphecyEngine';
import { XGBoostModel } from './XGBoostModel';
import { logger } from '../logger';

// Advanced ensemble model that uses dynamic weighting
export class HybridEnsembleModel implements PredictionModel {
  name = 'Hybrid Ensemble';
  private models: PredictionModel[] = [];
  private weights: number[] = [];
  private confidence = 0;
  private featureImportance: Record<string, number> = {};
  private adaptiveWeighting = true;
  private userSpecificWeights: Record<string, number[]> = {};

  constructor(models: PredictionModel[] = []) {
    this.models = models;
    // Initialize with equal weights
    this.weights = models.map(() => 1 / models.length);
  }

  // Add a model to the ensemble
  addModel(model: PredictionModel, weight: number): void {
    this.models.push(model);
    // Add weight and normalize
    this.weights.push(weight);
    this.normalizeWeights();
  }

  // Set user-specific weights
  setUserWeights(userId: string, weights: number[]): void {
    if (weights.length !== this.models.length) {
      throw new Error('Weights array length must match number of models');
    }
    
    // Store normalized weights
    const normalizedWeights = [...weights];
    const sum = normalizedWeights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < normalizedWeights.length; i++) {
      normalizedWeights[i] /= sum;
    }
    
    this.userSpecificWeights[userId] = normalizedWeights;
    logger.info('Set user-specific model weights', { userId, weights: normalizedWeights });
  }

  // Get user-specific weights
  getUserWeights(userId: string): number[] | null {
    return this.userSpecificWeights[userId] || null;
  }

  // Enable or disable adaptive weighting
  setAdaptiveWeighting(enabled: boolean): void {
    this.adaptiveWeighting = enabled;
  }

  async train(analytics: ClipAnalytics[], features: ProphecyFeatures[]): Promise<void> {
    try {
      if (this.models.length === 0) {
        throw new Error('No models in ensemble');
      }

      logger.info('Training hybrid ensemble model', { 
        modelCount: this.models.length,
        dataPoints: analytics.length
      });

      // Train each model
      for (const model of this.models) {
        try {
          await model.train(analytics, features);
          logger.info(`Model ${model.name} trained successfully`, {
            confidence: model.getConfidence()
          });
        } catch (error) {
          logger.error(`Failed to train model ${model.name}`, error as Error);
          // Continue with other models
        }
      }

      // If adaptive weighting is enabled, adjust weights based on model performance
      if (this.adaptiveWeighting) {
        this.adjustWeights();
      }

      // Calculate ensemble confidence as weighted average of model confidences
      this.calculateEnsembleConfidence();

      // Combine feature importance from all models
      this.combineFeatureImportance();

      logger.info('Hybrid ensemble model trained successfully', {
        modelCount: this.models.length,
        confidence: this.confidence,
        weights: this.weights
      });
    } catch (error) {
      logger.error('Failed to train hybrid ensemble model', error as Error);
      throw error;
    }
  }

  async predict(features: ProphecyFeatures, userId?: string): Promise<ProphecyPrediction> {
    if (this.models.length === 0) {
      throw new Error('No models in ensemble');
    }

    // Use user-specific weights if available
    const weights = userId && this.userSpecificWeights[userId] 
      ? this.userSpecificWeights[userId] 
      : this.weights;

    // Get predictions from all models
    const predictions = await Promise.all(
      this.models.map(model => model.predict(features))
    );

    // Combine predictions using weighted average
    const viewsPrediction = Math.round(
      predictions.reduce((sum, pred, i) => sum + pred.views * weights[i], 0)
    );
    
    const likesPrediction = Math.round(
      predictions.reduce((sum, pred, i) => sum + pred.likes * weights[i], 0)
    );
    
    const commentsPrediction = Math.round(
      predictions.reduce((sum, pred, i) => sum + pred.comments * weights[i], 0)
    );
    
    const sharesPrediction = Math.round(
      predictions.reduce((sum, pred, i) => sum + pred.shares * weights[i], 0)
    );

    // Calculate combined confidence intervals
    const viewsCI = this.combineConfidenceIntervals(
      predictions.map(p => p.confidenceInterval.views),
      weights
    );
    
    const likesCI = this.combineConfidenceIntervals(
      predictions.map(p => p.confidenceInterval.likes),
      weights
    );
    
    const commentsCI = this.combineConfidenceIntervals(
      predictions.map(p => p.confidenceInterval.comments),
      weights
    );
    
    const sharesCI = this.combineConfidenceIntervals(
      predictions.map(p => p.confidenceInterval.shares),
      weights
    );

    return {
      views: viewsPrediction,
      likes: likesPrediction,
      comments: commentsPrediction,
      shares: sharesPrediction,
      confidence: this.confidence,
      confidenceInterval: {
        views: viewsCI,
        likes: likesCI,
        comments: commentsCI,
        shares: sharesCI
      },
      featureImportance: this.featureImportance
    };
  }

  getConfidence(): number {
    return this.confidence;
  }

  getFeatureImportance(): Record<string, number> {
    return this.featureImportance;
  }

  getModelWeights(): { model: string; weight: number }[] {
    return this.models.map((model, index) => ({
      model: model.name,
      weight: this.weights[index]
    }));
  }

  // Normalize weights to sum to 1
  private normalizeWeights(): void {
    const sum = this.weights.reduce((a, b) => a + b, 0);
    this.weights = this.weights.map(w => w / sum);
  }

  // Adjust weights based on model confidence
  private adjustWeights(): void {
    // Get confidence scores
    const confidences = this.models.map(model => model.getConfidence());
    
    // Calculate total confidence
    const totalConfidence = confidences.reduce((sum, conf) => sum + conf, 0);
    
    if (totalConfidence > 0) {
      // Set weights proportional to confidence
      this.weights = confidences.map(conf => conf / totalConfidence);
    } else {
      // Equal weights if no confidence data
      this.weights = this.models.map(() => 1 / this.models.length);
    }
    
    logger.info('Adjusted model weights based on confidence', { 
      weights: this.weights,
      confidences
    });
  }

  // Calculate ensemble confidence
  private calculateEnsembleConfidence(): void {
    // Weighted average of model confidences
    this.confidence = this.models.reduce(
      (sum, model, i) => sum + model.getConfidence() * this.weights[i],
      0
    );
    
    // Boost confidence slightly for ensemble effect
    this.confidence = Math.min(100, this.confidence * 1.05);
  }

  // Combine feature importance from all models
  private combineFeatureImportance(): void {
    const combinedImportance: Record<string, number> = {};
    
    // Get all unique feature names
    const allFeatures = new Set<string>();
    this.models.forEach(model => {
      Object.keys(model.getFeatureImportance()).forEach(key => {
        allFeatures.add(key);
      });
    });
    
    // Calculate weighted average for each feature
    allFeatures.forEach(feature => {
      combinedImportance[feature] = this.models.reduce((sum, model, i) => {
        const importance = model.getFeatureImportance()[feature] || 0;
        return sum + importance * this.weights[i];
      }, 0);
    });
    
    this.featureImportance = combinedImportance;
  }

  // Combine confidence intervals from multiple models
  private combineConfidenceIntervals(
    intervals: Array<{ lower: number; upper: number }>,
    weights: number[]
  ): { lower: number; upper: number } {
    // Weighted average of lower and upper bounds
    const lower = Math.max(
      0,
      intervals.reduce((sum, interval, i) => sum + interval.lower * weights[i], 0)
    );
    
    const upper = intervals.reduce(
      (sum, interval, i) => sum + interval.upper * weights[i],
      0
    );
    
    return { lower, upper };
  }

  // Create a hybrid ensemble with all available models
  static createFullEnsemble(): HybridEnsembleModel {
    const linearModel = new LinearRegressionModel();
    const randomForestModel = new RandomForestModel();
    const xgboostModel = new XGBoostModel();
    
    const ensemble = new HybridEnsembleModel([linearModel, randomForestModel, xgboostModel]);
    
    // Set initial weights (can be adjusted during training)
    ensemble.weights = [0.2, 0.3, 0.5]; // XGBoost gets highest weight initially
    
    return ensemble;
  }
}
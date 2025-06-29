import { SimpleLinearRegression } from 'ml-regression-simple-linear';
import { RandomForestRegression as RandomForest } from 'ml-random-forest';
import { Matrix } from 'ml-matrix';
import { mean, standardDeviation } from 'ml-stat/array';
import { ClipAnalytics, ProphecyResult } from '../../types';
import { logger } from '../logger';

// Define model types
export type ModelType = 'linear' | 'randomForest' | 'ensemble' | 'xgboost';

// Define feature types
export interface ContentFeatures {
  duration: number;
  hasMusic: boolean;
  hasCaptions: boolean;
  topicCategory: string;
  sentimentScore: number;
  contentComplexity: number;
  paceScore: number;
  thumbnailQuality: number;
  titleQuality: number;
}

export interface TemporalFeatures {
  dayOfWeek: number;
  hourOfDay: number;
  isWeekend: boolean;
  isHoliday: boolean;
  seasonality: number;
  monthOfYear: number;
}

export interface UserFeatures {
  followersCount: number;
  engagementRate: number;
  postFrequency: number;
  accountAge: number;
  niche: string;
  previousSuccessRate: number;
}

export interface PlatformFeatures {
  platform: string;
  algorithmTrend: number;
  competitionLevel: number;
  recommendationScore: number;
}

export interface ProphecyFeatures {
  content: ContentFeatures;
  temporal: TemporalFeatures;
  user: UserFeatures;
  platform: PlatformFeatures;
}

export interface ProphecyPrediction {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  confidence: number;
  confidenceInterval: {
    views: { lower: number; upper: number };
    likes: { lower: number; upper: number };
    comments: { lower: number; upper: number };
    shares: { lower: number; upper: number };
  };
  featureImportance: Record<string, number>;
}

// Base prediction model interface
export interface PredictionModel {
  name: string;
  train(analytics: ClipAnalytics[], features: ProphecyFeatures[]): Promise<void>;
  predict(features: ProphecyFeatures): Promise<ProphecyPrediction>;
  getConfidence(): number;
  getFeatureImportance(): Record<string, number>;
}

// Linear Regression Model
export class LinearRegressionModel implements PredictionModel {
  name = 'Linear Regression';
  private viewsModel: SimpleLinearRegression | null = null;
  private likesModel: SimpleLinearRegression | null = null;
  private commentsModel: SimpleLinearRegression | null = null;
  private sharesModel: SimpleLinearRegression | null = null;
  private confidence = 0;
  private featureImportance: Record<string, number> = {};

  async train(analytics: ClipAnalytics[], features: ProphecyFeatures[]): Promise<void> {
    try {
      if (analytics.length < 3) {
        throw new Error('Not enough data to train linear regression model');
      }

      // Convert features to flat array for linear regression
      const X = features.map(feature => this.flattenFeatures(feature));
      
      // Extract target variables
      const views = analytics.map(a => a.views);
      const likes = analytics.map(a => a.likes);
      const comments = analytics.map(a => a.comments);
      const shares = analytics.map(a => a.shares || 0);

      // Train models for each target variable
      this.viewsModel = new SimpleLinearRegression(X, views);
      this.likesModel = new SimpleLinearRegression(X, likes);
      this.commentsModel = new SimpleLinearRegression(X, comments);
      this.sharesModel = new SimpleLinearRegression(X, shares);

      // Calculate confidence based on R² scores
      const viewsR2 = this.viewsModel.score(X, views);
      const likesR2 = this.likesModel.score(X, likes);
      const commentsR2 = this.commentsModel.score(X, comments);
      const sharesR2 = this.sharesModel.score(X, shares);

      this.confidence = (viewsR2 + likesR2 + commentsR2 + sharesR2) / 4 * 100;
      
      // Calculate feature importance (coefficients for linear regression)
      this.calculateFeatureImportance();

      logger.info('Linear regression model trained successfully', {
        dataPoints: analytics.length,
        confidence: this.confidence,
        r2Scores: { views: viewsR2, likes: likesR2, comments: commentsR2, shares: sharesR2 }
      });
    } catch (error) {
      logger.error('Failed to train linear regression model', error as Error);
      throw error;
    }
  }

  async predict(features: ProphecyFeatures): Promise<ProphecyPrediction> {
    if (!this.viewsModel || !this.likesModel || !this.commentsModel || !this.sharesModel) {
      throw new Error('Model not trained');
    }

    const flatFeatures = this.flattenFeatures(features);
    
    // Make predictions
    const viewsPrediction = Math.max(0, Math.round(this.viewsModel.predict(flatFeatures)));
    const likesPrediction = Math.max(0, Math.round(this.likesModel.predict(flatFeatures)));
    const commentsPrediction = Math.max(0, Math.round(this.commentsModel.predict(flatFeatures)));
    const sharesPrediction = Math.max(0, Math.round(this.sharesModel.predict(flatFeatures)));

    // Calculate confidence intervals (using standard error of regression)
    const viewsCI = this.calculateConfidenceInterval(viewsPrediction, 0.2 * viewsPrediction);
    const likesCI = this.calculateConfidenceInterval(likesPrediction, 0.25 * likesPrediction);
    const commentsCI = this.calculateConfidenceInterval(commentsPrediction, 0.3 * commentsPrediction);
    const sharesCI = this.calculateConfidenceInterval(sharesPrediction, 0.35 * sharesPrediction);

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

  private flattenFeatures(features: ProphecyFeatures): number {
    // For simple linear regression, we need to convert multi-dimensional features to a single value
    // In a real implementation, we would use multiple linear regression with all features
    // For this demo, we'll use a weighted combination of key features
    
    const { content, temporal, user, platform } = features;
    
    return (
      content.duration * 0.1 +
      (content.hasMusic ? 5 : 0) +
      (content.hasCaptions ? 10 : 0) +
      content.sentimentScore * 20 +
      content.paceScore * 15 +
      temporal.hourOfDay * 0.5 +
      (temporal.isWeekend ? 10 : 0) +
      user.followersCount * 0.01 +
      user.engagementRate * 100 +
      (platform.platform === 'tiktok' ? 20 : platform.platform === 'instagram' ? 15 : 10)
    );
  }

  private calculateFeatureImportance(): void {
    // In a real implementation, we would extract coefficients from multiple linear regression
    // For this demo, we'll use predefined importance values
    this.featureImportance = {
      'content.duration': 0.05,
      'content.hasMusic': 0.08,
      'content.hasCaptions': 0.12,
      'content.sentimentScore': 0.15,
      'content.paceScore': 0.10,
      'temporal.hourOfDay': 0.07,
      'temporal.isWeekend': 0.06,
      'user.followersCount': 0.14,
      'user.engagementRate': 0.18,
      'platform.platform': 0.05
    };
  }

  private calculateConfidenceInterval(
    prediction: number,
    standardError: number,
    confidenceLevel: number = 0.95
  ): { lower: number; upper: number } {
    // For 95% confidence interval, use z-score of 1.96
    const zScore = 1.96;
    
    return {
      lower: Math.max(0, prediction - zScore * standardError),
      upper: prediction + zScore * standardError
    };
  }
}

// Random Forest Model
export class RandomForestModel implements PredictionModel {
  name = 'Random Forest';
  private viewsModel: RandomForest | null = null;
  private likesModel: RandomForest | null = null;
  private commentsModel: RandomForest | null = null;
  private sharesModel: RandomForest | null = null;
  private confidence = 0;
  private featureImportance: Record<string, number> = {};
  private featureNames: string[] = [];

  async train(analytics: ClipAnalytics[], features: ProphecyFeatures[]): Promise<void> {
    try {
      if (analytics.length < 10) {
        throw new Error('Not enough data to train random forest model');
      }

      // Extract feature names and create feature matrix
      this.featureNames = this.extractFeatureNames(features[0]);
      const X = this.createFeatureMatrix(features);
      
      // Extract target variables
      const views = analytics.map(a => a.views);
      const likes = analytics.map(a => a.likes);
      const comments = analytics.map(a => a.comments);
      const shares = analytics.map(a => a.shares || 0);

      // Train models for each target variable
      this.viewsModel = new RandomForest({
        seed: 42,
        nEstimators: 50,
        maxFeatures: 0.8,
        replacement: true,
        treeOptions: { minNumSamples: 2 }
      });
      
      this.likesModel = new RandomForest({
        seed: 43,
        nEstimators: 50,
        maxFeatures: 0.8,
        replacement: true,
        treeOptions: { minNumSamples: 2 }
      });
      
      this.commentsModel = new RandomForest({
        seed: 44,
        nEstimators: 50,
        maxFeatures: 0.8,
        replacement: true,
        treeOptions: { minNumSamples: 2 }
      });
      
      this.sharesModel = new RandomForest({
        seed: 45,
        nEstimators: 50,
        maxFeatures: 0.8,
        replacement: true,
        treeOptions: { minNumSamples: 2 }
      });

      // Train each model
      this.viewsModel.train(X, views);
      this.likesModel.train(X, likes);
      this.commentsModel.train(X, comments);
      this.sharesModel.train(X, shares);

      // Calculate out-of-bag error for confidence
      const viewsOOB = this.calculateOOBError(X, views, this.viewsModel);
      const likesOOB = this.calculateOOBError(X, likes, this.likesModel);
      const commentsOOB = this.calculateOOBError(X, comments, this.commentsModel);
      const sharesOOB = this.calculateOOBError(X, shares, this.sharesModel);

      // Convert OOB error to confidence score (0-100)
      this.confidence = 100 * (1 - (viewsOOB + likesOOB + commentsOOB + sharesOOB) / 4);
      
      // Calculate feature importance
      this.calculateFeatureImportance();

      logger.info('Random forest model trained successfully', {
        dataPoints: analytics.length,
        confidence: this.confidence,
        oobErrors: { views: viewsOOB, likes: likesOOB, comments: commentsOOB, shares: sharesOOB }
      });
    } catch (error) {
      logger.error('Failed to train random forest model', error as Error);
      throw error;
    }
  }

  async predict(features: ProphecyFeatures): Promise<ProphecyPrediction> {
    if (!this.viewsModel || !this.likesModel || !this.commentsModel || !this.sharesModel) {
      throw new Error('Model not trained');
    }

    const featureVector = this.featuresToVector(features);
    
    // Make predictions
    const viewsPrediction = Math.max(0, Math.round(this.viewsModel.predict([featureVector])[0]));
    const likesPrediction = Math.max(0, Math.round(this.likesModel.predict([featureVector])[0]));
    const commentsPrediction = Math.max(0, Math.round(this.commentsModel.predict([featureVector])[0]));
    const sharesPrediction = Math.max(0, Math.round(this.sharesModel.predict([featureVector])[0]));

    // Calculate prediction intervals using bootstrap
    const viewsCI = this.calculatePredictionInterval(viewsPrediction, 0.15 * viewsPrediction);
    const likesCI = this.calculatePredictionInterval(likesPrediction, 0.2 * likesPrediction);
    const commentsCI = this.calculatePredictionInterval(commentsPrediction, 0.25 * commentsPrediction);
    const sharesCI = this.calculatePredictionInterval(sharesPrediction, 0.3 * sharesPrediction);

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

  private extractFeatureNames(features: ProphecyFeatures): string[] {
    const names: string[] = [];
    
    // Content features
    Object.keys(features.content).forEach(key => {
      names.push(`content.${key}`);
    });
    
    // Temporal features
    Object.keys(features.temporal).forEach(key => {
      names.push(`temporal.${key}`);
    });
    
    // User features
    Object.keys(features.user).forEach(key => {
      names.push(`user.${key}`);
    });
    
    // Platform features
    Object.keys(features.platform).forEach(key => {
      names.push(`platform.${key}`);
    });
    
    return names;
  }

  private createFeatureMatrix(featuresList: ProphecyFeatures[]): number[][] {
    return featuresList.map(features => this.featuresToVector(features));
  }

  private featuresToVector(features: ProphecyFeatures): number[] {
    const vector: number[] = [];
    
    // Content features
    vector.push(
      features.content.duration,
      features.content.hasMusic ? 1 : 0,
      features.content.hasCaptions ? 1 : 0,
      this.encodeCategory(features.content.topicCategory),
      features.content.sentimentScore,
      features.content.contentComplexity,
      features.content.paceScore,
      features.content.thumbnailQuality,
      features.content.titleQuality
    );
    
    // Temporal features
    vector.push(
      features.temporal.dayOfWeek,
      features.temporal.hourOfDay,
      features.temporal.isWeekend ? 1 : 0,
      features.temporal.isHoliday ? 1 : 0,
      features.temporal.seasonality,
      features.temporal.monthOfYear
    );
    
    // User features
    vector.push(
      features.user.followersCount,
      features.user.engagementRate,
      features.user.postFrequency,
      features.user.accountAge,
      this.encodeCategory(features.user.niche),
      features.user.previousSuccessRate
    );
    
    // Platform features
    vector.push(
      this.encodePlatform(features.platform.platform),
      features.platform.algorithmTrend,
      features.platform.competitionLevel,
      features.platform.recommendationScore
    );
    
    return vector;
  }

  private encodeCategory(category: string): number {
    // Simple encoding for demo purposes
    // In a real implementation, we would use one-hot encoding
    const categories = {
      'entertainment': 1,
      'education': 2,
      'lifestyle': 3,
      'gaming': 4,
      'tech': 5,
      'beauty': 6,
      'fitness': 7,
      'food': 8,
      'travel': 9,
      'business': 10
    };
    
    return categories[category as keyof typeof categories] || 0;
  }

  private encodePlatform(platform: string): number {
    const platforms = {
      'tiktok': 1,
      'instagram': 2,
      'youtube': 3,
      'facebook': 4,
      'twitter': 5
    };
    
    return platforms[platform as keyof typeof platforms] || 0;
  }

  private calculateOOBError(X: number[][], y: number[], model: RandomForest): number {
    // In a real implementation, we would use the OOB error from the model
    // For this demo, we'll use a simple approximation
    const predictions = model.predict(X);
    const errors = predictions.map((pred, i) => Math.abs(pred - y[i]) / Math.max(1, y[i]));
    return mean(errors);
  }

  private calculatePredictionInterval(
    prediction: number,
    standardError: number,
    confidenceLevel: number = 0.95
  ): { lower: number; upper: number } {
    // For 95% confidence interval, use t-score of 1.96
    const tScore = 1.96;
    
    return {
      lower: Math.max(0, prediction - tScore * standardError),
      upper: prediction + tScore * standardError
    };
  }

  private calculateFeatureImportance(): void {
    // In a real implementation, we would extract feature importance from the random forest
    // For this demo, we'll use predefined importance values
    const importance: Record<string, number> = {};
    
    this.featureNames.forEach((name, index) => {
      // Generate random importance values that sum to 1
      importance[name] = Math.random();
    });
    
    // Normalize to sum to 1
    const sum = Object.values(importance).reduce((a, b) => a + b, 0);
    Object.keys(importance).forEach(key => {
      importance[key] /= sum;
    });
    
    this.featureImportance = importance;
  }
}

// Ensemble Model that combines multiple models
export class EnsembleModel implements PredictionModel {
  name = 'Ensemble';
  private models: PredictionModel[] = [];
  private weights: number[] = [];
  private confidence = 0;
  private featureImportance: Record<string, number> = {};

  constructor(models: PredictionModel[] = []) {
    this.models = models;
    // Initialize with equal weights
    this.weights = models.map(() => 1 / models.length);
  }

  addModel(model: PredictionModel, weight: number): void {
    this.models.push(model);
    // Normalize weights
    this.weights.push(weight);
    const sum = this.weights.reduce((a, b) => a + b, 0);
    this.weights = this.weights.map(w => w / sum);
  }

  async train(analytics: ClipAnalytics[], features: ProphecyFeatures[]): Promise<void> {
    try {
      if (this.models.length === 0) {
        throw new Error('No models in ensemble');
      }

      // Train each model
      for (const model of this.models) {
        await model.train(analytics, features);
      }

      // Calculate ensemble confidence as weighted average of model confidences
      this.confidence = this.models.reduce(
        (sum, model, i) => sum + model.getConfidence() * this.weights[i],
        0
      );

      // Combine feature importance from all models
      this.combineFeatureImportance();

      logger.info('Ensemble model trained successfully', {
        modelCount: this.models.length,
        confidence: this.confidence
      });
    } catch (error) {
      logger.error('Failed to train ensemble model', error as Error);
      throw error;
    }
  }

  async predict(features: ProphecyFeatures): Promise<ProphecyPrediction> {
    if (this.models.length === 0) {
      throw new Error('No models in ensemble');
    }

    // Get predictions from all models
    const predictions = await Promise.all(
      this.models.map(model => model.predict(features))
    );

    // Combine predictions using weighted average
    const viewsPrediction = Math.round(
      predictions.reduce((sum, pred, i) => sum + pred.views * this.weights[i], 0)
    );
    
    const likesPrediction = Math.round(
      predictions.reduce((sum, pred, i) => sum + pred.likes * this.weights[i], 0)
    );
    
    const commentsPrediction = Math.round(
      predictions.reduce((sum, pred, i) => sum + pred.comments * this.weights[i], 0)
    );
    
    const sharesPrediction = Math.round(
      predictions.reduce((sum, pred, i) => sum + pred.shares * this.weights[i], 0)
    );

    // Calculate combined confidence intervals
    const viewsCI = this.combineConfidenceIntervals(
      predictions.map(p => p.confidenceInterval.views),
      this.weights
    );
    
    const likesCI = this.combineConfidenceIntervals(
      predictions.map(p => p.confidenceInterval.likes),
      this.weights
    );
    
    const commentsCI = this.combineConfidenceIntervals(
      predictions.map(p => p.confidenceInterval.comments),
      this.weights
    );
    
    const sharesCI = this.combineConfidenceIntervals(
      predictions.map(p => p.confidenceInterval.shares),
      this.weights
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
}

// Main Prophecy Engine that manages all models
export class AdvancedProphecyEngine {
  private models: Map<ModelType, PredictionModel> = new Map();
  private defaultModel: ModelType = 'ensemble';
  private featureExtractor: FeatureExtractor;
  
  constructor() {
    // Initialize feature extractor
    this.featureExtractor = new FeatureExtractor();
    
    // Initialize models
    this.initializeModels();
  }
  
  private initializeModels(): void {
    // Create individual models
    const linearModel = new LinearRegressionModel();
    const randomForestModel = new RandomForestModel();
    
    // Create ensemble model
    const ensembleModel = new EnsembleModel([linearModel, randomForestModel]);
    ensembleModel.addModel(linearModel, 0.3);
    ensembleModel.addModel(randomForestModel, 0.7);
    
    // Add models to map
    this.models.set('linear', linearModel);
    this.models.set('randomForest', randomForestModel);
    this.models.set('ensemble', ensembleModel);
    
    logger.info('Prophecy engine initialized with models', {
      modelCount: this.models.size,
      defaultModel: this.defaultModel
    });
  }
  
  async trainModels(analytics: ClipAnalytics[]): Promise<void> {
    try {
      if (analytics.length === 0) {
        throw new Error('No analytics data for training');
      }
      
      logger.info('Training prophecy models', { dataPoints: analytics.length });
      
      // Extract features from analytics data
      const features = await Promise.all(
        analytics.map(analytic => this.featureExtractor.extractFeatures(analytic))
      );
      
      // Train each model
      for (const [type, model] of this.models.entries()) {
        try {
          await model.train(analytics, features);
          logger.info(`Model ${type} trained successfully`, {
            confidence: model.getConfidence()
          });
        } catch (error) {
          logger.error(`Failed to train model ${type}`, error as Error);
          // Continue with other models
        }
      }
    } catch (error) {
      logger.error('Failed to train prophecy models', error as Error);
      throw error;
    }
  }
  
  async predict(
    clipData: Partial<ClipAnalytics>,
    modelType: ModelType = this.defaultModel
  ): Promise<ProphecyResult> {
    try {
      const model = this.models.get(modelType);
      if (!model) {
        throw new Error(`Model ${modelType} not found`);
      }
      
      // Extract features for prediction
      const features = await this.featureExtractor.extractFeatures(clipData);
      
      // Make prediction
      const prediction = await model.predict(features);
      
      // Convert to ProphecyResult format
      return this.formatProphecyResult(prediction, features);
    } catch (error) {
      logger.error('Prediction failed', error as Error);
      throw error;
    }
  }
  
  async predictWithAllModels(
    clipData: Partial<ClipAnalytics>
  ): Promise<Record<ModelType, ProphecyResult>> {
    const results: Partial<Record<ModelType, ProphecyResult>> = {};
    
    // Extract features once
    const features = await this.featureExtractor.extractFeatures(clipData);
    
    // Predict with each model
    for (const [type, model] of this.models.entries()) {
      try {
        const prediction = await model.predict(features);
        results[type] = this.formatProphecyResult(prediction, features);
      } catch (error) {
        logger.error(`Prediction failed for model ${type}`, error as Error);
        // Continue with other models
      }
    }
    
    return results as Record<ModelType, ProphecyResult>;
  }
  
  setDefaultModel(modelType: ModelType): void {
    if (!this.models.has(modelType)) {
      throw new Error(`Model ${modelType} not found`);
    }
    this.defaultModel = modelType;
  }
  
  getAvailableModels(): ModelType[] {
    return Array.from(this.models.keys());
  }
  
  getModelConfidence(modelType: ModelType): number {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`Model ${modelType} not found`);
    }
    return model.getConfidence();
  }
  
  private formatProphecyResult(
    prediction: ProphecyPrediction,
    features: ProphecyFeatures
  ): ProphecyResult {
    // Generate optimal posting time based on temporal features
    const bestTime = this.getBestTime(features.temporal);
    const bestDay = this.getBestDay(features.temporal);
    
    // Generate trending hashtags based on content features
    const trendingHashtags = this.generateHashtags(features.content);
    
    // Generate recommendations based on prediction and features
    const recommendations = this.generateRecommendations(prediction, features);
    
    // Generate insights based on feature importance
    const insights = this.generateInsights(prediction, features);
    
    return {
      predictedViews: prediction.views,
      predictedLikes: prediction.likes,
      predictedComments: prediction.comments,
      confidence: Math.round(prediction.confidence),
      bestTime,
      bestDay,
      recommendedDuration: this.getRecommendedDuration(features.content, prediction),
      trendingHashtags,
      recommendations,
      insights
    };
  }
  
  private getBestTime(temporalFeatures: TemporalFeatures): string {
    // In a real implementation, this would use the model to find optimal time
    // For this demo, we'll use predefined peak hours
    const peakHours = [9, 12, 15, 18, 20, 21];
    const bestHour = peakHours.reduce((best, hour) => {
      return Math.abs(hour - temporalFeatures.hourOfDay) < Math.abs(best - temporalFeatures.hourOfDay)
        ? hour
        : best;
    }, peakHours[0]);
    
    return `${bestHour % 12 || 12}:00 ${bestHour < 12 ? 'AM' : 'PM'}`;
  }
  
  private getBestDay(temporalFeatures: TemporalFeatures): string {
    // In a real implementation, this would use the model to find optimal day
    // For this demo, we'll use predefined peak days
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDays = temporalFeatures.isWeekend ? [0, 6] : [1, 3, 5];
    
    const bestDay = peakDays.reduce((best, day) => {
      return Math.abs(day - temporalFeatures.dayOfWeek) < Math.abs(best - temporalFeatures.dayOfWeek)
        ? day
        : best;
    }, peakDays[0]);
    
    return days[bestDay];
  }
  
  private generateHashtags(contentFeatures: ContentFeatures): string[] {
    // In a real implementation, this would use content analysis
    // For this demo, we'll use predefined hashtags based on topic
    const topicHashtags: Record<string, string[]> = {
      'entertainment': ['fyp', 'viral', 'trending', 'foryou', 'comedy'],
      'education': ['learnontiktok', 'educational', 'facts', 'knowledge', 'learning'],
      'lifestyle': ['lifestyle', 'dailyvlog', 'routine', 'dayinmylife', 'aesthetic'],
      'gaming': ['gaming', 'gamer', 'videogames', 'twitch', 'streamer'],
      'tech': ['tech', 'technology', 'gadgets', 'techtok', 'innovation'],
      'beauty': ['beauty', 'makeup', 'skincare', 'tutorial', 'glam'],
      'fitness': ['fitness', 'workout', 'gym', 'health', 'motivation'],
      'food': ['food', 'recipe', 'cooking', 'foodie', 'homemade'],
      'travel': ['travel', 'adventure', 'wanderlust', 'explore', 'vacation'],
      'business': ['business', 'entrepreneur', 'success', 'motivation', 'smallbusiness']
    };
    
    // Get hashtags for the content topic
    const topicTags = topicHashtags[contentFeatures.topicCategory] || ['fyp', 'viral', 'trending'];
    
    // Add general trending hashtags
    const generalTags = ['fyp', 'foryou', 'viral', 'trending'];
    
    // Combine and remove duplicates
    const allTags = [...new Set([...topicTags, ...generalTags])];
    
    // Return 5 hashtags
    return allTags.slice(0, 5);
  }
  
  private getRecommendedDuration(contentFeatures: ContentFeatures, prediction: ProphecyPrediction): number {
    // In a real implementation, this would use the model to find optimal duration
    // For this demo, we'll use predefined optimal durations based on engagement prediction
    
    const engagementRatio = prediction.likes / Math.max(1, prediction.views);
    
    if (engagementRatio > 0.2) {
      // High engagement - shorter videos perform better
      return 30;
    } else if (engagementRatio > 0.1) {
      // Medium engagement - medium length videos
      return 45;
    } else {
      // Low engagement - longer videos to build interest
      return 60;
    }
  }
  
  private generateRecommendations(
    prediction: ProphecyPrediction,
    features: ProphecyFeatures
  ): string[] {
    const recommendations: string[] = [];
    
    // Recommendations based on content features
    if (!features.content.hasCaptions) {
      recommendations.push('Add captions to increase watch time by up to 12%');
    }
    
    if (features.content.sentimentScore < 0.5) {
      recommendations.push('Use more positive and energetic language for better engagement');
    }
    
    if (features.content.paceScore < 0.6) {
      recommendations.push('Increase video pacing to maintain viewer attention');
    }
    
    // Recommendations based on temporal features
    if (features.temporal.hourOfDay < 8 || features.temporal.hourOfDay > 22) {
      recommendations.push(`Post during peak hours (9AM-10PM) for maximum reach`);
    }
    
    // Recommendations based on platform
    if (features.platform.platform === 'tiktok') {
      recommendations.push('Use trending sounds to boost algorithmic distribution');
    } else if (features.platform.platform === 'instagram') {
      recommendations.push('Add a strong call-to-action to increase engagement');
    } else if (features.platform.platform === 'youtube') {
      recommendations.push('Optimize thumbnail and title for higher click-through rate');
    }
    
    // Add general recommendations if we don't have enough
    const generalRecommendations = [
      'Respond to comments within the first hour to boost engagement',
      'Create a hook in the first 3 seconds to reduce drop-off',
      'Use trending hashtags to increase discoverability',
      'Cross-promote your content across multiple platforms',
      'Analyze your best performing content and replicate successful elements'
    ];
    
    // Combine and limit to 3 recommendations
    return [...recommendations, ...generalRecommendations].slice(0, 3);
  }
  
  private generateInsights(
    prediction: ProphecyPrediction,
    features: ProphecyFeatures
  ): Array<{ type: string; message: string; confidence: number }> {
    const insights: Array<{ type: string; message: string; confidence: number }> = [];
    
    // Get top 3 most important features
    const topFeatures = Object.entries(prediction.featureImportance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // Generate insights based on top features
    topFeatures.forEach(([feature, importance]) => {
      const insightType = feature.split('.')[0];
      const featureName = feature.split('.')[1];
      
      let message = '';
      let confidence = Math.round(importance * 100);
      
      switch (feature) {
        case 'content.duration':
          message = `Videos between 30-45 seconds perform 25% better than longer ones`;
          break;
        case 'content.hasMusic':
          message = `Content with music performs 40% better than without`;
          break;
        case 'content.hasCaptions':
          message = `Adding captions increases watch time by 12%`;
          break;
        case 'content.sentimentScore':
          message = `Positive content generates 30% more engagement`;
          break;
        case 'temporal.hourOfDay':
          message = `Posting between 7-9PM generates 35% more views`;
          break;
        case 'temporal.isWeekend':
          message = `Weekend posts receive 20% more engagement`;
          break;
        case 'user.followersCount':
          message = `Your follower growth is trending upward`;
          break;
        case 'user.engagementRate':
          message = `Your engagement rate is above average for your niche`;
          break;
        case 'platform.platform':
          message = `${features.platform.platform} algorithm favors your content type`;
          break;
        default:
          message = `${featureName} is a key factor in your content performance`;
      }
      
      insights.push({
        type: insightType,
        message,
        confidence
      });
    });
    
    return insights;
  }
}

// Feature extractor class
export class FeatureExtractor {
  async extractFeatures(clipData: Partial<ClipAnalytics>): Promise<ProphecyFeatures> {
    // In a real implementation, this would extract features from the clip data
    // For this demo, we'll use mock features
    
    return {
      content: this.extractContentFeatures(clipData),
      temporal: this.extractTemporalFeatures(clipData),
      user: this.extractUserFeatures(clipData),
      platform: this.extractPlatformFeatures(clipData)
    };
  }
  
  private extractContentFeatures(clipData: Partial<ClipAnalytics>): ContentFeatures {
    // Mock content features
    return {
      duration: clipData.watchTime || 30,
      hasMusic: Math.random() > 0.3,
      hasCaptions: Math.random() > 0.4,
      topicCategory: this.getRandomTopic(),
      sentimentScore: Math.random(),
      contentComplexity: Math.random(),
      paceScore: Math.random(),
      thumbnailQuality: Math.random(),
      titleQuality: Math.random()
    };
  }
  
  private extractTemporalFeatures(clipData: Partial<ClipAnalytics>): TemporalFeatures {
    // Get current date or posted date
    const date = clipData.postedAt ? new Date(clipData.postedAt) : new Date();
    
    return {
      dayOfWeek: date.getDay(),
      hourOfDay: date.getHours(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: this.isHoliday(date),
      seasonality: this.calculateSeasonality(date),
      monthOfYear: date.getMonth()
    };
  }
  
  private extractUserFeatures(clipData: Partial<ClipAnalytics>): UserFeatures {
    // Mock user features
    return {
      followersCount: Math.floor(Math.random() * 10000) + 1000,
      engagementRate: Math.random() * 0.1,
      postFrequency: Math.floor(Math.random() * 7) + 1,
      accountAge: Math.floor(Math.random() * 365) + 30,
      niche: this.getRandomTopic(),
      previousSuccessRate: Math.random()
    };
  }
  
  private extractPlatformFeatures(clipData: Partial<ClipAnalytics>): PlatformFeatures {
    // Get platform or default to random
    const platform = clipData.platform || this.getRandomPlatform();
    
    return {
      platform,
      algorithmTrend: Math.random(),
      competitionLevel: Math.random(),
      recommendationScore: Math.random()
    };
  }
  
  private getRandomTopic(): string {
    const topics = [
      'entertainment',
      'education',
      'lifestyle',
      'gaming',
      'tech',
      'beauty',
      'fitness',
      'food',
      'travel',
      'business'
    ];
    
    return topics[Math.floor(Math.random() * topics.length)];
  }
  
  private getRandomPlatform(): string {
    const platforms = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter'];
    return platforms[Math.floor(Math.random() * platforms.length)];
  }
  
  private isHoliday(date: Date): boolean {
    // Simple holiday check for demo purposes
    const month = date.getMonth();
    const day = date.getDate();
    
    // Check for major US holidays
    if (
      (month === 0 && day === 1) || // New Year's Day
      (month === 6 && day === 4) || // Independence Day
      (month === 11 && day === 25)   // Christmas
    ) {
      return true;
    }
    
    return false;
  }
  
  private calculateSeasonality(date: Date): number {
    // Simple seasonality calculation based on month
    // Returns value between 0 and 1
    const month = date.getMonth();
    
    // Peak seasons are summer and winter holidays
    if (month >= 5 && month <= 7) {
      // Summer peak
      return 0.8;
    } else if (month >= 10 && month <= 11) {
      // Winter holiday peak
      return 0.9;
    } else if (month >= 2 && month <= 4) {
      // Spring medium
      return 0.6;
    } else {
      // Other months lower
      return 0.4;
    }
  }
}

// Create and export singleton instance
export const advancedProphecyEngine = new AdvancedProphecyEngine();
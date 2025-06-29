import { supabase } from '../supabase';
import { ClipAnalytics, ProphecyResult, ModelType } from '../../types';
import { logger } from '../logger';
import { FeatureExtractor } from './AdvancedProphecyEngine';

export interface DataSource {
  name: string;
  fetchData: (userId: string, limit?: number) => Promise<ClipAnalytics[]>;
  isAvailable: () => Promise<boolean>;
}

export class DataIntegrationPipeline {
  private dataSources: DataSource[] = [];
  private featureExtractor: FeatureExtractor;
  private cache: Map<string, { data: ClipAnalytics[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.featureExtractor = new FeatureExtractor();
    this.initializeDataSources();
  }

  private initializeDataSources() {
    // Internal database source
    this.dataSources.push({
      name: 'internal',
      fetchData: async (userId: string, limit = 100) => {
        try {
          const { data, error } = await supabase
            .from('analytics_events')
            .select('*')
            .eq('user_id', userId)
            .order('posted_at', { ascending: false })
            .limit(limit);

          if (error) throw error;
          return data || [];
        } catch (error) {
          logger.error('Failed to fetch internal analytics data', error as Error);
          return [];
        }
      },
      isAvailable: async () => {
        try {
          const { data, error } = await supabase
            .from('analytics_events')
            .select('id')
            .limit(1);
          
          return !error && !!data;
        } catch (error) {
          return false;
        }
      }
    });

    // TikTok data source (simulated)
    this.dataSources.push({
      name: 'tiktok',
      fetchData: async (userId: string, limit = 50) => {
        try {
          // In a real implementation, this would call the TikTok API
          // For now, we'll simulate with a delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if we have user-platform mapping
          const { data: platformData, error: platformError } = await supabase
            .from('user_platform_connections')
            .select('platform_user_id, access_token')
            .eq('user_id', userId)
            .eq('platform', 'tiktok')
            .single();
          
          if (platformError || !platformData) {
            return [];
          }
          
          // Simulate TikTok data
          return this.generateMockPlatformData(userId, 'tiktok', limit);
        } catch (error) {
          logger.error('Failed to fetch TikTok analytics data', error as Error);
          return [];
        }
      },
      isAvailable: async () => {
        // Check if TikTok API is configured
        return false; // Simulated as unavailable for now
      }
    });

    // Instagram data source (simulated)
    this.dataSources.push({
      name: 'instagram',
      fetchData: async (userId: string, limit = 50) => {
        try {
          // In a real implementation, this would call the Instagram API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if we have user-platform mapping
          const { data: platformData, error: platformError } = await supabase
            .from('user_platform_connections')
            .select('platform_user_id, access_token')
            .eq('user_id', userId)
            .eq('platform', 'instagram')
            .single();
          
          if (platformError || !platformData) {
            return [];
          }
          
          // Simulate Instagram data
          return this.generateMockPlatformData(userId, 'instagram', limit);
        } catch (error) {
          logger.error('Failed to fetch Instagram analytics data', error as Error);
          return [];
        }
      },
      isAvailable: async () => {
        // Check if Instagram API is configured
        return false; // Simulated as unavailable for now
      }
    });
  }

  // Get available data sources
  async getAvailableDataSources(): Promise<string[]> {
    const availableSources: string[] = [];
    
    for (const source of this.dataSources) {
      if (await source.isAvailable()) {
        availableSources.push(source.name);
      }
    }
    
    return availableSources;
  }

  // Fetch data from all available sources
  async fetchAllData(userId: string, useCache = true): Promise<ClipAnalytics[]> {
    const cacheKey = `analytics_${userId}`;
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        logger.debug('Using cached analytics data', { userId });
        return cached.data;
      }
    }
    
    logger.info('Fetching analytics data from all sources', { userId });
    
    const allData: ClipAnalytics[] = [];
    const availableSources = await this.getAvailableDataSources();
    
    // Fetch from each available source
    for (const source of this.dataSources) {
      if (availableSources.includes(source.name)) {
        const sourceData = await source.fetchData(userId);
        allData.push(...sourceData);
        
        logger.info(`Fetched ${sourceData.length} records from ${source.name}`, { userId });
      }
    }
    
    // Sort by posted date (newest first)
    const sortedData = allData.sort((a, b) => 
      new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
    
    // Cache the results
    this.cache.set(cacheKey, {
      data: sortedData,
      timestamp: Date.now()
    });
    
    return sortedData;
  }

  // Extract features from analytics data
  async extractFeaturesFromAnalytics(analytics: ClipAnalytics[]): Promise<any[]> {
    logger.info('Extracting features from analytics data', { count: analytics.length });
    
    const features = [];
    
    for (const analytic of analytics) {
      try {
        const extractedFeatures = await this.featureExtractor.extractFeatures(analytic);
        features.push(extractedFeatures);
      } catch (error) {
        logger.error('Failed to extract features for analytic', error as Error, {
          analyticId: analytic.id
        });
        // Continue with other analytics
      }
    }
    
    return features;
  }

  // Store prediction results
  async storePredictionResult(
    userId: string,
    clipId: string | undefined,
    prediction: ProphecyResult,
    modelType: ModelType,
    features: any
  ): Promise<string> {
    try {
      logger.info('Storing prediction result', { userId, clipId, modelType });
      
      const { data, error } = await supabase
        .from('prophecy_history')
        .insert({
          user_id: userId,
          clip_id: clipId,
          predicted_views: prediction.predictedViews,
          predicted_likes: prediction.predictedLikes,
          predicted_comments: prediction.predictedComments,
          predicted_shares: 0, // Not currently predicted
          confidence: prediction.confidence,
          model_type: modelType,
          model_version: '1.0',
          features: features,
          recommendations: prediction.recommendations,
          insights: prediction.insights
        })
        .select()
        .single();
      
      if (error) throw error;
      
      logger.info('Prediction stored successfully', { prophecyId: data.id });
      return data.id;
    } catch (error) {
      logger.error('Failed to store prediction', error as Error);
      throw error;
    }
  }

  // Store actual results for a prediction
  async storeActualResults(
    prophecyId: string,
    actualData: {
      views: number;
      likes: number;
      comments: number;
      shares?: number;
    },
    platform: string
  ): Promise<void> {
    try {
      logger.info('Storing actual results', { prophecyId });
      
      // Get the original prediction
      const { data: prophecy, error: prophecyError } = await supabase
        .from('prophecy_history')
        .select('predicted_views, predicted_likes, predicted_comments')
        .eq('id', prophecyId)
        .single();
      
      if (prophecyError) throw prophecyError;
      
      // Calculate accuracy score
      const accuracyScore = this.calculateAccuracy(
        prophecy.predicted_views,
        prophecy.predicted_likes,
        prophecy.predicted_comments,
        actualData.views,
        actualData.likes,
        actualData.comments
      );
      
      // Store results
      const { error } = await supabase
        .from('prophecy_results')
        .insert({
          prophecy_id: prophecyId,
          actual_views: actualData.views,
          actual_likes: actualData.likes,
          actual_comments: actualData.comments,
          actual_shares: actualData.shares || 0,
          accuracy_score: accuracyScore,
          platform
        });
      
      if (error) throw error;
      
      logger.info('Actual results stored successfully', { 
        prophecyId, 
        accuracyScore 
      });
    } catch (error) {
      logger.error('Failed to store actual results', error as Error);
      throw error;
    }
  }

  // Calculate accuracy score
  private calculateAccuracy(
    predictedViews: number,
    predictedLikes: number,
    predictedComments: number,
    actualViews: number,
    actualLikes: number,
    actualComments: number
  ): number {
    // Calculate accuracy for each metric (1 - relative error)
    const viewsAccuracy = predictedViews === 0 ? 0 : 
      Math.max(0, 1 - Math.abs(actualViews - predictedViews) / predictedViews);
    
    const likesAccuracy = predictedLikes === 0 ? 0 : 
      Math.max(0, 1 - Math.abs(actualLikes - predictedLikes) / predictedLikes);
    
    const commentsAccuracy = predictedComments === 0 ? 0 : 
      Math.max(0, 1 - Math.abs(actualComments - predictedComments) / predictedComments);
    
    // Weighted average (views 40%, likes 40%, comments 20%)
    return (viewsAccuracy * 0.4 + likesAccuracy * 0.4 + commentsAccuracy * 0.2) * 100;
  }

  // Generate mock platform data for simulation
  private generateMockPlatformData(userId: string, platform: string, count: number): ClipAnalytics[] {
    const data: ClipAnalytics[] = [];
    
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const views = Math.floor(Math.random() * 10000) + 500;
      const likes = Math.floor(views * (Math.random() * 0.1 + 0.05));
      const comments = Math.floor(likes * (Math.random() * 0.2 + 0.1));
      const shares = Math.floor(likes * (Math.random() * 0.3 + 0.05));
      
      data.push({
        id: `mock-${platform}-${i}`,
        clipId: `clip-${i}`,
        userId,
        platform,
        views,
        likes,
        comments,
        shares,
        watchTime: Math.random() * 60 + 10,
        postedAt: date.toISOString(),
        updatedAt: date.toISOString()
      });
    }
    
    return data;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    logger.debug('Data integration pipeline cache cleared');
  }
}

// Export singleton instance
export const dataIntegrationPipeline = new DataIntegrationPipeline();
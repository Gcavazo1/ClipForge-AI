import { ClipAnalytics } from '../../types';
import { ProphecyFeatures, ContentFeatures, TemporalFeatures, UserFeatures, PlatformFeatures } from './AdvancedProphecyEngine';
import { logger } from '../logger';

export class AdvancedFeatureEngineering {
  // Extract advanced features from analytics data
  async extractAdvancedFeatures(analytics: ClipAnalytics[]): Promise<ProphecyFeatures[]> {
    try {
      logger.info('Extracting advanced features', { dataPoints: analytics.length });
      
      return Promise.all(analytics.map(analytic => this.processAnalytic(analytic)));
    } catch (error) {
      logger.error('Failed to extract advanced features', error as Error);
      throw error;
    }
  }
  
  // Process a single analytic to extract features
  private async processAnalytic(analytic: ClipAnalytics): Promise<ProphecyFeatures> {
    try {
      // Extract basic features
      const contentFeatures = await this.extractContentFeatures(analytic);
      const temporalFeatures = this.extractTemporalFeatures(analytic);
      const userFeatures = await this.extractUserFeatures(analytic);
      const platformFeatures = this.extractPlatformFeatures(analytic);
      
      // Create derived features
      const enhancedFeatures = this.createDerivedFeatures(
        contentFeatures,
        temporalFeatures,
        userFeatures,
        platformFeatures,
        analytic
      );
      
      return enhancedFeatures;
    } catch (error) {
      logger.error('Failed to process analytic', error as Error, { analyticId: analytic.id });
      
      // Return default features on error
      return this.createDefaultFeatures(analytic);
    }
  }
  
  // Extract content features with advanced analysis
  private async extractContentFeatures(analytic: ClipAnalytics): Promise<ContentFeatures> {
    // In a real implementation, this would analyze the content
    // For this demo, we'll use mock features with some randomness
    
    return {
      duration: analytic.watchTime || Math.random() * 60 + 15,
      hasMusic: Math.random() > 0.3,
      hasCaptions: Math.random() > 0.4,
      topicCategory: this.determineTopicCategory(analytic),
      sentimentScore: Math.random() * 0.5 + 0.5, // Bias toward positive
      contentComplexity: Math.random(),
      paceScore: Math.random() * 0.6 + 0.4, // Bias toward faster pace
      thumbnailQuality: Math.random() * 0.7 + 0.3, // Bias toward higher quality
      titleQuality: Math.random() * 0.7 + 0.3 // Bias toward higher quality
    };
  }
  
  // Extract temporal features with seasonality analysis
  private extractTemporalFeatures(analytic: ClipAnalytics): TemporalFeatures {
    // Get posted date or current date
    const date = analytic.postedAt ? new Date(analytic.postedAt) : new Date();
    
    return {
      dayOfWeek: date.getDay(),
      hourOfDay: date.getHours(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: this.isHoliday(date),
      seasonality: this.calculateSeasonality(date),
      monthOfYear: date.getMonth()
    };
  }
  
  // Extract user features with engagement analysis
  private async extractUserFeatures(analytic: ClipAnalytics): Promise<UserFeatures> {
    // In a real implementation, this would fetch user data
    // For this demo, we'll use mock features
    
    return {
      followersCount: Math.floor(Math.random() * 50000) + 1000,
      engagementRate: (analytic.likes + analytic.comments) / Math.max(1, analytic.views),
      postFrequency: Math.floor(Math.random() * 7) + 1,
      accountAge: Math.floor(Math.random() * 365) + 30,
      niche: this.determineTopicCategory(analytic),
      previousSuccessRate: Math.random() * 0.8 + 0.1
    };
  }
  
  // Extract platform features with algorithm analysis
  private extractPlatformFeatures(analytic: ClipAnalytics): PlatformFeatures {
    // Get platform or default to random
    const platform = analytic.platform || this.getRandomPlatform();
    
    // Platform-specific algorithm trends
    const algorithmTrend = this.getPlatformAlgorithmTrend(platform);
    
    return {
      platform,
      algorithmTrend,
      competitionLevel: this.calculateCompetitionLevel(platform, analytic),
      recommendationScore: Math.random() * 0.7 + 0.3 // Bias toward higher recommendation
    };
  }
  
  // Create derived features by combining basic features
  private createDerivedFeatures(
    content: ContentFeatures,
    temporal: TemporalFeatures,
    user: UserFeatures,
    platform: PlatformFeatures,
    analytic: ClipAnalytics
  ): ProphecyFeatures {
    // Calculate engagement potential
    const engagementPotential = this.calculateEngagementPotential(
      content, temporal, user, platform, analytic
    );
    
    // Calculate virality score
    const viralityScore = this.calculateViralityScore(
      content, temporal, user, platform, analytic
    );
    
    // Add derived metrics to content features
    const enhancedContent = {
      ...content,
      engagementPotential,
      viralityScore
    };
    
    // Add time-based metrics to temporal features
    const enhancedTemporal = {
      ...temporal,
      timeSinceLastPost: Math.floor(Math.random() * 48) + 1, // Hours
      optimalPostingWindow: this.calculateOptimalPostingWindow(temporal, platform)
    };
    
    // Add audience metrics to user features
    const enhancedUser = {
      ...user,
      audienceRetention: Math.random() * 0.6 + 0.4, // 40-100%
      audienceGrowthRate: Math.random() * 0.05 + 0.01 // 1-6%
    };
    
    // Add competition metrics to platform features
    const enhancedPlatform = {
      ...platform,
      trendAlignment: Math.random() * 0.8 + 0.2, // 20-100%
      hashtagEffectiveness: Math.random() * 0.7 + 0.3 // 30-100%
    };
    
    return {
      content: enhancedContent as ContentFeatures,
      temporal: enhancedTemporal as TemporalFeatures,
      user: enhancedUser as UserFeatures,
      platform: enhancedPlatform as PlatformFeatures
    };
  }
  
  // Calculate engagement potential based on all features
  private calculateEngagementPotential(
    content: ContentFeatures,
    temporal: TemporalFeatures,
    user: UserFeatures,
    platform: PlatformFeatures,
    analytic: ClipAnalytics
  ): number {
    // Weighted combination of factors that affect engagement
    const contentFactor = content.sentimentScore * 0.3 + 
                         (content.hasCaptions ? 0.2 : 0) + 
                         (content.hasMusic ? 0.1 : 0) + 
                         content.paceScore * 0.2;
    
    const temporalFactor = (temporal.isWeekend ? 0.2 : 0.1) + 
                          (this.isOptimalHour(temporal.hourOfDay) ? 0.2 : 0) + 
                          temporal.seasonality * 0.1;
    
    const userFactor = Math.min(1, user.engagementRate * 10) * 0.3 + 
                      Math.min(1, user.previousSuccessRate) * 0.2;
    
    const platformFactor = platform.algorithmTrend * 0.2 + 
                          (1 - platform.competitionLevel) * 0.1;
    
    // Combine factors with weights
    return contentFactor * 0.4 + temporalFactor * 0.2 + userFactor * 0.3 + platformFactor * 0.1;
  }
  
  // Calculate virality score based on all features
  private calculateViralityScore(
    content: ContentFeatures,
    temporal: TemporalFeatures,
    user: UserFeatures,
    platform: PlatformFeatures,
    analytic: ClipAnalytics
  ): number {
    // Factors that contribute to virality
    const contentVirality = content.sentimentScore * 0.2 + 
                           content.paceScore * 0.3 + 
                           (content.duration < 30 ? 0.2 : 0.1);
    
    const temporalVirality = temporal.seasonality * 0.2 + 
                            (temporal.isWeekend ? 0.1 : 0.05);
    
    const userVirality = Math.min(1, user.followersCount / 10000) * 0.2 + 
                        user.previousSuccessRate * 0.3;
    
    const platformVirality = platform.algorithmTrend * 0.3 + 
                            platform.recommendationScore * 0.2;
    
    // Combine factors with weights
    return contentVirality * 0.35 + temporalVirality * 0.15 + userVirality * 0.25 + platformVirality * 0.25;
  }
  
  // Calculate optimal posting window
  private calculateOptimalPostingWindow(
    temporal: TemporalFeatures,
    platform: PlatformFeatures
  ): { start: number; end: number } {
    // Platform-specific optimal hours
    const platformOptimalHours: Record<string, number[]> = {
      'tiktok': [9, 12, 15, 19, 21],
      'instagram': [11, 13, 19, 21, 22],
      'youtube': [15, 16, 17, 18, 20],
      'facebook': [13, 14, 15, 19, 20],
      'twitter': [9, 12, 17, 18, 21]
    };
    
    // Get optimal hours for the platform
    const optimalHours = platformOptimalHours[platform.platform] || [12, 18, 21];
    
    // Find closest optimal hour
    const currentHour = temporal.hourOfDay;
    const closestHour = optimalHours.reduce((closest, hour) => {
      return Math.abs(hour - currentHour) < Math.abs(closest - currentHour) ? hour : closest;
    }, optimalHours[0]);
    
    // Create a 2-hour window
    return {
      start: closestHour,
      end: closestHour + 2
    };
  }
  
  // Check if hour is optimal for posting
  private isOptimalHour(hour: number): boolean {
    // General optimal hours across platforms
    const optimalHours = [9, 12, 15, 18, 21];
    return optimalHours.includes(hour);
  }
  
  // Determine topic category from analytics
  private determineTopicCategory(analytic: ClipAnalytics): string {
    // In a real implementation, this would analyze content
    // For this demo, we'll randomly select a category
    const categories = [
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
    
    return categories[Math.floor(Math.random() * categories.length)];
  }
  
  // Get random platform
  private getRandomPlatform(): string {
    const platforms = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter'];
    return platforms[Math.floor(Math.random() * platforms.length)];
  }
  
  // Check if date is a holiday
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
  
  // Calculate seasonality based on date
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
  
  // Get platform-specific algorithm trend
  private getPlatformAlgorithmTrend(platform: string): number {
    // Platform-specific algorithm trends
    // Higher values indicate the algorithm is currently favoring this type of content
    const trends: Record<string, number> = {
      'tiktok': 0.85,
      'instagram': 0.75,
      'youtube': 0.7,
      'facebook': 0.6,
      'twitter': 0.65
    };
    
    return trends[platform] || 0.7;
  }
  
  // Calculate competition level for a platform
  private calculateCompetitionLevel(platform: string, analytic: ClipAnalytics): number {
    // Platform-specific competition levels
    // Higher values indicate more competition
    const baseCompetition: Record<string, number> = {
      'tiktok': 0.8,
      'instagram': 0.75,
      'youtube': 0.85,
      'facebook': 0.6,
      'twitter': 0.7
    };
    
    // Adjust based on engagement
    const engagementRate = (analytic.likes + analytic.comments) / Math.max(1, analytic.views);
    const competitionAdjustment = Math.max(0, 0.2 - engagementRate);
    
    return Math.min(1, Math.max(0, baseCompetition[platform] || 0.7) + competitionAdjustment);
  }
  
  // Create default features when extraction fails
  private createDefaultFeatures(analytic: ClipAnalytics): ProphecyFeatures {
    return {
      content: {
        duration: 30,
        hasMusic: true,
        hasCaptions: true,
        topicCategory: 'entertainment',
        sentimentScore: 0.7,
        contentComplexity: 0.5,
        paceScore: 0.6,
        thumbnailQuality: 0.7,
        titleQuality: 0.7
      },
      temporal: {
        dayOfWeek: new Date().getDay(),
        hourOfDay: new Date().getHours(),
        isWeekend: [0, 6].includes(new Date().getDay()),
        isHoliday: false,
        seasonality: 0.5,
        monthOfYear: new Date().getMonth()
      },
      user: {
        followersCount: 5000,
        engagementRate: 0.05,
        postFrequency: 3,
        accountAge: 180,
        niche: 'entertainment',
        previousSuccessRate: 0.6
      },
      platform: {
        platform: analytic.platform || 'tiktok',
        algorithmTrend: 0.7,
        competitionLevel: 0.7,
        recommendationScore: 0.6
      }
    };
  }
}

// Export singleton instance
export const advancedFeatureEngineering = new AdvancedFeatureEngineering();
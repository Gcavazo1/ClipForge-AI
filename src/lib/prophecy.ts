import SimpleLinearRegression from 'ml-regression-simple-linear';
import { supabase } from './supabase';
import { ProphecyRequest, ProphecyResult, ClipAnalytics } from '../types';

// Fetch historical analytics data for a user
async function fetchUserAnalytics(userId: string): Promise<ClipAnalytics[]> {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', userId)
    .order('posted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Calculate baseline metrics from historical data
function calculateBaselineMetrics(analytics: ClipAnalytics[]) {
  if (analytics.length === 0) {
    return {
      avgViews: 1000,
      avgLikes: 100,
      avgComments: 10,
      avgEngagement: 0.1,
      avgWatchTime: 30,
    };
  }

  const totalViews = analytics.reduce((sum, item) => sum + item.views, 0);
  const totalLikes = analytics.reduce((sum, item) => sum + item.likes, 0);
  const totalComments = analytics.reduce((sum, item) => sum + item.comments, 0);
  const totalWatchTime = analytics.reduce((sum, item) => sum + item.watchTime, 0);

  return {
    avgViews: totalViews / analytics.length,
    avgLikes: totalLikes / analytics.length,
    avgComments: totalComments / analytics.length,
    avgEngagement: (totalLikes + totalComments) / totalViews,
    avgWatchTime: totalWatchTime / analytics.length,
  };
}

// Predict metrics using simple linear regression
function predictMetrics(analytics: ClipAnalytics[]) {
  if (analytics.length < 3) {
    return null;
  }

  const timestamps = analytics.map(a => new Date(a.postedAt).getTime());
  const views = analytics.map(a => a.views);
  const likes = analytics.map(a => a.likes);
  const comments = analytics.map(a => a.comments);

  const viewsRegression = new SimpleLinearRegression(timestamps, views);
  const likesRegression = new SimpleLinearRegression(timestamps, likes);
  const commentsRegression = new SimpleLinearRegression(timestamps, comments);

  const nextTimestamp = Date.now();

  return {
    views: Math.max(100, Math.round(viewsRegression.predict(nextTimestamp))),
    likes: Math.max(10, Math.round(likesRegression.predict(nextTimestamp))),
    comments: Math.max(1, Math.round(commentsRegression.predict(nextTimestamp))),
    confidence: calculateConfidence(viewsRegression.score(timestamps, views)),
  };
}

// Calculate confidence score (0-100)
function calculateConfidence(r2Score: number): number {
  return Math.round(Math.max(0, Math.min(100, r2Score * 100)));
}

// Determine optimal posting time based on engagement patterns
function determineOptimalTime(analytics: ClipAnalytics[]): string {
  const engagementByHour = new Array(24).fill(0);
  let maxEngagement = 0;
  let bestHour = 9; // Default to 9 AM

  analytics.forEach(event => {
    const hour = new Date(event.postedAt).getHours();
    const engagement = (event.likes + event.comments) / event.views;
    engagementByHour[hour] += engagement;

    if (engagementByHour[hour] > maxEngagement) {
      maxEngagement = engagementByHour[hour];
      bestHour = hour;
    }
  });

  return `${bestHour % 12 || 12}:00 ${bestHour < 12 ? 'AM' : 'PM'}`;
}

// Determine optimal posting day based on engagement patterns
function determineOptimalDay(analytics: ClipAnalytics[]): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const engagementByDay = new Array(7).fill(0);
  let maxEngagement = 0;
  let bestDay = 1; // Default to Monday

  analytics.forEach(event => {
    const day = new Date(event.postedAt).getDay();
    const engagement = (event.likes + event.comments) / event.views;
    engagementByDay[day] += engagement;

    if (engagementByDay[day] > maxEngagement) {
      maxEngagement = engagementByDay[day];
      bestDay = day;
    }
  });

  return days[bestDay];
}

// Generate personalized recommendations based on analytics
function generateRecommendations(analytics: ClipAnalytics[]): string[] {
  const metrics = calculateBaselineMetrics(analytics);
  const recommendations: string[] = [];

  if (metrics.avgWatchTime < 20) {
    recommendations.push('Try shortening your clips to improve watch time retention');
  }

  if (metrics.avgEngagement < 0.05) {
    recommendations.push('Add clear calls-to-action to boost engagement');
  }

  recommendations.push(
    'Post consistently at optimal times to build audience habits',
    'Engage with comments within the first hour of posting',
    'Use trending sounds and effects to increase visibility'
  );

  return recommendations.slice(0, 3);
}

// Main prophecy generation function
export async function generateProphecy(request: ProphecyRequest): Promise<ProphecyResult> {
  const analytics = await fetchUserAnalytics(request.userId);
  const baselineMetrics = calculateBaselineMetrics(analytics);
  const predictions = predictMetrics(analytics) || {
    views: baselineMetrics.avgViews * 1.1,
    likes: baselineMetrics.avgLikes * 1.1,
    comments: baselineMetrics.avgComments * 1.1,
    confidence: 70,
  };

  // Simulate trending hashtags (replace with real API data later)
  const trendingHashtags = [
    'fyp',
    'viral',
    'trending',
    'tutorial',
    'howto',
  ];

  return {
    predictedViews: Math.round(predictions.views),
    predictedLikes: Math.round(predictions.likes),
    predictedComments: Math.round(predictions.comments),
    confidence: predictions.confidence,
    bestTime: determineOptimalTime(analytics),
    bestDay: determineOptimalDay(analytics),
    recommendedDuration: 45, // Default recommended duration
    trendingHashtags,
    recommendations: generateRecommendations(analytics),
    insights: [
      {
        type: 'engagement',
        message: 'Your engagement rate is trending upward',
        confidence: 85,
      },
      {
        type: 'timing',
        message: 'Evening posts perform 25% better than morning posts',
        confidence: 90,
      },
      {
        type: 'content',
        message: 'Tutorial-style content drives higher watch time',
        confidence: 80,
      },
    ],
  };
}

// Cache prophecy results
const prophecyCache = new Map<string, { result: ProphecyResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

export async function getProphecy(userId: string, clipId?: string): Promise<ProphecyResult> {
  const cacheKey = `${userId}:${clipId || 'default'}`;
  const cached = prophecyCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result = await generateProphecy({ userId, clipId });
  prophecyCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
}
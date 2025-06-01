import { supabase } from './supabase';
import { UserFeedback, FeedbackSummary, ProphecyResult } from '../types';

// Submit user feedback
export async function submitFeedback(feedback: Omit<UserFeedback, 'id' | 'createdAt'>): Promise<UserFeedback> {
  const { data, error } = await supabase
    .from('user_feedback')
    .insert([{
      ...feedback,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get feedback summary for a user
export async function getFeedbackSummary(userId: string): Promise<FeedbackSummary> {
  const { data: feedbackData, error } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  if (!feedbackData?.length) {
    return {
      averageRating: 0,
      totalFeedback: 0,
      helpfulPercentage: 0,
      recommendationFollowRate: 0,
      accuracyTrend: []
    };
  }

  const totalRating = feedbackData.reduce((sum, item) => sum + item.rating, 0);
  const helpfulCount = feedbackData.filter(item => item.wasHelpful).length;
  const followedRecsCount = feedbackData.filter(item => item.metadata?.followedRecommendations).length;

  // Calculate accuracy trend
  const accuracyTrend = feedbackData.reduce((acc, feedback) => {
    const date = feedback.createdAt.split('T')[0];
    const accuracy = calculateAccuracy(feedback);
    
    const existingEntry = acc.find(entry => entry.date === date);
    if (existingEntry) {
      existingEntry.accuracy = (existingEntry.accuracy + accuracy) / 2;
    } else {
      acc.push({ date, accuracy });
    }
    
    return acc;
  }, [] as { date: string; accuracy: number }[]);

  return {
    averageRating: totalRating / feedbackData.length,
    totalFeedback: feedbackData.length,
    helpfulPercentage: (helpfulCount / feedbackData.length) * 100,
    recommendationFollowRate: (followedRecsCount / feedbackData.length) * 100,
    accuracyTrend: accuracyTrend.sort((a, b) => a.date.localeCompare(b.date))
  };
}

// Calculate prediction accuracy based on actual vs predicted metrics
function calculateAccuracy(feedback: UserFeedback): number {
  if (!feedback.metadata?.actualViews) return 0;

  const metrics = [
    {
      actual: feedback.metadata.actualViews,
      predicted: feedback.metadata.predictedViews,
      weight: 0.4
    },
    {
      actual: feedback.metadata.actualLikes,
      predicted: feedback.metadata.predictedLikes,
      weight: 0.3
    },
    {
      actual: feedback.metadata.actualComments,
      predicted: feedback.metadata.predictedComments,
      weight: 0.3
    }
  ];

  return metrics.reduce((acc, metric) => {
    if (!metric.actual || !metric.predicted) return acc;
    const accuracy = 1 - Math.abs(metric.actual - metric.predicted) / metric.predicted;
    return acc + (accuracy * metric.weight);
  }, 0) * 100;
}

// Update prediction parameters based on feedback
export async function updatePredictionModel(userId: string): Promise<void> {
  const { data: feedbackData, error } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  if (!feedbackData?.length) return;

  // Calculate adjustment factors based on recent feedback
  const adjustmentFactors = calculateAdjustmentFactors(feedbackData);

  // Store updated parameters
  await supabase
    .from('prediction_parameters')
    .upsert([{
      user_id: userId,
      adjustment_factors: adjustmentFactors,
      updated_at: new Date().toISOString()
    }]);
}

// Calculate model adjustment factors based on feedback
function calculateAdjustmentFactors(feedback: UserFeedback[]): Record<string, number> {
  const recentFeedback = feedback.slice(0, 20); // Focus on most recent feedback
  
  const factors = {
    viewMultiplier: 1.0,
    likeMultiplier: 1.0,
    commentMultiplier: 1.0,
    confidenceAdjustment: 0
  };

  if (recentFeedback.length === 0) return factors;

  // Calculate average accuracy for each metric
  const accuracies = recentFeedback.reduce((acc, item) => {
    if (!item.metadata) return acc;

    const { actualViews, actualLikes, actualComments } = item.metadata;
    const predicted = JSON.parse(item.prophecyId) as ProphecyResult;

    if (actualViews) {
      acc.views.push(actualViews / predicted.predictedViews);
    }
    if (actualLikes) {
      acc.likes.push(actualLikes / predicted.predictedLikes);
    }
    if (actualComments) {
      acc.comments.push(actualComments / predicted.predictedComments);
    }

    return acc;
  }, { views: [] as number[], likes: [] as number[], comments: [] as number[] });

  // Update multipliers based on average accuracies
  if (accuracies.views.length > 0) {
    factors.viewMultiplier = calculateAverageAdjustment(accuracies.views);
  }
  if (accuracies.likes.length > 0) {
    factors.likeMultiplier = calculateAverageAdjustment(accuracies.likes);
  }
  if (accuracies.comments.length > 0) {
    factors.commentMultiplier = calculateAverageAdjustment(accuracies.comments);
  }

  // Adjust confidence based on prediction accuracy
  const averageRating = recentFeedback.reduce((sum, item) => sum + item.rating, 0) / recentFeedback.length;
  factors.confidenceAdjustment = (averageRating - 3) * 5; // Scale adjustment based on ratings

  return factors;
}

// Helper function to calculate average adjustment factor
function calculateAverageAdjustment(ratios: number[]): number {
  const average = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  // Limit adjustment to prevent extreme changes
  return Math.max(0.5, Math.min(1.5, average));
}
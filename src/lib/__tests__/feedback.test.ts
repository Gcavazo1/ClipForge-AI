import { describe, it, expect, vi } from 'vitest';
import { submitFeedback, getFeedbackSummary, updatePredictionModel } from '../feedback';
import { supabase } from '../supabase';

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockFeedback }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockFeedbackList }))
          }))
        }))
      })),
      upsert: vi.fn(() => Promise.resolve())
    }))
  }
}));

const mockFeedback = {
  id: '1',
  userId: 'user1',
  prophecyId: 'prophecy1',
  rating: 4,
  wasHelpful: true,
  comment: 'Great prediction!',
  createdAt: '2024-03-01T12:00:00Z',
  metadata: {
    followedRecommendations: true,
    actualViews: 1000,
    actualLikes: 100,
    actualComments: 10
  }
};

const mockFeedbackList = [mockFeedback];

describe('Feedback System', () => {
  it('submits feedback successfully', async () => {
    const feedback = await submitFeedback({
      userId: 'user1',
      prophecyId: 'prophecy1',
      rating: 4,
      wasHelpful: true
    });

    expect(feedback).toEqual(mockFeedback);
    expect(supabase.from).toHaveBeenCalledWith('user_feedback');
  });

  it('retrieves feedback summary', async () => {
    const summary = await getFeedbackSummary('user1');

    expect(summary).toMatchObject({
      averageRating: expect.any(Number),
      totalFeedback: expect.any(Number),
      helpfulPercentage: expect.any(Number),
      recommendationFollowRate: expect.any(Number),
      accuracyTrend: expect.any(Array)
    });
  });

  it('updates prediction model based on feedback', async () => {
    await updatePredictionModel('user1');

    expect(supabase.from).toHaveBeenCalledWith('prediction_parameters');
  });

  it('handles empty feedback data gracefully', async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [] }))
      }))
    }));

    const summary = await getFeedbackSummary('user2');

    expect(summary).toEqual({
      averageRating: 0,
      totalFeedback: 0,
      helpfulPercentage: 0,
      recommendationFollowRate: 0,
      accuracyTrend: []
    });
  });
});
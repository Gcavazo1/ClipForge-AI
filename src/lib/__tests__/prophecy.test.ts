import { describe, it, expect, vi } from 'vitest';
import { generateProphecy, getProphecy } from '../prophecy';
import { supabase } from '../supabase';

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockAnalytics }))
        }))
      }))
    }))
  }
}));

const mockAnalytics = [
  {
    id: '1',
    clip_id: 'clip1',
    user_id: 'user1',
    views: 1000,
    likes: 100,
    comments: 10,
    watch_time: 45,
    posted_at: '2024-02-01T12:00:00Z'
  },
  {
    id: '2',
    clip_id: 'clip2',
    user_id: 'user1',
    views: 2000,
    likes: 200,
    comments: 20,
    watch_time: 50,
    posted_at: '2024-02-15T12:00:00Z'
  }
];

describe('Prophecy Engine', () => {
  it('generates prophecy with valid data', async () => {
    const prophecy = await generateProphecy({ userId: 'user1' });
    
    expect(prophecy).toMatchObject({
      predictedViews: expect.any(Number),
      predictedLikes: expect.any(Number),
      predictedComments: expect.any(Number),
      confidence: expect.any(Number),
      bestTime: expect.any(String),
      bestDay: expect.any(String),
      trendingHashtags: expect.any(Array),
      recommendations: expect.any(Array),
      insights: expect.any(Array)
    });
    
    expect(prophecy.confidence).toBeGreaterThanOrEqual(0);
    expect(prophecy.confidence).toBeLessThanOrEqual(100);
  });
  
  it('caches prophecy results', async () => {
    const firstProphecy = await getProphecy('user1');
    const secondProphecy = await getProphecy('user1');
    
    expect(firstProphecy).toEqual(secondProphecy);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
  
  it('handles missing analytics data gracefully', async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [] }))
        }))
      }))
    }));
    
    const prophecy = await generateProphecy({ userId: 'user2' });
    
    expect(prophecy.predictedViews).toBeGreaterThan(0);
    expect(prophecy.confidence).toBeLessThan(80);
  });
});
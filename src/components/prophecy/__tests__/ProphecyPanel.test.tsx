import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProphecyPanel from '../ProphecyPanel';

const mockProphecy = {
  predictedViews: 10000,
  predictedLikes: 1000,
  predictedComments: 100,
  confidence: 85,
  bestTime: '9:00 PM',
  bestDay: 'Wednesday',
  recommendedDuration: 45,
  trendingHashtags: ['fyp', 'viral', 'tutorial'],
  recommendations: [
    'Post during peak hours',
    'Use trending sounds',
    'Engage with comments'
  ],
  insights: [
    {
      type: 'engagement',
      message: 'Engagement is trending up',
      confidence: 90
    }
  ]
};

describe('ProphecyPanel', () => {
  it('renders loading state', () => {
    render(<ProphecyPanel prophecy={null} isLoading={true} onRefresh={() => {}} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  
  it('renders empty state with generate button', () => {
    render(<ProphecyPanel prophecy={null} isLoading={false} onRefresh={() => {}} />);
    expect(screen.getByText(/No Prophecy Available/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Prophecy/i })).toBeInTheDocument();
  });
  
  it('displays prophecy data correctly', () => {
    render(<ProphecyPanel prophecy={mockProphecy} isLoading={false} onRefresh={() => {}} />);
    
    expect(screen.getByText('10K')).toBeInTheDocument();
    expect(screen.getByText('1K')).toBeInTheDocument();
    expect(screen.getByText('9:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    
    mockProphecy.trendingHashtags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });
  
  it('calls refresh callback when button clicked', () => {
    const onRefresh = vi.fn();
    render(<ProphecyPanel prophecy={mockProphecy} isLoading={false} onRefresh={onRefresh} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
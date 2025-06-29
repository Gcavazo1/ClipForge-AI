import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TranscriptSegment, ClipSegment } from '../types';

// Utility for merging Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date using Intl API
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(timestamp));
}

// Format time duration in seconds to MM:SS or HH:MM:SS
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Alias for formatTime to maintain compatibility
export const formatLongTime = formatTime;

// Generate a random ID string
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Format large numbers with K/M suffixes
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// Detect highlights from transcript segments
export function detectHighlights(transcript: TranscriptSegment[]): Array<{
  startTime: number;
  endTime: number;
  confidence: number;
  type: 'emotion' | 'insight' | 'hook' | 'cta';
  summary: string;
}> {
  const highlights: Array<{
    startTime: number;
    endTime: number;
    confidence: number;
    type: 'emotion' | 'insight' | 'hook' | 'cta';
    summary: string;
  }> = [];

  // Analyze each segment for potential highlights
  for (let i = 0; i < transcript.length; i++) {
    const segment = transcript[i];
    const text = segment.text.toLowerCase();
    
    // Score based on keywords and patterns
    let score = 0;
    let type: 'emotion' | 'insight' | 'hook' | 'cta' = 'emotion';
    
    // Emotion indicators
    if (/(!|\?|wow|amazing|incredible|love|excited|awesome|fantastic)/i.test(text)) {
      score += 0.3;
      type = 'emotion';
    }
    
    // Insight indicators
    if /(learn|understand|realize|discover|found out|secret|tip|trick)/i.test(text)) {
      score += 0.4;
      type = 'insight';
    }
    
    // Hook indicators
    if /(here's|check this|watch this|you won't believe|wait for it)/i.test(text)) {
      score += 0.35;
      type = 'hook';
    }
    
    // Call-to-action indicators
    if /(subscribe|follow|like|share|comment|check out|visit|click)/i.test(text)) {
      score += 0.25;
      type = 'cta';
    }
    
    // Question indicators (often engaging)
    if (/\?/.test(text) || /(what|how|why|when|where|which|who)/i.test(text)) {
      score += 0.2;
    }
    
    // Exclamation indicators (high energy)
    if (/!/.test(text)) {
      score += 0.15;
    }
    
    // Numbers and statistics (often interesting)
    if (/\d+/.test(text)) {
      score += 0.1;
    }
    
    // Add some randomness to simulate AI confidence
    score += Math.random() * 0.2;
    
    // If score is high enough, create a highlight
    if (score > 0.6) {
      // Look for a good segment range (include context)
      const contextStart = Math.max(0, i - 1);
      const contextEnd = Math.min(transcript.length - 1, i + 1);
      
      const startTime = transcript[contextStart].startTime;
      const endTime = transcript[contextEnd].endTime;
      
      // Ensure minimum and maximum duration
      const duration = endTime - startTime;
      const adjustedEndTime = duration < 15 
        ? Math.min(startTime + 15, transcript[transcript.length - 1].endTime)
        : duration > 60 
        ? startTime + 60 
        : endTime;
      
      highlights.push({
        startTime,
        endTime: adjustedEndTime,
        confidence: Math.min(score, 1.0),
        type,
        summary: segment.text.slice(0, 100) + (segment.text.length > 100 ? '...' : '')
      });
    }
  }
  
  // Remove overlapping highlights and keep the best ones
  const filteredHighlights = highlights
    .sort((a, b) => b.confidence - a.confidence)
    .filter((highlight, index, array) => {
      // Check if this highlight overlaps with any previous (higher confidence) highlight
      for (let j = 0; j < index; j++) {
        const other = array[j];
        if (
          (highlight.startTime >= other.startTime && highlight.startTime <= other.endTime) ||
          (highlight.endTime >= other.startTime && highlight.endTime <= other.endTime) ||
          (highlight.startTime <= other.startTime && highlight.endTime >= other.endTime)
        ) {
          return false; // Overlaps, filter out
        }
      }
      return true;
    })
    .slice(0, 5); // Keep top 5 highlights
  
  return filteredHighlights;
}
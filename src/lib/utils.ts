import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TranscriptSegment } from '../types';

// Merge Tailwind classes with clsx
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a number to a readable string (e.g., 1.2K, 1.5M)
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format seconds to MM:SS format
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format seconds to HH:MM:SS format for longer videos
export function formatLongTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return formatTime(seconds);
}

// Generate a random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Simulate transcription API call
export async function transcribeVideo(videoFile: File): Promise<TranscriptSegment[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate mock transcript segments
  const segments: TranscriptSegment[] = [];
  const segmentCount = Math.floor(Math.random() * 20) + 10; // 10-30 segments
  let currentTime = 0;
  
  const sampleTexts = [
    "Welcome to this video about our new product features.",
    "Let me show you how this works in practice.",
    "One of the key benefits is improved performance.",
    "Users have reported significant time savings.",
    "The interface has been completely redesigned.",
    "Security was our top priority during development.",
    "We've added several new customization options.",
    "Integration with existing systems is seamless.",
    "The feedback from our beta testers was positive.",
    "Let's look at some real-world examples.",
    "This feature was highly requested by our users.",
    "The implementation is straightforward and efficient.",
    "We've optimized this for better performance.",
    "You can easily configure these settings.",
    "This dramatically improves the user experience.",
  ];
  
  for (let i = 0; i < segmentCount; i++) {
    const duration = Math.random() * 5 + 2; // 2-7 seconds per segment
    const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    
    segments.push({
      id: generateId(),
      startTime: currentTime,
      endTime: currentTime + duration,
      text,
    });
    
    currentTime += duration;
  }
  
  return segments;
}

// Detect "interesting" parts of transcription using a simple algorithm
export function detectHighlights(transcript: TranscriptSegment[]): { startTime: number; endTime: number; confidence: number }[] {
  const highlights: { startTime: number; endTime: number; confidence: number }[] = [];
  
  transcript.forEach((segment, index) => {
    const wordCount = segment.text.split(' ').length;
    const hasEmphasis = segment.text.includes('!') || segment.text.includes('?');
    const isLongEnough = segment.endTime - segment.startTime > 3;
    
    let score = 0;
    score += wordCount / 10;
    if (hasEmphasis) score += 0.3;
    
    if (isLongEnough && score > 0.5) {
      let startIndex = index;
      let endIndex = index;
      let duration = segment.endTime - segment.startTime;
      
      while (startIndex > 0 && duration < 15) {
        startIndex--;
        duration = transcript[endIndex].endTime - transcript[startIndex].startTime;
      }
      
      while (endIndex < transcript.length - 1 && duration < 30) {
        endIndex++;
        duration = transcript[endIndex].endTime - transcript[startIndex].startTime;
      }
      
      while (duration > 60 && startIndex < endIndex) {
        startIndex++;
        duration = transcript[endIndex].endTime - transcript[startIndex].startTime;
      }
      
      if (duration >= 15 && duration <= 60) {
        highlights.push({
          startTime: transcript[startIndex].startTime,
          endTime: transcript[endIndex].endTime,
          confidence: Math.min(0.9, score / 10)
        });
      }
    }
  });
  
  return highlights;
}

// Simple debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
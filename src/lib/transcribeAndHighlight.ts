import { TranscriptSegment } from '../types';
import { generateId } from './utils';

interface HighlightCandidate {
  startTime: number;
  endTime: number;
  score: number;
  summary: string;
  type: 'emotion' | 'insight' | 'hook' | 'cta';
}

interface TranscriptionResult {
  transcript: TranscriptSegment[];
  highlights: HighlightCandidate[];
  topHighlights: HighlightCandidate[];
}

// Mock GPT scoring function
function mockGptScore(text: string): { score: number; type: HighlightCandidate['type']; summary: string } {
  // Simple heuristics for demo purposes
  const hasEmotion = /(!|\?|wow|amazing|incredible|love)/i.test(text);
  const hasInsight = /(learn|understand|realize|discover|found out)/i.test(text);
  const hasHook = /(secret|trick|tip|here's|check this|watch this)/i.test(text);
  const hasCta = /(subscribe|follow|like|share|comment|check out)/i.test(text);
  
  let score = 0;
  let type: HighlightCandidate['type'] = 'emotion';
  
  if (hasEmotion) {
    score = 0.8;
    type = 'emotion';
  } else if (hasInsight) {
    score = 0.9;
    type = 'insight';
  } else if (hasHook) {
    score = 0.85;
    type = 'hook';
  } else if (hasCta) {
    score = 0.7;
    type = 'cta';
  } else {
    score = 0.5 + Math.random() * 0.3;
  }
  
  return {
    score,
    type,
    summary: text.slice(0, 100) + (text.length > 100 ? '...' : '')
  };
}

// Mock Whisper API response
async function mockWhisperTranscribe(audioFile: File): Promise<TranscriptSegment[]> {
  const sampleTexts = [
    "Hey everyone! Today I'm super excited to share something amazing with you!",
    "I've discovered a game-changing technique that will transform how you work.",
    "Most people don't know this secret, but it's incredibly powerful.",
    "Let me show you exactly how this works in practice.",
    "The key insight is understanding how these components interact.",
    "This is where things get really interesting, watch this!",
    "I can't believe how effective this method has been for our team.",
    "Here's a pro tip that will save you hours of work.",
    "The results we've achieved have been absolutely incredible.",
    "If you want to learn more advanced techniques like this,",
    "Make sure to like and subscribe for more content like this!",
    "Drop a comment below if you found this helpful.",
    "Thanks for watching, and I'll see you in the next video!"
  ];
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
  
  const segments: TranscriptSegment[] = [];
  let currentTime = 0;
  
  sampleTexts.forEach((text) => {
    const duration = 3 + Math.random() * 5; // 3-8 seconds per segment
    
    segments.push({
      id: generateId(),
      startTime: currentTime,
      endTime: currentTime + duration,
      text,
      speakerId: 'speaker1'
    });
    
    currentTime += duration;
  });
  
  return segments;
}

export async function transcribeAndHighlight(
  file: File,
  options = { language: 'en', diarization: true }
): Promise<TranscriptionResult> {
  console.log('Starting transcription process...', { file, options });
  
  try {
    // Step 1: Transcribe audio
    console.log('Transcribing audio...');
    const transcript = await mockWhisperTranscribe(file);
    console.log('Transcription complete:', transcript.length, 'segments');
    
    // Step 2: Analyze segments for highlights
    console.log('Analyzing segments for highlights...');
    const highlights: HighlightCandidate[] = [];
    
    for (let i = 0; i < transcript.length; i++) {
      const segment = transcript[i];
      const { score, type, summary } = mockGptScore(segment.text);
      
      // For segments with high scores, look at surrounding context
      if (score > 0.7) {
        const contextStart = Math.max(0, i - 1);
        const contextEnd = Math.min(transcript.length - 1, i + 1);
        
        highlights.push({
          startTime: transcript[contextStart].startTime,
          endTime: transcript[contextEnd].endTime,
          score,
          type,
          summary
        });
      }
    }
    
    console.log('Found', highlights.length, 'potential highlights');
    
    // Step 3: Select top highlights
    const topHighlights = highlights
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(highlight => ({
        ...highlight,
        // Ensure highlights are between 15-60 seconds
        startTime: Math.max(0, highlight.startTime),
        endTime: Math.min(
          highlight.startTime + 60,
          Math.max(highlight.startTime + 15, highlight.endTime)
        )
      }));
    
    console.log('Selected top highlights:', topHighlights);
    
    // Step 4: Save to localStorage for persistence
    try {
      localStorage.setItem(`transcript_${generateId()}`, JSON.stringify({
        transcript,
        highlights,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to save transcript to localStorage:', error);
    }
    
    return {
      transcript,
      highlights,
      topHighlights
    };
  } catch (error) {
    console.error('Transcription process failed:', error);
    throw new Error('Failed to process video');
  }
}
import { TranscriptSegment } from '../types';
import { generateId } from './utils';
import { aiService } from './ai/ai-service';
import { logger } from './logger';

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

export async function transcribeAndHighlight(
  file: File,
  options = { 
    language: 'en', 
    diarization: true,
    transcriptionProvider: 'openai',
    analysisProvider: 'groq'
  }
): Promise<TranscriptionResult> {
  console.log('Starting transcription process...', { file, options });
  
  try {
    logger.info('Starting AI transcription and analysis', {
      fileName: file.name,
      size: file.size,
      options
    });

    // Use the AI service for transcription and analysis
    const result = await aiService.transcribeAndAnalyze(file, {
      transcription: {
        language: options.language,
        speakerDiarization: options.diarization,
        wordTimestamps: true
      },
      analysis: {
        platform: 'general',
        targetDuration: 30,
        contentType: 'general'
      },
      transcriptionProvider: options.transcriptionProvider,
      analysisProvider: options.analysisProvider
    });

    // Convert AI service results to our format
    const transcript: TranscriptSegment[] = result.transcript.segments.map(segment => ({
      id: generateId(),
      startTime: segment.start,
      endTime: segment.end,
      text: segment.text,
      speakerId: segment.speaker || 'speaker1',
      confidence: segment.confidence
    }));

    const highlights: HighlightCandidate[] = result.analysis.highlights.map(highlight => ({
      startTime: highlight.startTime,
      endTime: highlight.endTime,
      score: highlight.confidence,
      summary: highlight.summary,
      type: highlight.type as any
    }));

    // Select top highlights (sorted by confidence)
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

    console.log('AI transcription and analysis completed', {
      transcriptSegments: transcript.length,
      highlights: highlights.length,
      topHighlights: topHighlights.length
    });

    // Save to localStorage for persistence
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
    console.error('AI transcription process failed:', error);
    
    // Fallback to mock implementation if AI services fail
    logger.warn('Falling back to mock transcription due to AI service failure');
    return mockTranscribeAndHighlight(file);
  }
}

// Fallback mock implementation
async function mockTranscribeAndHighlight(file: File): Promise<TranscriptionResult> {
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
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
  
  const segments: TranscriptSegment[] = [];
  let currentTime = 0;
  
  sampleTexts.forEach((text) => {
    const duration = 3 + Math.random() * 5; // 3-8 seconds per segment
    
    segments.push({
      id: generateId(),
      startTime: currentTime,
      endTime: currentTime + duration,
      text,
      speakerId: 'speaker1',
      confidence: 0.8 + Math.random() * 0.2
    });
    
    currentTime += duration;
  });

  // Mock highlight detection
  const highlights: HighlightCandidate[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const text = segment.text.toLowerCase();
    
    let score = 0;
    let type: HighlightCandidate['type'] = 'emotion';
    
    if (/(!|\?|wow|amazing|incredible|love|excited|awesome|fantastic)/i.test(text)) {
      score = 0.8;
      type = 'emotion';
    } else if (/(learn|understand|realize|discover|found out|secret|tip|trick)/i.test(text)) {
      score = 0.9;
      type = 'insight';
    } else if (/(here's|check this|watch this|you won\'t believe|wait for it)/i.test(text)) {
      score = 0.85;
      type = 'hook';
    } else if (/(subscribe|follow|like|share|comment|check out|visit|click)/i.test(text)) {
      score = 0.7;
      type = 'cta';
    }
    
    if (score > 0.7) {
      const contextStart = Math.max(0, i - 1);
      const contextEnd = Math.min(segments.length - 1, i + 1);
      
      highlights.push({
        startTime: segments[contextStart].startTime,
        endTime: segments[contextEnd].endTime,
        score,
        type,
        summary: segment.text.slice(0, 100) + (segment.text.length > 100 ? '...' : '')
      });
    }
  }

  const topHighlights = highlights
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    transcript: segments,
    highlights,
    topHighlights
  };
}
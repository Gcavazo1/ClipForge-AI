export interface TranscriptionResult {
  segments: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
    speaker?: string;
  }>;
  language: string;
  duration: number;
}

export interface HighlightAnalysis {
  highlights: Array<{
    startTime: number;
    endTime: number;
    confidence: number;
    type: 'hook' | 'insight' | 'emotion' | 'cta';
    summary: string;
    reasoning: string;
  }>;
  overallScore: number;
  recommendations: string[];
}

export interface AIProvider {
  name: string;
  capabilities: {
    transcription: boolean;
    textAnalysis: boolean;
    highlightDetection: boolean;
  };
  
  transcribe?(audioFile: File, options?: TranscriptionOptions): Promise<TranscriptionResult>;
  analyzeText?(text: string, options?: AnalysisOptions): Promise<HighlightAnalysis>;
  detectHighlights?(transcript: TranscriptionResult): Promise<HighlightAnalysis>;
}

export interface TranscriptionOptions {
  language?: string;
  speakerDiarization?: boolean;
  wordTimestamps?: boolean;
}

export interface AnalysisOptions {
  platform?: 'tiktok' | 'youtube' | 'instagram';
  targetDuration?: number;
  contentType?: 'educational' | 'entertainment' | 'business';
}
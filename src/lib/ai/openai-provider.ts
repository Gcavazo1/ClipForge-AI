import { AIProvider, TranscriptionResult, HighlightAnalysis, TranscriptionOptions, AnalysisOptions } from './providers';
import { logger } from '../logger';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  capabilities = {
    transcription: true,
    textAnalysis: true,
    highlightDetection: true,
  };

  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioFile: File, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    try {
      logger.info('Starting OpenAI transcription', { 
        fileName: audioFile.name, 
        size: audioFile.size,
        options 
      });

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');
      
      if (options.language) {
        formData.append('language', options.language);
      }

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      const transcriptionResult: TranscriptionResult = {
        segments: result.segments.map((segment: any) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text.trim(),
          confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.9,
        })),
        language: result.language,
        duration: result.duration,
      };

      logger.info('OpenAI transcription completed', { 
        segmentCount: transcriptionResult.segments.length,
        duration: transcriptionResult.duration 
      });

      return transcriptionResult;
    } catch (error) {
      logger.error('OpenAI transcription failed', error as Error);
      throw error;
    }
  }

  async analyzeText(text: string, options: AnalysisOptions = {}): Promise<HighlightAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(text, options);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert video content analyst specializing in social media engagement. Analyze transcripts to identify the most engaging moments for short-form video clips.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const analysis = JSON.parse(result.choices[0].message.content);

      return this.parseAnalysisResult(analysis);
    } catch (error) {
      logger.error('OpenAI text analysis failed', error as Error);
      throw error;
    }
  }

  async detectHighlights(transcript: TranscriptionResult): Promise<HighlightAnalysis> {
    const fullText = transcript.segments.map(s => s.text).join(' ');
    return this.analyzeText(fullText, {});
  }

  private buildAnalysisPrompt(text: string, options: AnalysisOptions): string {
    const platform = options.platform || 'general';
    const targetDuration = options.targetDuration || 30;
    
    return `
Analyze this video transcript and identify the most engaging moments for ${platform} short-form content.

Target clip duration: ${targetDuration} seconds
Content type: ${options.contentType || 'general'}

Transcript:
${text}

Please provide a JSON response with the following structure:
{
  "highlights": [
    {
      "startTime": 0,
      "endTime": 30,
      "confidence": 0.95,
      "type": "hook|insight|emotion|cta",
      "summary": "Brief description of the highlight",
      "reasoning": "Why this moment is engaging"
    }
  ],
  "overallScore": 0.85,
  "recommendations": ["Specific advice for improving engagement"]
}

Focus on:
- Strong hooks that grab attention immediately
- Valuable insights or surprising information
- Emotional moments that drive engagement
- Clear calls-to-action
- Moments with high information density
- Natural breakpoints for clips
`;
  }

  private parseAnalysisResult(analysis: any): HighlightAnalysis {
    return {
      highlights: analysis.highlights || [],
      overallScore: analysis.overallScore || 0,
      recommendations: analysis.recommendations || [],
    };
  }
}
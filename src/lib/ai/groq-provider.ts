import { AIProvider, HighlightAnalysis, TranscriptionResult, AnalysisOptions } from './providers';
import { logger } from '../logger';

export class GroqProvider implements AIProvider {
  name = 'Groq';
  capabilities = {
    transcription: false, // Groq doesn't offer transcription
    textAnalysis: true,
    highlightDetection: true,
  };

  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeText(text: string, options: AnalysisOptions = {}): Promise<HighlightAnalysis> {
    try {
      logger.info('Starting Groq text analysis', { textLength: text.length, options });

      const prompt = this.buildAnalysisPrompt(text, options);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Fast and capable model
          messages: [
            {
              role: 'system',
              content: 'You are an expert video content analyst. Analyze transcripts quickly and accurately to identify engaging moments for social media clips. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const analysisText = result.choices[0].message.content;
      
      // Parse JSON response
      const analysis = JSON.parse(analysisText);

      logger.info('Groq analysis completed', { 
        highlightCount: analysis.highlights?.length || 0 
      });

      return this.parseAnalysisResult(analysis);
    } catch (error) {
      logger.error('Groq text analysis failed', error as Error);
      throw error;
    }
  }

  async detectHighlights(transcript: TranscriptionResult): Promise<HighlightAnalysis> {
    // Groq excels at fast text processing, so we can do more sophisticated analysis
    const segmentAnalysis = await this.analyzeSegments(transcript.segments);
    const fullTextAnalysis = await this.analyzeText(
      transcript.segments.map(s => s.text).join(' ')
    );

    // Combine segment-level and full-text analysis
    return this.combineAnalyses(segmentAnalysis, fullTextAnalysis);
  }

  private async analyzeSegments(segments: any[]): Promise<HighlightAnalysis> {
    // Analyze each segment individually for more granular insights
    const segmentPromises = segments.map(async (segment, index) => {
      const context = segments.slice(Math.max(0, index - 1), index + 2)
        .map(s => s.text).join(' ');
      
      return this.analyzeText(context, {});
    });

    const results = await Promise.all(segmentPromises);
    
    // Merge results
    const allHighlights = results.flatMap(r => r.highlights);
    const avgScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    const allRecommendations = [...new Set(results.flatMap(r => r.recommendations))];

    return {
      highlights: allHighlights,
      overallScore: avgScore,
      recommendations: allRecommendations,
    };
  }

  private combineAnalyses(segmentAnalysis: HighlightAnalysis, fullAnalysis: HighlightAnalysis): HighlightAnalysis {
    // Combine and deduplicate highlights
    const combinedHighlights = [...segmentAnalysis.highlights, ...fullAnalysis.highlights]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Keep top 10

    return {
      highlights: combinedHighlights,
      overallScore: (segmentAnalysis.overallScore + fullAnalysis.overallScore) / 2,
      recommendations: [...new Set([
        ...segmentAnalysis.recommendations,
        ...fullAnalysis.recommendations
      ])],
    };
  }

  private buildAnalysisPrompt(text: string, options: AnalysisOptions): string {
    return `
Analyze this video transcript segment for social media engagement potential.

Platform: ${options.platform || 'general'}
Target duration: ${options.targetDuration || 30} seconds

Text: "${text}"

Respond with JSON only:
{
  "highlights": [
    {
      "startTime": 0,
      "endTime": 30,
      "confidence": 0.95,
      "type": "hook|insight|emotion|cta",
      "summary": "Brief description",
      "reasoning": "Why engaging"
    }
  ],
  "overallScore": 0.85,
  "recommendations": ["Specific advice"]
}
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
import { OpenAIProvider } from './openai-provider';
import { GroqProvider } from './groq-provider';
import { AssemblyAIProvider } from './assembly-provider';
import { AIProvider, TranscriptionResult, HighlightAnalysis, TranscriptionOptions, AnalysisOptions } from './providers';
import { logger } from '../logger';

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private defaultTranscriptionProvider = 'openai';
  private defaultAnalysisProvider = 'groq'; // Use Groq for faster analysis

  constructor() {
    // Initialize providers based on available API keys
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    const assemblyKey = import.meta.env.VITE_ASSEMBLY_API_KEY;

    if (openaiKey) {
      this.providers.set('openai', new OpenAIProvider(openaiKey));
    }

    if (groqKey) {
      this.providers.set('groq', new GroqProvider(groqKey));
    }

    if (assemblyKey) {
      this.providers.set('assembly', new AssemblyAIProvider(assemblyKey));
    }

    logger.info('AI Service initialized', { 
      providers: Array.from(this.providers.keys()) 
    });
  }

  async transcribe(
    audioFile: File, 
    options: TranscriptionOptions = {},
    preferredProvider?: string
  ): Promise<TranscriptionResult> {
    const providerName = preferredProvider || this.defaultTranscriptionProvider;
    const provider = this.providers.get(providerName);

    if (!provider || !provider.capabilities.transcription) {
      // Fallback to any available transcription provider
      const fallbackProvider = Array.from(this.providers.values())
        .find(p => p.capabilities.transcription);
      
      if (!fallbackProvider) {
        throw new Error('No transcription provider available');
      }

      logger.warn('Using fallback transcription provider', { 
        requested: providerName,
        fallback: fallbackProvider.name 
      });

      return fallbackProvider.transcribe!(audioFile, options);
    }

    return provider.transcribe!(audioFile, options);
  }

  async analyzeText(
    text: string, 
    options: AnalysisOptions = {},
    preferredProvider?: string
  ): Promise<HighlightAnalysis> {
    const providerName = preferredProvider || this.defaultAnalysisProvider;
    const provider = this.providers.get(providerName);

    if (!provider || !provider.capabilities.textAnalysis) {
      // Fallback to any available analysis provider
      const fallbackProvider = Array.from(this.providers.values())
        .find(p => p.capabilities.textAnalysis);
      
      if (!fallbackProvider) {
        throw new Error('No text analysis provider available');
      }

      logger.warn('Using fallback analysis provider', { 
        requested: providerName,
        fallback: fallbackProvider.name 
      });

      return fallbackProvider.analyzeText!(text, options);
    }

    return provider.analyzeText!(text, options);
  }

  async detectHighlights(
    transcript: TranscriptionResult,
    options: AnalysisOptions = {},
    preferredProvider?: string
  ): Promise<HighlightAnalysis> {
    const providerName = preferredProvider || this.defaultAnalysisProvider;
    const provider = this.providers.get(providerName);

    if (!provider || !provider.capabilities.highlightDetection) {
      // Use text analysis as fallback
      const fullText = transcript.segments.map(s => s.text).join(' ');
      return this.analyzeText(fullText, options, preferredProvider);
    }

    return provider.detectHighlights!(transcript);
  }

  // Hybrid approach: Use multiple providers for better results
  async transcribeAndAnalyze(
    audioFile: File,
    options: {
      transcription?: TranscriptionOptions;
      analysis?: AnalysisOptions;
      transcriptionProvider?: string;
      analysisProvider?: string;
    } = {}
  ): Promise<{ transcript: TranscriptionResult; analysis: HighlightAnalysis }> {
    try {
      // Step 1: Transcribe with preferred provider (OpenAI for quality)
      const transcript = await this.transcribe(
        audioFile, 
        options.transcription,
        options.transcriptionProvider || 'openai'
      );

      // Step 2: Analyze with preferred provider (Groq for speed)
      const analysis = await this.detectHighlights(
        transcript,
        options.analysis,
        options.analysisProvider || 'groq'
      );

      return { transcript, analysis };
    } catch (error) {
      logger.error('Transcribe and analyze failed', error as Error);
      throw error;
    }
  }

  // Get available providers and their capabilities
  getAvailableProviders(): Array<{ name: string; capabilities: any }> {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      capabilities: provider.capabilities,
    }));
  }

  // Set default providers
  setDefaultProviders(transcription?: string, analysis?: string) {
    if (transcription && this.providers.has(transcription)) {
      this.defaultTranscriptionProvider = transcription;
    }
    if (analysis && this.providers.has(analysis)) {
      this.defaultAnalysisProvider = analysis;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
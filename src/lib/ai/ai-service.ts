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
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize providers based on available API keys
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    const assemblyKey = import.meta.env.VITE_ASSEMBLY_API_KEY;

    if (openaiKey && openaiKey !== 'your_openai_api_key') {
      try {
        this.providers.set('openai', new OpenAIProvider(openaiKey));
        logger.info('OpenAI provider initialized');
      } catch (error) {
        logger.error('Failed to initialize OpenAI provider', error as Error);
      }
    } else {
      logger.warn('OpenAI API key not found or not configured');
    }

    if (groqKey && groqKey !== 'your_groq_api_key') {
      try {
        this.providers.set('groq', new GroqProvider(groqKey));
        logger.info('Groq provider initialized');
      } catch (error) {
        logger.error('Failed to initialize Groq provider', error as Error);
      }
    } else {
      logger.warn('Groq API key not found or not configured');
    }

    if (assemblyKey && assemblyKey !== 'your_assembly_ai_api_key') {
      try {
        this.providers.set('assembly', new AssemblyAIProvider(assemblyKey));
        logger.info('AssemblyAI provider initialized');
      } catch (error) {
        logger.error('Failed to initialize AssemblyAI provider', error as Error);
      }
    } else {
      logger.warn('AssemblyAI API key not found or not configured');
    }

    logger.info('AI Service initialized', { 
      providers: Array.from(this.providers.keys()),
      totalProviders: this.providers.size
    });

    if (this.providers.size === 0) {
      logger.error('No AI providers initialized. Please check your API keys in the .env file.');
    }
  }

  async transcribe(
    audioFile: File, 
    options: TranscriptionOptions = {},
    preferredProvider?: string
  ): Promise<TranscriptionResult> {
    if (this.providers.size === 0) {
      throw new Error('No AI providers available. Please check your API key configuration.');
    }

    const providerName = preferredProvider || this.defaultTranscriptionProvider;
    const provider = this.providers.get(providerName);

    if (!provider || !provider.capabilities.transcription) {
      // Fallback to any available transcription provider
      const fallbackProvider = Array.from(this.providers.values())
        .find(p => p.capabilities.transcription);
      
      if (!fallbackProvider) {
        throw new Error('No transcription provider available. Please check your OpenAI or AssemblyAI API keys.');
      }

      logger.warn('Using fallback transcription provider', { 
        requested: providerName,
        fallback: fallbackProvider.name 
      });

      return fallbackProvider.transcribe!(audioFile, options);
    }

    try {
      return await provider.transcribe!(audioFile, options);
    } catch (error) {
      logger.error(`Transcription failed with ${providerName}`, error as Error);
      throw error;
    }
  }

  async analyzeText(
    text: string, 
    options: AnalysisOptions = {},
    preferredProvider?: string
  ): Promise<HighlightAnalysis> {
    if (this.providers.size === 0) {
      throw new Error('No AI providers available. Please check your API key configuration.');
    }

    const providerName = preferredProvider || this.defaultAnalysisProvider;
    const provider = this.providers.get(providerName);

    if (!provider || !provider.capabilities.textAnalysis) {
      // Fallback to any available analysis provider
      const fallbackProvider = Array.from(this.providers.values())
        .find(p => p.capabilities.textAnalysis);
      
      if (!fallbackProvider) {
        throw new Error('No text analysis provider available. Please check your OpenAI or Groq API keys.');
      }

      logger.warn('Using fallback analysis provider', { 
        requested: providerName,
        fallback: fallbackProvider.name 
      });

      return fallbackProvider.analyzeText!(text, options);
    }

    try {
      return await provider.analyzeText!(text, options);
    } catch (error) {
      logger.error(`Text analysis failed with ${providerName}`, error as Error);
      throw error;
    }
  }

  async detectHighlights(
    transcript: TranscriptionResult,
    options: AnalysisOptions = {},
    preferredProvider?: string
  ): Promise<HighlightAnalysis> {
    if (this.providers.size === 0) {
      throw new Error('No AI providers available. Please check your API key configuration.');
    }

    const providerName = preferredProvider || this.defaultAnalysisProvider;
    const provider = this.providers.get(providerName);

    if (!provider || !provider.capabilities.highlightDetection) {
      // Use text analysis as fallback
      const fullText = transcript.segments.map(s => s.text).join(' ');
      return this.analyzeText(fullText, options, preferredProvider);
    }

    try {
      return await provider.detectHighlights!(transcript);
    } catch (error) {
      logger.error(`Highlight detection failed with ${providerName}`, error as Error);
      throw error;
    }
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
      logger.info('Default transcription provider updated', { provider: transcription });
    }
    if (analysis && this.providers.has(analysis)) {
      this.defaultAnalysisProvider = analysis;
      logger.info('Default analysis provider updated', { provider: analysis });
    }
  }

  // Test provider connectivity
  async testProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return false;
    }

    try {
      // Test with minimal request
      if (provider.capabilities.textAnalysis) {
        await provider.analyzeText!('test', {});
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Provider test failed for ${providerName}`, error as Error);
      return false;
    }
  }

  // Get provider health status
  async getProviderHealth(): Promise<Record<string, { available: boolean; error?: string }>> {
    const health: Record<string, { available: boolean; error?: string }> = {};

    for (const [name, provider] of this.providers) {
      try {
        const isHealthy = await this.testProvider(name);
        health[name] = { available: isHealthy };
      } catch (error) {
        health[name] = { 
          available: false, 
          error: (error as Error).message 
        };
      }
    }

    return health;
  }
}

// Export singleton instance
export const aiService = new AIService();
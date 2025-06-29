import { aiService } from './ai-service';
import { VideoProcessingService } from '../video-processing';
import { TranscriptSegmentService, ClipSegmentService } from '../database';
import { logger } from '../logger';
import { TranscriptSegment, ClipSegment } from '../../types';
import { generateId } from '../utils';

export interface ProcessingPipeline {
  projectId: string;
  videoFile: File;
  userId: string;
  options?: {
    transcriptionProvider?: 'openai' | 'assembly' | 'groq';
    analysisProvider?: 'openai' | 'groq';
    language?: string;
    generateHighlights?: boolean;
    autoCreateClips?: boolean;
  };
}

export interface PipelineResult {
  transcript: TranscriptSegment[];
  highlights: ClipSegment[];
  processingTime: number;
  confidence: number;
}

export class AIServiceIntegration {
  // Main processing pipeline with comprehensive error handling
  static async processVideoWithAI(
    pipeline: ProcessingPipeline,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting AI video processing pipeline', {
        projectId: pipeline.projectId,
        fileName: pipeline.videoFile.name,
        options: pipeline.options
      });

      // Check if AI services are available
      const serviceStatus = AIServiceIntegration.getServiceStatus();
      if (!serviceStatus.available) {
        throw new Error('No AI services are currently available. Please check your API keys.');
      }

      // Stage 1: Extract audio from video (10%)
      onProgress?.('Extracting audio', 10);
      let audioFile: File;
      
      try {
        audioFile = await VideoProcessingService.extractAudio(pipeline.videoFile);
      } catch (error) {
        logger.error('Audio extraction failed', error as Error);
        throw new Error('Failed to extract audio from video. Please ensure the video file is valid.');
      }

      // Stage 2: Transcribe audio with fallback providers (60%)
      onProgress?.('Transcribing audio', 20);
      let transcriptionResult;
      
      try {
        transcriptionResult = await this.transcribeWithFallback(audioFile, {
          language: pipeline.options?.language || 'en',
          speakerDiarization: true,
          wordTimestamps: true
        }, pipeline.options?.transcriptionProvider);
      } catch (error) {
        logger.error('All transcription services failed', error as Error);
        throw new Error('Transcription failed. Please try again or contact support if the issue persists.');
      }

      onProgress?.('Processing transcription', 60);

      // Convert to our transcript format
      const transcript = transcriptionResult.segments.map(segment => ({
        id: generateId(),
        projectId: pipeline.projectId,
        startTime: segment.start,
        endTime: segment.end,
        text: segment.text,
        speakerId: segment.speaker || 'speaker1',
        confidence: segment.confidence
      }));

      // Stage 3: Save transcript to database
      onProgress?.('Saving transcript', 70);
      let savedTranscript: TranscriptSegment[];
      
      try {
        savedTranscript = await TranscriptSegmentService.createBatch(transcript);
      } catch (error) {
        logger.error('Failed to save transcript', error as Error);
        // Continue with in-memory transcript if database save fails
        savedTranscript = transcript;
      }

      let highlights: ClipSegment[] = [];
      
      // Stage 4: Generate highlights if requested (30%)
      if (pipeline.options?.generateHighlights !== false) {
        onProgress?.('Analyzing highlights', 80);
        
        try {
          const highlightAnalysis = await this.detectHighlightsWithFallback(
            transcriptionResult,
            {
              platform: 'general',
              targetDuration: 30,
              contentType: 'general'
            },
            pipeline.options?.analysisProvider
          );

          onProgress?.('Creating highlight clips', 90);

          // Convert highlights to clip segments
          const highlightClips = highlightAnalysis.highlights.map(highlight => ({
            id: generateId(),
            projectId: pipeline.projectId,
            title: highlight.summary.slice(0, 50) + (highlight.summary.length > 50 ? '...' : ''),
            startTime: highlight.startTime,
            endTime: highlight.endTime,
            isHighlight: true,
            confidence: highlight.confidence,
            type: 'ai_suggested' as const,
            summary: highlight.summary
          }));

          // Save highlights to database if auto-create is enabled
          if (pipeline.options?.autoCreateClips !== false && highlightClips.length > 0) {
            try {
              for (const clip of highlightClips) {
                const savedClip = await ClipSegmentService.create(clip);
                highlights.push(savedClip);
              }
            } catch (error) {
              logger.error('Failed to save highlights to database', error as Error);
              // Continue with in-memory highlights
              highlights = highlightClips;
            }
          } else {
            highlights = highlightClips;
          }
        } catch (error) {
          logger.warn('Highlight detection failed, continuing without highlights', error as Error);
          // Continue without highlights rather than failing the entire process
        }
      }

      onProgress?.('Finalizing', 100);

      const processingTime = Date.now() - startTime;
      const avgConfidence = transcript.reduce((sum, t) => sum + (t.confidence || 0), 0) / transcript.length;

      const result: PipelineResult = {
        transcript: savedTranscript,
        highlights,
        processingTime,
        confidence: avgConfidence
      };

      logger.info('AI processing pipeline completed', {
        projectId: pipeline.projectId,
        transcriptSegments: result.transcript.length,
        highlights: result.highlights.length,
        processingTime: result.processingTime,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      logger.error('AI processing pipeline failed', error as Error, {
        projectId: pipeline.projectId
      });
      throw error;
    }
  }

  // Transcription with automatic fallback between providers
  private static async transcribeWithFallback(
    audioFile: File,
    options: any,
    preferredProvider?: string
  ): Promise<any> {
    const providers = ['openai', 'assembly', 'groq'].filter(p => 
      aiService.getAvailableProviders().some(provider => provider.name.toLowerCase() === p)
    );

    // Put preferred provider first
    if (preferredProvider && providers.includes(preferredProvider)) {
      const index = providers.indexOf(preferredProvider);
      providers.splice(index, 1);
      providers.unshift(preferredProvider);
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        logger.info(`Attempting transcription with ${provider}`);
        const result = await aiService.transcribe(audioFile, options, provider);
        logger.info(`Transcription successful with ${provider}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Transcription failed with ${provider}`, error as Error);
        
        // If this is a quota/billing error, try next provider immediately
        if (this.isQuotaError(error as Error)) {
          continue;
        }
        
        // For other errors, wait a bit before trying next provider
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`All transcription providers failed. Last error: ${lastError?.message}`);
  }

  // Highlight detection with fallback
  private static async detectHighlightsWithFallback(
    transcript: any,
    options: any,
    preferredProvider?: string
  ): Promise<any> {
    const providers = ['groq', 'openai'].filter(p => 
      aiService.getAvailableProviders().some(provider => provider.name.toLowerCase() === p)
    );

    // Put preferred provider first
    if (preferredProvider && providers.includes(preferredProvider)) {
      const index = providers.indexOf(preferredProvider);
      providers.splice(index, 1);
      providers.unshift(preferredProvider);
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        logger.info(`Attempting highlight detection with ${provider}`);
        const result = await aiService.detectHighlights(transcript, options, provider);
        logger.info(`Highlight detection successful with ${provider}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Highlight detection failed with ${provider}`, error as Error);
        
        if (this.isQuotaError(error as Error)) {
          continue;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`All highlight detection providers failed. Last error: ${lastError?.message}`);
  }

  // Check if error is related to quota/billing
  private static isQuotaError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('quota') || 
           message.includes('billing') || 
           message.includes('insufficient') ||
           message.includes('rate limit') ||
           message.includes('429');
  }

  // Reprocess existing transcript for better highlights
  static async reprocessHighlights(
    projectId: string,
    options?: {
      analysisProvider?: 'openai' | 'groq';
      platform?: 'tiktok' | 'youtube' | 'instagram';
      targetDuration?: number;
    }
  ): Promise<ClipSegment[]> {
    try {
      logger.info('Reprocessing highlights', { projectId, options });

      // Get existing transcript
      const transcript = await TranscriptSegmentService.getByProjectId(projectId);
      
      if (transcript.length === 0) {
        throw new Error('No transcript found for project');
      }

      // Convert to AI service format
      const transcriptionResult = {
        segments: transcript.map(t => ({
          start: t.startTime,
          end: t.endTime,
          text: t.text,
          confidence: t.confidence || 0.9,
          speaker: t.speakerId
        })),
        language: 'en',
        duration: Math.max(...transcript.map(t => t.endTime))
      };

      // Analyze with AI using fallback
      const analysis = await this.detectHighlightsWithFallback(transcriptionResult, {
        platform: options?.platform || 'general',
        targetDuration: options?.targetDuration || 30,
        contentType: 'general'
      }, options?.analysisProvider);

      // Convert to clip segments
      const highlights = analysis.highlights.map(highlight => ({
        id: generateId(),
        projectId,
        title: highlight.summary.slice(0, 50) + (highlight.summary.length > 50 ? '...' : ''),
        startTime: highlight.startTime,
        endTime: highlight.endTime,
        isHighlight: true,
        confidence: highlight.confidence,
        type: 'ai_suggested' as const,
        summary: highlight.summary
      }));

      logger.info('Highlights reprocessed', { 
        projectId, 
        highlightCount: highlights.length 
      });

      return highlights;

    } catch (error) {
      logger.error('Highlight reprocessing failed', error as Error, { projectId });
      throw error;
    }
  }

  // Get AI service status and capabilities
  static getServiceStatus() {
    const providers = aiService.getAvailableProviders();
    
    return {
      available: providers.length > 0,
      providers,
      capabilities: {
        transcription: providers.some(p => p.capabilities.transcription),
        textAnalysis: providers.some(p => p.capabilities.textAnalysis),
        highlightDetection: providers.some(p => p.capabilities.highlightDetection)
      }
    };
  }

  // Estimate processing time and cost
  static estimateProcessing(videoFile: File): {
    estimatedTime: number; // in seconds
    estimatedCost: number; // in USD
    recommendations: string[];
  } {
    const durationEstimate = Math.min(videoFile.size / (1024 * 1024 * 2), 3600); // Rough estimate
    const transcriptionTime = Math.max(durationEstimate * 0.1, 30); // 10% of video length, min 30s
    const analysisTime = 15; // Fixed analysis time
    
    const estimatedTime = transcriptionTime + analysisTime;
    const estimatedCost = (durationEstimate / 60) * 0.006; // $0.006 per minute for Whisper
    
    const recommendations = [];
    
    if (videoFile.size > 100 * 1024 * 1024) {
      recommendations.push('Large file detected. Consider compressing for faster processing.');
    }
    
    if (durationEstimate > 1800) {
      recommendations.push('Long video detected. Processing may take several minutes.');
    }
    
    return {
      estimatedTime,
      estimatedCost,
      recommendations
    };
  }

  // Test API connectivity
  static async testConnectivity(): Promise<{
    openai: boolean;
    groq: boolean;
    assembly: boolean;
    errors: Record<string, string>;
  }> {
    const results = {
      openai: false,
      groq: false,
      assembly: false,
      errors: {} as Record<string, string>
    };

    // Test each service with a minimal request
    const testAudio = new File(['test'], 'test.wav', { type: 'audio/wav' });

    // Test OpenAI
    try {
      await aiService.transcribe(testAudio, { language: 'en' }, 'openai');
      results.openai = true;
    } catch (error) {
      results.errors.openai = (error as Error).message;
    }

    // Test Groq
    try {
      await aiService.analyzeText('test text', {}, 'groq');
      results.groq = true;
    } catch (error) {
      results.errors.groq = (error as Error).message;
    }

    // Test AssemblyAI
    try {
      await aiService.transcribe(testAudio, { language: 'en' }, 'assembly');
      results.assembly = true;
    } catch (error) {
      results.errors.assembly = (error as Error).message;
    }

    return results;
  }

  // Batch process multiple videos
  static async batchProcess(
    pipelines: ProcessingPipeline[],
    onProgress?: (index: number, stage: string, progress: number) => void
  ): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    
    for (let i = 0; i < pipelines.length; i++) {
      const pipeline = pipelines[i];
      
      try {
        const result = await this.processVideoWithAI(
          pipeline,
          (stage, progress) => onProgress?.(i, stage, progress)
        );
        
        results.push(result);
      } catch (error) {
        logger.error('Batch processing failed for item', error as Error, { 
          index: i, 
          projectId: pipeline.projectId 
        });
        
        // Continue with next item instead of failing entire batch
        results.push({
          transcript: [],
          highlights: [],
          processingTime: 0,
          confidence: 0
        });
      }
    }
    
    return results;
  }
}
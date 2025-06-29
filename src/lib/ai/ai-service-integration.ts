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
  // Main processing pipeline
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

      // Stage 1: Extract audio from video (10%)
      onProgress?.('Extracting audio', 10);
      const audioFile = await VideoProcessingService.extractAudio(pipeline.videoFile);

      // Stage 2: Transcribe audio (60%)
      onProgress?.('Transcribing audio', 20);
      const transcriptionResult = await aiService.transcribe(audioFile, {
        language: pipeline.options?.language || 'en',
        speakerDiarization: true,
        wordTimestamps: true
      }, pipeline.options?.transcriptionProvider);

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
      const savedTranscript = await TranscriptSegmentService.createBatch(transcript);

      let highlights: ClipSegment[] = [];
      
      // Stage 4: Generate highlights if requested (30%)
      if (pipeline.options?.generateHighlights !== false) {
        onProgress?.('Analyzing highlights', 80);
        
        const highlightAnalysis = await aiService.detectHighlights(
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
          for (const clip of highlightClips) {
            const savedClip = await ClipSegmentService.create(clip);
            highlights.push(savedClip);
          }
        } else {
          highlights = highlightClips;
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

      // Analyze with AI
      const analysis = await aiService.detectHighlights(transcriptionResult, {
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
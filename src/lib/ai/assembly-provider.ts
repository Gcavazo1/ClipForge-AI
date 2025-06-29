import { AIProvider, TranscriptionResult, TranscriptionOptions } from './providers';
import { logger } from '../logger';

export class AssemblyAIProvider implements AIProvider {
  name = 'AssemblyAI';
  capabilities = {
    transcription: true,
    textAnalysis: false,
    highlightDetection: false,
  };

  private apiKey: string;
  private baseUrl = 'https://api.assemblyai.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioFile: File, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    try {
      logger.info('Starting AssemblyAI transcription', { 
        fileName: audioFile.name, 
        size: audioFile.size 
      });

      // Step 1: Upload audio file
      const uploadUrl = await this.uploadAudio(audioFile);

      // Step 2: Submit transcription request
      const transcriptId = await this.submitTranscription(uploadUrl, options);

      // Step 3: Poll for completion
      const result = await this.pollTranscription(transcriptId);

      logger.info('AssemblyAI transcription completed', { 
        transcriptId,
        duration: result.audio_duration 
      });

      return this.parseTranscriptionResult(result);
    } catch (error) {
      logger.error('AssemblyAI transcription failed', error as Error);
      throw error;
    }
  }

  private async uploadAudio(audioFile: File): Promise<string> {
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
      },
      body: audioFile,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return result.upload_url;
  }

  private async submitTranscription(audioUrl: string, options: TranscriptionOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: options.speakerDiarization || false,
        language_code: options.language || 'en',
        punctuate: true,
        format_text: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Transcription request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.id;
  }

  private async pollTranscription(transcriptId: string): Promise<any> {
    while (true) {
      const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
        headers: {
          'Authorization': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'completed') {
        return result;
      } else if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error}`);
      }

      // Wait 3 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  private parseTranscriptionResult(result: any): TranscriptionResult {
    return {
      segments: result.words?.map((word: any) => ({
        start: word.start / 1000, // Convert ms to seconds
        end: word.end / 1000,
        text: word.text,
        confidence: word.confidence,
        speaker: word.speaker,
      })) || [],
      language: result.language_code,
      duration: result.audio_duration,
    };
  }
}
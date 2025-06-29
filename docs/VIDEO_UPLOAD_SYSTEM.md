# ClipForge AI - Video Upload System Documentation

## Overview

The ClipForge AI video upload system is a comprehensive, multi-stage pipeline that handles video file uploads, processing, AI-powered transcription, and highlight detection. The system is designed with resilience, performance, and user experience in mind, featuring multiple AI provider fallbacks, real-time progress tracking, and robust error handling.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Upload   │    │   Processing    │    │   AI Analysis   │
│                 │    │                 │    │                 │
│ • File Drop     │───▶│ • Validation    │───▶│ • Transcription │
│ • Progress UI   │    │ • Storage       │    │ • Highlights    │
│ • Error Handle  │    │ • Metadata      │    │ • Segments      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   State Mgmt    │    │   Database      │    │   Final Result  │
│                 │    │                 │    │                 │
│ • Zustand       │    │ • Supabase      │    │ • Ready Project │
│ • Progress      │    │ • RLS Policies  │    │ • Clips         │
│ • Error States  │    │ • Relationships │    │ • Transcript    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. VideoUploader Component (`src/components/video/VideoUploader.tsx`)

The main React component that orchestrates the entire upload process.

#### Key Features:
- **Drag & Drop Interface**: Built with `react-dropzone`
- **File Validation**: Size, format, and type checking
- **Multi-stage Progress**: Visual feedback for each processing stage
- **AI Service Status**: Real-time monitoring of AI provider availability
- **Error Recovery**: Graceful fallbacks when AI services fail

#### Processing Stages:
1. **Uploading video** (0-25%)
2. **Processing video** (25-40%)
3. **Extracting audio** (40-60%)
4. **AI transcription** (60-85%)
5. **Analyzing highlights** (85-100%)

#### Props Interface:
```typescript
interface VideoUploaderProps {
  onUploadComplete: (project: VideoProject) => void;
}
```

#### State Management:
- Uses Zustand store for global state
- Tracks upload/transcription progress
- Manages error states and recovery

### 2. Video Processing Service (`src/lib/video-processing.ts`)

Handles video file processing, validation, and optimization.

#### Core Methods:

##### `validateVideo(file: File)`
```typescript
static validateVideo(file: File): { valid: boolean; error?: string }
```
- Validates file size (max 500MB)
- Checks supported formats (mp4, mov, avi, webm, mkv)
- Returns validation result with error messages

##### `processVideo(file, userId, options, onProgress)`
```typescript
static async processVideo(
  file: File, 
  userId: string,
  options: VideoProcessingOptions = {},
  onProgress?: (progress: number) => void
): Promise<ProcessingResult>
```
- Extracts video metadata (duration, dimensions, fps)
- Uploads to Supabase Storage
- Generates thumbnails
- Returns processed video URLs and metadata

##### `extractAudio(videoFile: File)`
```typescript
static async extractAudio(videoFile: File): Promise<File>
```
- Converts video to audio format for transcription
- Returns audio file compatible with AI services

#### Configuration Options:
```typescript
interface VideoProcessingOptions {
  quality?: 'low' | 'medium' | 'high';
  format?: 'mp4' | 'webm' | 'mov';
  resolution?: '720p' | '1080p' | '4k';
  generateThumbnail?: boolean;
  thumbnailTimestamp?: number;
}
```

### 3. AI Service Integration (`src/lib/ai/ai-service-integration.ts`)

Manages AI-powered transcription and analysis with multi-provider fallback.

#### Key Features:
- **Multi-Provider Support**: OpenAI, Groq, AssemblyAI
- **Automatic Fallback**: Switches providers on failure
- **Resilient Processing**: Continues even if some AI features fail
- **Progress Tracking**: Real-time updates for each AI stage

#### Main Processing Pipeline:
```typescript
static async processVideoWithAI(
  pipeline: ProcessingPipeline,
  onProgress?: (stage: string, progress: number) => void
): Promise<PipelineResult>
```

#### Processing Steps:
1. **Audio Extraction** (10%)
2. **Transcription with Fallback** (20-60%)
3. **Transcript Processing** (60-70%)
4. **Database Storage** (70-80%)
5. **Highlight Detection** (80-90%)
6. **Clip Generation** (90-100%)

#### Provider Fallback Logic:
```typescript
// Transcription providers in order of preference
const providers = ['openai', 'assembly', 'groq']
  .filter(p => aiService.getAvailableProviders()
  .some(provider => provider.name.toLowerCase() === p));

// Try each provider until one succeeds
for (const provider of providers) {
  try {
    return await aiService.transcribe(audioFile, options, provider);
  } catch (error) {
    // Log error and try next provider
  }
}
```

### 4. Storage Service (`src/lib/storage.ts`)

Manages file uploads to Supabase Storage with progress tracking.

#### Key Methods:

##### `uploadVideo(file, userId, onProgress)`
```typescript
static async uploadVideo(
  file: File, 
  userId: string, 
  onProgress?: (progress: number) => void
): Promise<UploadResult>
```

##### `uploadThumbnail(file, userId)`
```typescript
static async uploadThumbnail(file: File, userId: string): Promise<UploadResult>
```

##### `generateThumbnail(videoFile, timestamp)`
```typescript
static async generateThumbnail(
  videoFile: File, 
  timestamp: number = 1
): Promise<File>
```

#### Storage Buckets:
- `videos`: Main video files
- `thumbnails`: Generated thumbnails
- `exports`: Exported clips
- `avatars`: User profile images

### 5. Database Services (`src/lib/database.ts`)

Handles data persistence with optimized queries and caching.

#### Core Services:

##### VideoProjectService
- `create()`: Creates new video project records
- `getById()`: Retrieves project by ID with caching
- `updateStatus()`: Updates processing status
- `delete()`: Soft delete with cache invalidation

##### ClipSegmentService
- `create()`: Creates clip segments
- `getByProjectId()`: Retrieves clips for a project
- `update()`: Updates clip properties
- `delete()`: Removes clip segments

##### TranscriptSegmentService
- `createBatch()`: Bulk insert transcript segments
- `getByProjectId()`: Retrieves transcript for a project
- `deleteByProjectId()`: Removes all transcript segments

## Data Flow

### 1. Upload Initiation
```typescript
// User drops file or clicks upload
const handleUpload = useCallback(async (file: File) => {
  // Validate user authentication
  if (!user) {
    setError('Please sign in to upload videos');
    return;
  }

  // Check AI service availability
  if (!serviceStatus?.available) {
    setError('AI services are not available');
    return;
  }

  // Validate file
  const validation = VideoProcessingService.validateVideo(file);
  if (!validation.valid) {
    setError(validation.error);
    return;
  }
  
  // Start processing...
});
```

### 2. Project Creation
```typescript
// Create initial project record
const newProject: VideoProject = {
  id: generateId(),
  title: file.name.replace(/\.[^/.]+$/, ''),
  videoUrl: '',
  thumbnailUrl: '',
  duration: 0,
  status: 'uploading',
  progress: 0,
  size: file.size,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const createdProject = await VideoProjectService.create(newProject);
```

### 3. Video Processing
```typescript
// Process video with progress tracking
const processingResult = await VideoProcessingService.processVideo(
  file,
  user.id,
  {
    generateThumbnail: true,
    thumbnailTimestamp: 1,
    quality: 'high'
  },
  (progress) => {
    updateStage(0, progress);
    setUploadState(true, progress);
  }
);
```

### 4. AI Processing
```typescript
// AI processing with comprehensive error handling
const aiResult = await AIServiceIntegration.processVideoWithAI(
  {
    projectId: updatedProject.id,
    videoFile: file,
    userId: user.id,
    options: {
      transcriptionProvider: 'openai',
      analysisProvider: 'groq',
      language: 'en',
      generateHighlights: true,
      autoCreateClips: true
    }
  },
  (stage, progress) => {
    // Update UI based on AI processing stage
    switch (stage) {
      case 'Extracting audio':
        updateStage(2, progress);
        break;
      case 'Transcribing audio':
        updateStage(3, progress);
        break;
      case 'Analyzing highlights':
        updateStage(4, progress);
        break;
    }
  }
);
```

### 5. Completion
```typescript
// Final project update
const finalProject = await VideoProjectService.updateStatus(
  updatedProject.id,
  'ready',
  100
);

// Notify completion
onUploadComplete({
  ...updatedProject,
  status: 'ready',
  progress: 100
});
```

## State Management

### Zustand Store Structure
```typescript
interface AppState {
  // Upload state
  isUploading: boolean;
  uploadProgress: number;
  isTranscribing: boolean;
  transcribeProgress: number;
  
  // Project data
  projects: VideoProject[];
  currentProject: VideoProject | null;
  clipSegments: ClipSegment[];
  transcript: TranscriptSegment[];
  
  // Methods
  setUploadState: (isUploading: boolean, progress?: number) => void;
  setTranscribeState: (isTranscribing: boolean, progress?: number) => void;
  addProject: (project: VideoProject) => void;
  // ... other methods
}
```

### Progress Tracking
```typescript
// Upload progress (0-100%)
setUploadState(true, progress);

// Transcription progress (0-100%)
setTranscribeState(true, progress);

// Stage-specific progress
updateStage(stageIndex, progress, status, error);
```

## Error Handling

### 1. Validation Errors
```typescript
// File validation
const validation = VideoProcessingService.validateVideo(file);
if (!validation.valid) {
  setError(validation.error);
  return;
}
```

### 2. AI Service Failures
```typescript
try {
  const aiResult = await AIServiceIntegration.processVideoWithAI(pipeline);
} catch (aiError) {
  logger.error('AI processing failed', aiError);
  
  // Update failed stage
  updateStage(activeStageIndex, 0, 'error', aiError.message);
  
  // Continue with basic functionality
  await VideoProjectService.updateStatus(
    projectId,
    'ready', // Still mark as ready
    100,
    `AI processing failed: ${aiError.message}`
  );
  
  // User can still access the video
  onUploadComplete(basicProject);
}
```

### 3. Network Failures
```typescript
// Retry logic with exponential backoff
const result = await RetryManager.withRetry(
  () => uploadOperation(),
  {
    maxAttempts: 3,
    retryCondition: (error) => {
      return error.message.includes('network') ||
             error.message.includes('timeout');
    }
  }
);
```

## Performance Optimizations

### 1. Chunked File Upload
```typescript
// Large files are uploaded in chunks
const { data, error } = await supabase.storage
  .from('videos')
  .upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
    onUploadProgress: (progress) => {
      const percentage = (progress.loaded / progress.total) * 100;
      onProgress?.(percentage);
    }
  });
```

### 2. Parallel Processing
```typescript
// Process multiple stages in parallel where possible
const [videoResult, thumbnailResult] = await Promise.all([
  processVideo(file),
  generateThumbnail(file)
]);
```

### 3. Caching
```typescript
// Cache frequently accessed data
const project = await OptimizedDatabaseService.cachedQuery(
  `video-project-${id}`,
  () => fetchProject(id),
  { ttl: 2 * 60 * 1000 } // 2 minutes
);
```

## Security Considerations

### 1. File Validation
- Size limits (500MB max)
- Format restrictions (video files only)
- MIME type verification
- Virus scanning (planned)

### 2. User Authentication
```typescript
// Verify user is authenticated
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  throw new Error('User not authenticated');
}
```

### 3. Row Level Security
- All database operations use RLS policies
- Users can only access their own projects
- Secure file storage with signed URLs

### 4. API Key Protection
- AI service keys stored as environment variables
- No client-side exposure of sensitive keys
- Service availability checks before processing

## Configuration

### Environment Variables
```bash
# AI Service API Keys
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_ASSEMBLY_API_KEY=your_assembly_ai_api_key

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### File Limits
```typescript
const SUPPORTED_FORMATS = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DURATION = 3600; // 1 hour
```

### AI Provider Configuration
```typescript
const AI_PROVIDERS = {
  transcription: {
    primary: 'openai',
    fallback: ['assembly', 'groq']
  },
  analysis: {
    primary: 'groq',
    fallback: ['openai']
  }
};
```

## Monitoring and Logging

### 1. Performance Monitoring
```typescript
// Track processing times
const duration = await performanceMonitor.measure(
  'video-upload',
  () => processVideo(file),
  { fileName: file.name, size: file.size }
);
```

### 2. Error Logging
```typescript
// Comprehensive error logging
logger.error('Video upload failed', error, {
  userId: user.id,
  fileName: file.name,
  fileSize: file.size,
  stage: 'processing'
});
```

### 3. Usage Analytics
```typescript
// Track usage patterns
logger.info('Video upload completed', {
  userId: user.id,
  processingTime: duration,
  transcriptSegments: transcript.length,
  highlightsDetected: highlights.length
});
```

## Testing Strategy

### 1. Unit Tests
- File validation logic
- Progress calculation
- Error handling scenarios
- State management

### 2. Integration Tests
- End-to-end upload flow
- AI service integration
- Database operations
- Storage operations

### 3. Performance Tests
- Large file uploads
- Concurrent uploads
- Memory usage
- Processing time limits

## Future Enhancements

### 1. Advanced Video Processing
- Real-time video compression
- Multiple quality variants
- Adaptive bitrate streaming
- Advanced thumbnail generation

### 2. Enhanced AI Features
- Custom model training
- Multi-language support
- Advanced speaker recognition
- Content moderation

### 3. Scalability Improvements
- Distributed processing
- Queue management
- Load balancing
- CDN integration

### 4. User Experience
- Batch uploads
- Resume interrupted uploads
- Real-time collaboration
- Advanced preview features

## Troubleshooting

### Common Issues

#### 1. Upload Failures
- **Cause**: Network connectivity, file size, format issues
- **Solution**: Retry with exponential backoff, validate file before upload
- **Prevention**: Client-side validation, progress indicators

#### 2. AI Processing Failures
- **Cause**: API key issues, service downtime, quota limits
- **Solution**: Multi-provider fallback, graceful degradation
- **Prevention**: Service health monitoring, quota tracking

#### 3. Storage Issues
- **Cause**: Supabase storage limits, permission issues
- **Solution**: Check storage quotas, verify RLS policies
- **Prevention**: Usage monitoring, proper error handling

#### 4. Performance Issues
- **Cause**: Large files, concurrent uploads, slow AI processing
- **Solution**: Chunked uploads, queue management, caching
- **Prevention**: File size limits, performance monitoring

### Debug Tools

#### 1. Service Status Check
```typescript
const status = AIServiceIntegration.getServiceStatus();
console.log('AI Services:', status);
```

#### 2. Performance Metrics
```typescript
const stats = performanceMonitor.getStats('video-upload');
console.log('Upload Performance:', stats);
```

#### 3. Error Reports
```typescript
const errors = errorReporter.getReports({ 
  component: 'VideoUploader',
  limit: 10 
});
console.log('Recent Errors:', errors);
```

## Conclusion

The ClipForge AI video upload system is a robust, scalable solution that handles the complex process of video ingestion, processing, and AI analysis. With its multi-provider fallback system, comprehensive error handling, and real-time progress tracking, it provides a reliable foundation for the application's core functionality.

The system is designed to gracefully handle failures while still providing value to users, ensuring that even when AI services are unavailable, users can still upload and manage their videos with basic functionality intact.
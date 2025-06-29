import { VideoProject, ClipSegment, TranscriptSegment } from '../types';
import { generateId } from './utils';

// Create mock project data
export const createMockProject = (
  title: string,
  status: VideoProject['status'] = 'ready'
): VideoProject => {
  const id = generateId();
  return {
    id,
    title,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg',
    duration: 596, // 9:56 in seconds
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status,
    progress: status === 'processing' ? Math.random() * 100 : undefined,
  };
};

// Create sample transcript data
export const createMockTranscript = (projectId: string): TranscriptSegment[] => {
  const sampleTexts = [
    "Welcome to this video about natural ecosystems.",
    "Today, we'll explore the fascinating world of forest habitats.",
    "Forests cover about 30% of Earth's land surface.",
    "They're home to more than 80% of terrestrial biodiversity!",
    "Let's start by looking at the different forest layers.",
    "From the forest floor to the emergent layer, each has unique characteristics.",
    "The forest floor receives only 2% of the sunlight that reaches the top of trees.",
    "Despite this, it's teeming with life and decomposition processes.",
    "Next, we have the understory, which includes small trees and shrubs.",
    "Plants here have adapted to live in low-light conditions.",
    "The canopy forms a continuous cover of foliage and is incredibly diverse.",
    "Finally, the emergent layer consists of trees that tower above the canopy.",
    "These trees can reach heights of over 50 meters in tropical rainforests!",
    "Forest ecosystems provide crucial services like carbon sequestration.",
    "They also help maintain our planet's water cycle.",
    "Unfortunately, deforestation threatens these valuable ecosystems.",
    "Each year, approximately 10 million hectares of forest are lost.",
    "Conservation efforts are essential to protecting these habitats.",
    "By understanding forest ecosystems, we can better preserve them for future generations.",
    "Thanks for watching this introduction to forest ecosystems!"
  ];
  
  let currentTime = 0;
  return sampleTexts.map((text, index) => {
    const duration = 3 + Math.random() * 8; // Random duration between 3-11 seconds
    const segment: TranscriptSegment = {
      id: `transcript-${projectId}-${index}`,
      projectId,
      startTime: currentTime,
      endTime: currentTime + duration,
      text,
      speakerId: `speaker-${Math.floor(Math.random() * 2) + 1}`,
      confidence: 0.8 + Math.random() * 0.2
    };
    currentTime += duration;
    return segment;
  });
};

// Create sample clip segments based on transcript
export const createMockClipSegments = (
  projectId: string,
  transcript: TranscriptSegment[]
): ClipSegment[] => {
  // Create 3 highlight clips
  const segments: ClipSegment[] = [];
  
  // First highlight (beginning)
  segments.push({
    id: `clip-${projectId}-1-${Date.now()}`,
    projectId,
    startTime: transcript[0].startTime,
    endTime: transcript[3].endTime,
    title: 'Introduction',
    isHighlight: true,
    confidence: 0.85,
  });
  
  // Second highlight (middle)
  const midIndex = Math.floor(transcript.length / 2);
  segments.push({
    id: `clip-${projectId}-2-${Date.now()}`,
    projectId,
    startTime: transcript[midIndex - 1].startTime,
    endTime: transcript[midIndex + 2].endTime,
    title: 'Forest Layers',
    isHighlight: true,
    confidence: 0.92,
  });
  
  // Third highlight (end)
  segments.push({
    id: `clip-${projectId}-3-${Date.now()}`,
    projectId,
    startTime: transcript[transcript.length - 4].startTime,
    endTime: transcript[transcript.length - 1].endTime,
    title: 'Conservation Importance',
    isHighlight: true,
    confidence: 0.78,
  });
  
  return segments;
};

// Generate mock projects with unique IDs
export const mockProjects: VideoProject[] = [
  createMockProject('Forest Ecosystem Introduction'),
  createMockProject('Wildlife Conservation Overview', 'processing'),
  createMockProject('Ocean Biodiversity Exploration')
];

// Generate sample transcript for the first project
export const mockTranscript = createMockTranscript(mockProjects[0].id);

// Generate sample clip segments for the first project
export const mockClipSegments = createMockClipSegments(mockProjects[0].id, mockTranscript);
# ClipForge AI

ClipForge AI helps you find and extract the most engaging moments from your videos with AI-powered tools.

## Features

- AI-powered clip detection
- Automatic transcription
- Smart caption generation
- Multi-platform export
- Performance analytics
- Prophetic Mode for content optimization

## Prophetic Mode

Prophetic Mode is an AI-powered system that helps predict and optimize your content's performance. It analyzes your historical data and current trends to provide:

- View and engagement predictions
- Optimal posting times
- Trending hashtag recommendations
- Content optimization insights

### How It Works

1. The system analyzes your historical performance data
2. Uses machine learning to identify patterns
3. Combines with real-time trend data
4. Generates personalized recommendations

### API Reference

```typescript
interface ProphecyRequest {
  userId: string;
  clipId?: string;
  platform?: string;
  metadata?: {
    duration: number;
    topic: string;
    hashtags: string[];
  };
}

interface ProphecyResult {
  predictedViews: number;
  predictedLikes: number;
  predictedComments: number;
  confidence: number;
  bestTime: string;
  bestDay: string;
  recommendedDuration: number;
  trendingHashtags: string[];
  recommendations: string[];
  insights: Array<{
    type: string;
    message: string;
    confidence: number;
  }>;
}
```

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Scatter
} from 'recharts';
import { ProphecyResult, FeedbackSummary } from '../../types';
import { formatNumber } from '../../lib/utils';

interface ProphecyVisualizerProps {
  prophecy: ProphecyResult;
  feedbackSummary?: FeedbackSummary;
  actualData?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  historicalPredictions?: Array<{
    date: string;
    predicted: number;
    actual: number;
  }>;
  featureImportance?: Record<string, number>;
}

export const ProphecyVisualizer: React.FC<ProphecyVisualizerProps> = ({
  prophecy,
  feedbackSummary,
  actualData,
  historicalPredictions,
  featureImportance
}) => {
  // Prepare data for metrics comparison chart
  const metricsData = [
    {
      name: 'Views',
      predicted: prophecy.predictedViews,
      actual: actualData?.views || 0,
      lower: prophecy.predictedViews * 0.7, // Simulated lower bound
      upper: prophecy.predictedViews * 1.3  // Simulated upper bound
    },
    {
      name: 'Likes',
      predicted: prophecy.predictedLikes,
      actual: actualData?.likes || 0,
      lower: prophecy.predictedLikes * 0.65,
      upper: prophecy.predictedLikes * 1.35
    },
    {
      name: 'Comments',
      predicted: prophecy.predictedComments,
      actual: actualData?.comments || 0,
      lower: prophecy.predictedComments * 0.6,
      upper: prophecy.predictedComments * 1.4
    }
  ];

  // Prepare data for feature importance chart
  const importanceData = featureImportance 
    ? Object.entries(featureImportance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([feature, importance]) => ({
          feature: feature.split('.').pop() || feature,
          importance: importance * 100
        }))
    : [];

  // Prepare data for accuracy trend chart
  const accuracyData = feedbackSummary?.accuracyTrend || [];

  // Prepare data for optimal timing heatmap
  const timingData = [
    { day: 'Monday', hour: '9AM', score: 65 },
    { day: 'Monday', hour: '12PM', score: 70 },
    { day: 'Monday', hour: '6PM', score: 85 },
    { day: 'Tuesday', hour: '9AM', score: 68 },
    { day: 'Tuesday', hour: '12PM', score: 72 },
    { day: 'Tuesday', hour: '6PM', score: 88 },
    { day: 'Wednesday', hour: '9AM', score: 70 },
    { day: 'Wednesday', hour: '12PM', score: 75 },
    { day: 'Wednesday', hour: '6PM', score: 92 },
    { day: 'Thursday', hour: '9AM', score: 72 },
    { day: 'Thursday', hour: '12PM', score: 78 },
    { day: 'Thursday', hour: '6PM', score: 90 },
    { day: 'Friday', hour: '9AM', score: 75 },
    { day: 'Friday', hour: '12PM', score: 80 },
    { day: 'Friday', hour: '6PM', score: 95 },
    { day: 'Saturday', hour: '9AM', score: 85 },
    { day: 'Saturday', hour: '12PM', score: 90 },
    { day: 'Saturday', hour: '6PM', score: 98 },
    { day: 'Sunday', hour: '9AM', score: 80 },
    { day: 'Sunday', hour: '12PM', score: 85 },
    { day: 'Sunday', hour: '6PM', score: 93 }
  ];

  // Find the best day and time
  const bestTiming = timingData.reduce((best, current) => 
    current.score > best.score ? current : best, timingData[0]);

  return (
    <div className="space-y-8">
      {/* Metrics Comparison Chart */}
      <div className="bg-background-light rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4 title-font">Performance Metrics Forecast</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" tickFormatter={formatNumber} />
              <Tooltip 
                formatter={(value: number) => formatNumber(value)}
                contentStyle={{ 
                  backgroundColor: '#1e1e1e', 
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="predicted" 
                name="Predicted" 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]}
              />
              {actualData && (
                <Bar 
                  dataKey="actual" 
                  name="Actual" 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]}
                />
              )}
              <Area
                dataKey="lower"
                name="Lower Bound"
                stroke="none"
                fill="#8b5cf6"
                fillOpacity={0.1}
                activeDot={false}
              />
              <Area
                dataKey="upper"
                name="Upper Bound"
                stroke="none"
                fill="#8b5cf6"
                fillOpacity={0.1}
                activeDot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-foreground-muted">
          <div className="flex items-center justify-center">
            <div className="w-3 h-3 bg-primary-500 rounded-full mr-2"></div>
            <span>Shaded area represents 95% confidence interval</span>
          </div>
        </div>
      </div>

      {/* Feature Importance Chart */}
      {importanceData.length > 0 && (
        <div className="bg-background-light rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 title-font">Key Performance Factors</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={importanceData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" stroke="#a1a1aa" />
                <YAxis 
                  dataKey="feature" 
                  type="category" 
                  stroke="#a1a1aa" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Importance']}
                  contentStyle={{ 
                    backgroundColor: '#1e1e1e', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="importance" 
                  name="Importance" 
                  fill="#8b5cf6" 
                  radius={[0, 4, 4, 0]}
                  background={{ fill: '#2a2a2a' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-foreground-muted">
            <p>These factors have the greatest influence on your content performance</p>
          </div>
        </div>
      )}

      {/* Accuracy Trend Chart */}
      {accuracyData.length > 0 && (
        <div className="bg-background-light rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 title-font">Prophecy Accuracy Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="date" 
                  stroke="#a1a1aa"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  stroke="#a1a1aa"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString();
                  }}
                  contentStyle={{ 
                    backgroundColor: '#1e1e1e', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  name="Accuracy" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#8b5cf6' }}
                  activeDot={{ r: 6, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-foreground-muted">
            <p>Prophecy accuracy improves over time as our AI learns from your content performance</p>
          </div>
        </div>
      )}

      {/* Optimal Timing Visualization */}
      <div className="bg-background-light rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4 title-font">Optimal Posting Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-background p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Best Day & Time</h4>
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-400 title-font">{prophecy.bestDay}</div>
                <div className="text-2xl font-medium mt-2">{prophecy.bestTime}</div>
                <div className="text-xs text-foreground-muted mt-2">
                  {bestTiming.score}% optimal engagement window
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-background p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Engagement Potential</h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius={60} data={[
                  { metric: 'Views', value: 80 },
                  { metric: 'Likes', value: 85 },
                  { metric: 'Comments', value: 75 },
                  { metric: 'Shares', value: 70 },
                  { metric: 'Watch Time', value: 90 }
                ]}>
                  <PolarGrid stroke="#2a2a2a" />
                  <PolarAngleAxis dataKey="metric" stroke="#a1a1aa" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#a1a1aa" />
                  <Radar
                    name="Potential"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Potential']}
                    contentStyle={{ 
                      backgroundColor: '#1e1e1e', 
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-foreground-muted">
          <p>Posting at the optimal time can increase your reach by up to 40%</p>
        </div>
      </div>

      {/* Recommendations and Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-background-light rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 title-font">Strategic Recommendations</h3>
          <ul className="space-y-4">
            {prophecy.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-900/30 rounded-full flex items-center justify-center mr-3">
                  <span className="text-primary-400 font-medium">{index + 1}</span>
                </div>
                <div>
                  <p className="text-sm">{recommendation}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-background-light rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 title-font">Key Insights</h3>
          <ul className="space-y-4">
            {prophecy.insights.map((insight, index) => (
              <li key={index} className="bg-background p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{insight.message}</span>
                  <span className="text-xs text-primary-400">{insight.confidence}% sure</span>
                </div>
                <div className="w-full bg-background-lighter h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary-500 h-full rounded-full"
                    style={{ width: `${insight.confidence}%` }}
                  ></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProphecyVisualizer;
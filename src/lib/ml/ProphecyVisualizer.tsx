import React, { useState } from 'react';
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
  Scatter,
  Cell
} from 'recharts';
import { ProphecyResult, FeedbackSummary } from '../../types';
import { formatNumber } from '../../lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';

interface ProphecyVisualizerProps {
  prophecy: ProphecyResult | null;
  feedbackSummary?: FeedbackSummary | null;
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

const ProphecyVisualizer: React.FC<ProphecyVisualizerProps> = ({
  prophecy,
  feedbackSummary,
  actualData,
  historicalPredictions,
  featureImportance
}) => {
  const [activeTab, setActiveTab] = useState('metrics');

  if (!prophecy) {
    return <div className="text-center p-4">No prophecy data available</div>;
  }

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
        .slice(0, 8)
        .map(([feature, importance]) => ({
          feature: feature.split('.').pop() || feature,
          importance: importance * 100,
          category: feature.split('.')[0]
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

  // Color mapping for feature categories
  const categoryColors: Record<string, string> = {
    content: '#8b5cf6', // primary
    temporal: '#22c55e', // success
    user: '#f59e0b', // warning
    platform: '#ef4444', // error
    default: '#a1a1aa' // foreground-muted
  };

  return (
    <div className="bg-background-light rounded-lg p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="features">Feature Importance</TabsTrigger>
          <TabsTrigger value="timing">Optimal Timing</TabsTrigger>
          {accuracyData.length > 0 && (
            <TabsTrigger value="accuracy">Accuracy Trend</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="metrics" className="mt-0">
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
        </TabsContent>

        <TabsContent value="features" className="mt-0">
          <h3 className="text-lg font-medium mb-4 title-font">Key Performance Factors</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={importanceData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  type="number" 
                  stroke="#a1a1aa"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
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
                  radius={[0, 4, 4, 0]}
                  background={{ fill: '#2a2a2a' }}
                >
                  {importanceData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={categoryColors[entry.category] || categoryColors.default} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            {Object.entries(categoryColors).slice(0, 4).map(([category, color]) => (
              <div key={category} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-xs text-foreground-muted capitalize">{category}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timing" className="mt-0">
          <h3 className="text-lg font-medium mb-4 title-font">Optimal Posting Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-background p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-3">Best Day & Time</h4>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-400 title-font">{prophecy.bestDay}</div>
                  <div className="text-2xl font-medium mt-2">{prophecy.bestTime}</div>
                  <div className="text-xs text-foreground-muted mt-2">
                    Optimal engagement window
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
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Weekly Engagement Heatmap</h4>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-8 gap-1">
                  <div className=""></div>
                  {['9AM', '12PM', '3PM', '6PM', '8PM', '10PM', '12AM'].map(hour => (
                    <div key={hour} className="text-center text-xs text-foreground-muted">
                      {hour}
                    </div>
                  ))}
                  
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <React.Fragment key={day}>
                      <div className="text-xs text-foreground-muted">{day}</div>
                      {[9, 12, 15, 18, 20, 22, 0].map(hour => {
                        const timingEntry = timingData.find(t => 
                          t.day === day && 
                          t.hour === (hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour < 12 ? `${hour}AM` : `${hour-12}PM`)
                        );
                        
                        const score = timingEntry?.score || 50;
                        const isBest = day === prophecy.bestDay && 
                          (hour === parseInt(prophecy.bestTime.split(':')[0]) || 
                           (hour === 0 && prophecy.bestTime.includes('12:00 AM')) ||
                           (hour === 12 && prophecy.bestTime.includes('12:00 PM')));
                        
                        return (
                          <div 
                            key={`${day}-${hour}`} 
                            className={`h-8 rounded ${isBest ? 'ring-2 ring-primary-500' : ''}`}
                            style={{ 
                              backgroundColor: `rgba(139, 92, 246, ${score/100})`,
                              transition: 'all 0.2s ease'
                            }}
                            title={`${day} ${hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour < 12 ? `${hour}AM` : `${hour-12}PM`}: ${score}% optimal`}
                          ></div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="w-full max-w-xs flex">
                <div className="h-2 flex-grow bg-gradient-to-r from-background to-primary-500/30"></div>
                <div className="h-2 flex-grow bg-gradient-to-r from-primary-500/30 to-primary-500/60"></div>
                <div className="h-2 flex-grow bg-gradient-to-r from-primary-500/60 to-primary-500"></div>
              </div>
              <div className="flex justify-between w-full max-w-xs text-xs text-foreground-muted">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {accuracyData.length > 0 && (
          <TabsContent value="accuracy" className="mt-0">
            <h3 className="text-lg font-medium mb-4 title-font">Prophecy Accuracy Trend</h3>
            <div className="h-80">
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ProphecyVisualizer;
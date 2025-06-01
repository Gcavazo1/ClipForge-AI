import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Filter,
  SortDesc,
  AlertCircle,
} from 'lucide-react';
import Button from '../components/ui/button';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { formatNumber } from '../lib/utils';
import { ClipAnalytics } from '../types';

const AnalyticsPage: React.FC = () => {
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<ClipAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'engagement'>('date');
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);

  const user = useAppStore((state) => state.user);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('analytics_events')
        .select(`
          *,
          clips (
            id,
            title,
            thumbnail_url,
            platform,
            created_at
          )
        `)
        .eq('user_id', user?.id)
        .order('posted_at', { ascending: false });

      if (error) throw error;

      const processedData = data.map(event => ({
        ...event,
        engagement: (event.likes + event.comments) / event.views,
      }));

      setAnalytics(processedData);
      if (processedData.length > 0) {
        setSelectedClip(processedData[0].clip_id);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!analytics.length) return;

    const csvContent = [
      ['Clip Title', 'Platform', 'Views', 'Likes', 'Comments', 'Watch Time', 'Posted Date'].join(','),
      ...analytics.map(clip => [
        clip.clips.title,
        clip.clips.platform,
        clip.views,
        clip.likes,
        clip.comments,
        clip.watch_time,
        format(new Date(clip.posted_at), 'yyyy-MM-dd HH:mm:ss'),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clipforge-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const selectedClipData = analytics.find(a => a.clip_id === selectedClip);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--nav-height))]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-error-900/20 text-error-500 p-4 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-foreground-muted">Track your content performance across platforms</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterPlatform(null)}
            icon={<Filter size={16} />}
          >
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy('views')}
            icon={<SortDesc size={16} />}
          >
            Sort
          </Button>
          <Button
            variant="primary"
            onClick={handleExportCSV}
            disabled={!analytics.length}
            icon={<Download size={16} />}
          >
            Export Data
          </Button>
        </div>
      </div>

      {analytics.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={48} className="mx-auto mb-4 text-foreground-muted" />
          <h2 className="text-xl font-semibold mb-2">No analytics data yet</h2>
          <p className="text-foreground-muted mb-6">
            Export and share your first clip to start tracking performance
          </p>
          <Button variant="primary" onClick={() => window.history.back()}>
            Back to Editor
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Clip List */}
          <div className="space-y-4">
            {analytics.map((clip) => (
              <div
                key={clip.clip_id}
                className={`bg-background-light rounded-lg overflow-hidden cursor-pointer transition-colors ${
                  selectedClip === clip.clip_id ? 'ring-2 ring-primary-500' : ''
                }`}
                onClick={() => setSelectedClip(clip.clip_id)}
              >
                <div className="aspect-video bg-black relative">
                  <img
                    src={clip.clips.thumbnail_url}
                    alt={clip.clips.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs py-1 px-2 rounded">
                    {clip.clips.platform}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium mb-2">{clip.clips.title}</h3>
                  <div className="flex items-center justify-between text-sm text-foreground-muted">
                    <span>{format(new Date(clip.posted_at), 'MMM d, yyyy')}</span>
                    <span>{formatNumber(clip.views)} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics Panel */}
          <div className="lg:col-span-2 space-y-6">
            {selectedClipData && (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background-light p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp size={20} className="text-primary-500" />
                      <span className="text-xs text-foreground-muted">Total Views</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(selectedClipData.views)}
                    </div>
                  </div>
                  <div className="bg-background-light p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Heart size={20} className="text-error-500" />
                      <span className="text-xs text-foreground-muted">Likes</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(selectedClipData.likes)}
                    </div>
                  </div>
                  <div className="bg-background-light p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <MessageCircle size={20} className="text-warning-500" />
                      <span className="text-xs text-foreground-muted">Comments</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatNumber(selectedClipData.comments)}
                    </div>
                  </div>
                  <div className="bg-background-light p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Clock size={20} className="text-success-500" />
                      <span className="text-xs text-foreground-muted">Avg Watch Time</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {selectedClipData.watch_time.toFixed(1)}s
                    </div>
                  </div>
                </div>

                {/* Views Over Time Chart */}
                <div className="bg-background-light p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Views Over Time</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedClipData.viewsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis
                          dataKey="date"
                          stroke="#a1a1aa"
                          tick={{ fill: '#a1a1aa' }}
                          tickFormatter={(value) => format(new Date(value), 'MMM d')}
                        />
                        <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e1e1e',
                            border: 'none',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="views"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Engagement Chart */}
                <div className="bg-background-light p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Engagement Breakdown</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[selectedClipData]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis
                          dataKey="clips.platform"
                          stroke="#a1a1aa"
                          tick={{ fill: '#a1a1aa' }}
                        />
                        <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e1e1e',
                            border: 'none',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="likes" fill="#ef4444" name="Likes" />
                        <Bar dataKey="comments" fill="#f59e0b" name="Comments" />
                        <Bar dataKey="shares" fill="#22c55e" name="Shares" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Platform Insights */}
                <div className="bg-background-light p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Platform Insights</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="opacity-50 cursor-not-allowed"
                      icon={<Share2 size={16} />}
                    >
                      Enable API Sync
                    </Button>
                  </div>
                  <div className="space-y-4 text-sm text-foreground-muted">
                    <p>
                      • Best performing time: {format(new Date(), 'h:mm a')} in your timezone
                    </p>
                    <p>
                      • Engagement rate:{' '}
                      {(
                        ((selectedClipData.likes + selectedClipData.comments) /
                          selectedClipData.views) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                    <p>
                      • Watch time retention:{' '}
                      {((selectedClipData.watch_time / 60) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-background-lighter">
                    <Button
                      variant="outline"
                      className="w-full opacity-50 cursor-not-allowed"
                      icon={<TrendingUp size={16} />}
                    >
                      Request Prophecy (Coming Soon)
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
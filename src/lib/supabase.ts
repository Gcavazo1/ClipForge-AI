import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function simulateAnalytics(clipId: string, platform: string) {
  const baseViews = Math.floor(Math.random() * 9900) + 100; // 100-10k views
  const baseLikes = Math.floor(Math.random() * 495) + 5; // 5-500 likes
  const baseComments = Math.floor(Math.random() * 50); // 0-50 comments
  const baseWatchTime = Math.random() * 40 + 15; // 15-55 seconds

  const analyticsData = {
    clip_id: clipId,
    platform,
    views: baseViews,
    likes: baseLikes,
    comments: baseComments,
    watch_time: baseWatchTime,
    posted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('analytics_events')
    .insert([analyticsData])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateAnalytics(eventId: string) {
  const growthRate = Math.random() * 0.2 + 0.1; // 10-30% growth
  
  const { data: currentData } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (!currentData) return;

  const updatedData = {
    views: Math.floor(currentData.views * (1 + growthRate)),
    likes: Math.floor(currentData.likes * (1 + growthRate)),
    comments: Math.floor(currentData.comments * (1 + growthRate / 2)),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('analytics_events')
    .update(updatedData)
    .eq('id', eventId)
    .select();

  if (error) throw error;
  return data[0];
}
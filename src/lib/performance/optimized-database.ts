import { supabase } from '../supabase';
import { cacheManager } from './cache-manager';
import { performanceMonitor } from './performance-monitor';
import { RetryManager } from '../error-handling/retry-manager';
import { logger } from '../logger';

export class OptimizedDatabaseService {
  // Cached query with automatic retry
  static async cachedQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: {
      ttl?: number;
      retryOptions?: Parameters<typeof RetryManager.withRetry>[1];
    } = {}
  ): Promise<T> {
    const { ttl = 5 * 60 * 1000, retryOptions = {} } = options;

    return cacheManager.cached(
      queryKey,
      () => performanceMonitor.measure(
        'database-query',
        () => RetryManager.withRetry(queryFn, {
          maxAttempts: 3,
          retryCondition: (error) => {
            // Retry on connection errors, timeouts, and temporary failures
            return error.message.includes('connection') ||
                   error.message.includes('timeout') ||
                   error.message.includes('temporary');
          },
          ...retryOptions
        }),
        { queryKey }
      ),
      ttl
    );
  }

  // Batch operations for better performance
  static async batchInsert<T>(
    table: string,
    records: T[],
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { data, error } = await performanceMonitor.measure(
        'database-batch-insert',
        async () => {
          return supabase
            .from(table)
            .insert(batch)
            .select();
        },
        { table, batchSize: batch.length }
      );

      if (error) throw error;
      results.push(...(data || []));
    }

    return results;
  }

  // Optimized pagination
  static async paginatedQuery<T>(
    table: string,
    options: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      ascending?: boolean;
      filters?: Record<string, any>;
      select?: string;
    } = {}
  ): Promise<{
    data: T[];
    count: number;
    hasMore: boolean;
    page: number;
    pageSize: number;
  }> {
    const {
      page = 1,
      pageSize = 20,
      orderBy = 'created_at',
      ascending = false,
      filters = {},
      select = '*'
    } = options;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(table)
      .select(select, { count: 'exact' })
      .range(from, to)
      .order(orderBy, { ascending });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error, count } = await performanceMonitor.measure(
      'database-paginated-query',
      () => query,
      { table, page, pageSize, filters }
    );

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      hasMore: (count || 0) > to + 1,
      page,
      pageSize
    };
  }

  // Bulk update with optimistic locking
  static async bulkUpdate<T>(
    table: string,
    updates: Array<{ id: string; data: Partial<T>; version?: number }>,
    batchSize: number = 50
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async ({ id, data, version }) => {
        let query = supabase
          .from(table)
          .update({
            ...data,
            updated_at: new Date().toISOString(),
            version: version ? version + 1 : undefined
          })
          .eq('id', id);

        // Add optimistic locking if version provided
        if (version !== undefined) {
          query = query.eq('version', version);
        }

        const { data: result, error } = await query.select().single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error(`Optimistic lock failed for record ${id}`);
          }
          throw error;
        }

        return result;
      });

      const batchResults = await performanceMonitor.measure(
        'database-bulk-update',
        () => Promise.all(batchPromises),
        { table, batchSize: batch.length }
      );

      results.push(...batchResults);
    }

    return results;
  }

  // Connection pooling and health check
  static async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    error?: string;
  }> {
    try {
      const start = performance.now();
      
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      const latency = performance.now() - start;

      if (error) {
        return {
          healthy: false,
          latency,
          error: error.message
        };
      }

      return {
        healthy: true,
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        latency: 0,
        error: (error as Error).message
      };
    }
  }

  // Clear related caches when data changes
  static invalidateCache(patterns: string[]): void {
    patterns.forEach(pattern => {
      const stats = cacheManager.getStats();
      stats.keys
        .filter(key => key.includes(pattern))
        .forEach(key => cacheManager.delete(key));
    });

    logger.debug('Cache invalidated', { patterns });
  }

  // Preload critical data
  static async preloadCriticalData(userId: string): Promise<void> {
    const preloadTasks = [
      // Preload user profile
      this.cachedQuery(
        `user-profile-${userId}`,
        async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return data;
        }
      ),

      // Preload recent projects
      this.cachedQuery(
        `user-projects-${userId}`,
        async () => {
          const { data } = await supabase
            .from('video_projects')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(10);
          return data;
        }
      )
    ];

    await Promise.allSettled(preloadTasks);
    logger.debug('Critical data preloaded', { userId });
  }
}
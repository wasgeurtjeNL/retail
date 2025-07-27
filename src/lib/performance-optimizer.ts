// =====================================================
// PERFORMANCE OPTIMIZER - System Performance Management
// Caching, monitoring, and optimization for commercial acquisition system
// =====================================================

import { getServiceRoleClient } from './supabase';

export interface CacheItem<T = any> {
  key: string;
  value: T;
  expires: number;
  hits: number;
  lastAccess: number;
  size: number;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  activeRequests: number;
  memoryUsage: number;
  dbQueryCount: number;
  apiCallCount: number;
  errorRate: number;
}

export interface OptimizationResult {
  category: string;
  optimization: string;
  impact: 'high' | 'medium' | 'low';
  implemented: boolean;
  estimatedImprovement: string;
  description: string;
}

export class PerformanceOptimizer {
  private cache = new Map<string, CacheItem>();
  private requestMetrics = new Map<string, number[]>();
  private dbQueryLog: { query: string; duration: number; timestamp: number }[] = [];
  private apiCallLog: { endpoint: string; duration: number; timestamp: number }[] = [];
  private errorLog: { error: string; timestamp: number; endpoint?: string }[] = [];
  
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly DEFAULT_TTL = 300000; // 5 minutes
  private readonly METRICS_RETENTION = 3600000; // 1 hour

  constructor() {
    // Start periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Every minute
    
    // Start metrics collection
    setInterval(() => this.collectMetrics(), 30000); // Every 30 seconds
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access statistics
    item.hits++;
    item.lastAccess = Date.now();
    
    return item.value as T;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.DEFAULT_TTL);
    const size = this.estimateSize(value);
    
    // Check cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      key,
      value,
      expires,
      hits: 0,
      lastAccess: Date.now(),
      size
    });
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalSize: number;
    topKeys: Array<{ key: string; hits: number; size: number }>;
  } {
    const items = Array.from(this.cache.values());
    const totalHits = items.reduce((sum, item) => sum + item.hits, 0);
    const totalAccess = items.length * 10; // Estimate based on cache usage
    
    return {
      size: this.cache.size,
      hitRate: totalAccess > 0 ? (totalHits / totalAccess) * 100 : 0,
      totalSize: items.reduce((sum, item) => sum + item.size, 0),
      topKeys: items
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10)
        .map(item => ({
          key: item.key,
          hits: item.hits,
          size: item.size
        }))
    };
  }

  /**
   * Cache database query results
   */
  async cacheDBQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cacheKey = `db:${queryKey}`;
    const cached = this.get<T>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }
    
    const startTime = Date.now();
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    // Log query performance
    this.logDBQuery(queryKey, duration);
    
    // Cache result
    this.set(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Cache API call results
   */
  async cacheAPICall<T>(
    endpoint: string,
    callFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cacheKey = `api:${endpoint}`;
    const cached = this.get<T>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }
    
    const startTime = Date.now();
    try {
      const result = await callFn();
      const duration = Date.now() - startTime;
      
      // Log API call performance
      this.logAPICall(endpoint, duration);
      
      // Cache result
      this.set(cacheKey, result, ttl);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logAPICall(endpoint, duration);
      this.logError(error instanceof Error ? error.message : String(error), endpoint);
      throw error;
    }
  }

  /**
   * Measure request performance
   */
  measureRequest<T>(endpoint: string, requestFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    return requestFn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.recordRequestTime(endpoint, duration);
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.recordRequestTime(endpoint, duration);
        this.logError(error instanceof Error ? error.message : String(error), endpoint);
        throw error;
      });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const cacheStats = this.getCacheStats();
    const recentRequests = this.getRecentRequestTimes();
    const recentErrors = this.getRecentErrors();
    
    return {
      cacheHitRate: cacheStats.hitRate,
      avgResponseTime: this.calculateAverageResponseTime(recentRequests),
      activeRequests: this.getActiveRequestCount(),
      memoryUsage: this.estimateMemoryUsage(),
      dbQueryCount: this.getRecentDBQueries().length,
      apiCallCount: this.getRecentAPICalls().length,
      errorRate: recentErrors.length > 0 ? (recentErrors.length / recentRequests.length) * 100 : 0
    };
  }

  /**
   * Analyze performance and generate optimization recommendations
   */
  analyzePerformance(): OptimizationResult[] {
    const metrics = this.getPerformanceMetrics();
    const optimizations: OptimizationResult[] = [];

    // Cache hit rate optimization
    if (metrics.cacheHitRate < 70) {
      optimizations.push({
        category: 'Caching',
        optimization: 'Improve cache hit rate',
        impact: 'high',
        implemented: false,
        estimatedImprovement: '30-50% faster response times',
        description: 'Increase cache TTL for stable data and implement more aggressive caching strategies'
      });
    }

    // Response time optimization
    if (metrics.avgResponseTime > 1000) {
      optimizations.push({
        category: 'Response Time',
        optimization: 'Reduce average response time',
        impact: 'high',
        implemented: false,
        estimatedImprovement: '40-60% faster responses',
        description: 'Optimize database queries and implement query result caching'
      });
    }

    // Database query optimization
    if (metrics.dbQueryCount > 50) {
      optimizations.push({
        category: 'Database',
        optimization: 'Reduce database query frequency',
        impact: 'medium',
        implemented: false,
        estimatedImprovement: '20-30% reduction in DB load',
        description: 'Implement query batching and result caching for frequently accessed data'
      });
    }

    // API call optimization
    if (metrics.apiCallCount > 20) {
      optimizations.push({
        category: 'External APIs',
        optimization: 'Optimize external API usage',
        impact: 'medium',
        implemented: false,
        estimatedImprovement: '25-40% cost reduction',
        description: 'Implement intelligent caching and rate limiting for external API calls'
      });
    }

    // Error rate optimization
    if (metrics.errorRate > 5) {
      optimizations.push({
        category: 'Error Handling',
        optimization: 'Reduce error rate',
        impact: 'high',
        implemented: false,
        estimatedImprovement: '80-90% error reduction',
        description: 'Implement better input validation and error recovery mechanisms'
      });
    }

    // Memory usage optimization
    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      optimizations.push({
        category: 'Memory Management',
        optimization: 'Optimize memory usage',
        impact: 'medium',
        implemented: false,
        estimatedImprovement: '30-50% memory reduction',
        description: 'Implement more aggressive cache eviction and reduce object retention'
      });
    }

    return optimizations;
  }

  /**
   * Apply automatic optimizations
   */
  async applyOptimizations(): Promise<void> {
    console.log('[Performance] Applying automatic optimizations');

    // Optimize cache size
    await this.optimizeCacheSize();
    
    // Clean up old metrics
    await this.cleanupOldMetrics();
    
    // Optimize database connection pool
    await this.optimizeDBConnections();
    
    // Log optimization
    await this.logOptimization();
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<{
    metrics: PerformanceMetrics;
    optimizations: OptimizationResult[];
    recommendations: string[];
    trend: 'improving' | 'stable' | 'degrading';
  }> {
    const metrics = this.getPerformanceMetrics();
    const optimizations = this.analyzePerformance();
    const recommendations = this.generateRecommendations(metrics, optimizations);
    const trend = await this.calculatePerformanceTrend();

    return {
      metrics,
      optimizations,
      recommendations,
      trend
    };
  }

  // Private helper methods

  private evictLRU(): void {
    const items = Array.from(this.cache.entries());
    if (items.length === 0) return;
    
    // Find least recently used item
    const lru = items.reduce((min, [key, item]) => 
      item.lastAccess < min[1].lastAccess ? [key, item] : min
    );
    
    this.cache.delete(lru[0]);
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Remove expired cache items
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
    
    // Clean up old metrics
    const cutoff = now - this.METRICS_RETENTION;
    
    this.dbQueryLog = this.dbQueryLog.filter(log => log.timestamp > cutoff);
    this.apiCallLog = this.apiCallLog.filter(log => log.timestamp > cutoff);
    this.errorLog = this.errorLog.filter(log => log.timestamp > cutoff);
  }

  private estimateSize(value: any): number {
    // Simple size estimation
    return JSON.stringify(value).length * 2; // Rough estimate for UTF-16
  }

  private logDBQuery(query: string, duration: number): void {
    this.dbQueryLog.push({
      query,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only recent queries
    if (this.dbQueryLog.length > 1000) {
      this.dbQueryLog = this.dbQueryLog.slice(-500);
    }
  }

  private logAPICall(endpoint: string, duration: number): void {
    this.apiCallLog.push({
      endpoint,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only recent calls
    if (this.apiCallLog.length > 1000) {
      this.apiCallLog = this.apiCallLog.slice(-500);
    }
  }

  private logError(error: string, endpoint?: string): void {
    this.errorLog.push({
      error,
      endpoint,
      timestamp: Date.now()
    });
    
    // Keep only recent errors
    if (this.errorLog.length > 500) {
      this.errorLog = this.errorLog.slice(-250);
    }
  }

  private recordRequestTime(endpoint: string, duration: number): void {
    if (!this.requestMetrics.has(endpoint)) {
      this.requestMetrics.set(endpoint, []);
    }
    
    const times = this.requestMetrics.get(endpoint)!;
    times.push(duration);
    
    // Keep only recent measurements
    if (times.length > 100) {
      times.splice(0, times.length - 50);
    }
  }

  private getRecentRequestTimes(): number[] {
    const allTimes: number[] = [];
    for (const times of this.requestMetrics.values()) {
      allTimes.push(...times);
    }
    return allTimes;
  }

  private getRecentErrors(): typeof this.errorLog {
    const cutoff = Date.now() - 3600000; // Last hour
    return this.errorLog.filter(log => log.timestamp > cutoff);
  }

  private getRecentDBQueries(): typeof this.dbQueryLog {
    const cutoff = Date.now() - 3600000; // Last hour
    return this.dbQueryLog.filter(log => log.timestamp > cutoff);
  }

  private getRecentAPICalls(): typeof this.apiCallLog {
    const cutoff = Date.now() - 3600000; // Last hour
    return this.apiCallLog.filter(log => log.timestamp > cutoff);
  }

  private calculateAverageResponseTime(times: number[]): number {
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private getActiveRequestCount(): number {
    // This would track active requests in a real implementation
    return 0;
  }

  private estimateMemoryUsage(): number {
    // Estimate cache memory usage
    return Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.size, 0);
  }

  private async optimizeCacheSize(): Promise<void> {
    const stats = this.getCacheStats();
    
    // If cache is getting full, remove least used items
    if (this.cache.size > this.MAX_CACHE_SIZE * 0.8) {
      const items = Array.from(this.cache.entries());
      const toRemove = items
        .sort(([,a], [,b]) => a.hits - b.hits)
        .slice(0, Math.floor(this.cache.size * 0.2));
      
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private async cleanupOldMetrics(): Promise<void> {
    const cutoff = Date.now() - this.METRICS_RETENTION * 2;
    
    this.dbQueryLog = this.dbQueryLog.filter(log => log.timestamp > cutoff);
    this.apiCallLog = this.apiCallLog.filter(log => log.timestamp > cutoff);
    this.errorLog = this.errorLog.filter(log => log.timestamp > cutoff);
  }

  private async optimizeDBConnections(): Promise<void> {
    // In a real implementation, this would optimize database connection pooling
    console.log('[Performance] Database connection optimization would be implemented here');
  }

  private async logOptimization(): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      const metrics = this.getPerformanceMetrics();
      
      await supabase
        .from('commercial_performance_metrics')
        .insert({
          metric_type: 'performance_optimization',
          category: 'system',
          value: metrics.avgResponseTime,
          metadata: {
            cache_hit_rate: metrics.cacheHitRate,
            memory_usage: metrics.memoryUsage,
            db_query_count: metrics.dbQueryCount,
            api_call_count: metrics.apiCallCount,
            error_rate: metrics.errorRate,
            optimization_timestamp: new Date().toISOString()
          }
        });
        
    } catch (error) {
      console.error('[Performance] Error logging optimization:', error);
    }
  }

  private generateRecommendations(
    metrics: PerformanceMetrics, 
    optimizations: OptimizationResult[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.cacheHitRate < 50) {
      recommendations.push('Implement more aggressive caching for frequently accessed data');
    }

    if (metrics.avgResponseTime > 2000) {
      recommendations.push('Optimize database queries and consider query result caching');
    }

    if (metrics.errorRate > 10) {
      recommendations.push('Implement better error handling and input validation');
    }

    if (optimizations.filter(o => o.impact === 'high').length > 2) {
      recommendations.push('Address high-impact performance optimizations as a priority');
    }

    if (metrics.apiCallCount > 100) {
      recommendations.push('Implement API call batching and more aggressive caching');
    }

    return recommendations;
  }

  private async calculatePerformanceTrend(): Promise<'improving' | 'stable' | 'degrading'> {
    try {
      const supabase = getServiceRoleClient();
      
      const { data: recentMetrics } = await supabase
        .from('commercial_performance_metrics')
        .select('value, created_at')
        .eq('metric_type', 'performance_optimization')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!recentMetrics || recentMetrics.length < 3) {
        return 'stable';
      }

      const values = recentMetrics.map(m => m.value);
      const recent = values.slice(0, 3).reduce((sum, val) => sum + val, 0) / 3;
      const older = values.slice(-3).reduce((sum, val) => sum + val, 0) / 3;

      if (recent < older * 0.9) return 'improving'; // 10% improvement
      if (recent > older * 1.1) return 'degrading'; // 10% degradation
      return 'stable';

    } catch (error) {
      console.error('[Performance] Error calculating trend:', error);
      return 'stable';
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = this.getPerformanceMetrics();
      const supabase = getServiceRoleClient();
      
      await supabase
        .from('commercial_performance_metrics')
        .insert({
          metric_type: 'system_performance',
          category: 'system',
          value: metrics.avgResponseTime,
          metadata: {
            cache_hit_rate: metrics.cacheHitRate,
            memory_usage: metrics.memoryUsage,
            active_requests: metrics.activeRequests,
            db_query_count: metrics.dbQueryCount,
            api_call_count: metrics.apiCallCount,
            error_rate: metrics.errorRate,
            cache_size: this.cache.size,
            collected_at: new Date().toISOString()
          }
        });

    } catch (error) {
      console.error('[Performance] Error collecting metrics:', error);
    }
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer(); 
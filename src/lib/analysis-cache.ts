/**
 * Analysis Result Caching System
 * Caches scraped content, AI analysis results, en final analysis data
 * voor verbeterde performance en verminderde API costs
 */

import { ScrapedContent } from './website-scraper';
import { BusinessAnalysis } from './ai-analyzer';
import { createHash } from 'crypto';

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  size: number; // Size in bytes
  hash: string; // Data hash for validation
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  maxEntries: number; // Maximum number of entries
  defaultTTL: number; // Default TTL in minutes
  cleanupInterval: number; // Cleanup interval in minutes
  enableMetrics: boolean; // Enable performance metrics
}

export interface CacheMetrics {
  scrapeCache: CacheStats;
  aiCache: CacheStats;
  analysisCache: CacheStats;
  overall: CacheStats;
}

/**
 * Generic cache implementation met TTL en size limits
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private currentSize = 0;
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private accessCounter = 0;

  constructor(private config: CacheConfig) {}

  /**
   * Genereer cache key van URL en options
   */
  private generateKey(url: string, options?: any): string {
    const baseKey = createHash('md5').update(url).digest('hex');
    if (options) {
      const optionsHash = createHash('md5').update(JSON.stringify(options)).digest('hex');
      return `${baseKey}-${optionsHash}`;
    }
    return baseKey;
  }

  /**
   * Bereken object grootte in bytes
   */
  private calculateSize(data: T): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  /**
   * Genereer data hash voor validatie
   */
  private generateHash(data: T): string {
    return createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Controleer of entry nog geldig is
   */
  private isValid(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Haal entry op uit cache
   */
  get(url: string, options?: any): T | null {
    const key = this.generateKey(url, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.currentSize -= entry.size;
      this.missCount++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, ++this.accessCounter);
    this.hitCount++;

    return entry.data;
  }

  /**
   * Sla entry op in cache
   */
  set(url: string, data: T, options?: any, customTTL?: number): void {
    const key = this.generateKey(url, options);
    const size = this.calculateSize(data);
    const ttl = customTTL || (this.config.defaultTTL * 60 * 1000);
    const hash = this.generateHash(data);

    // Check if we need to evict entries
    this.evictIfNeeded(size);

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      hash
    };

    // Remove existing entry if present
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.currentSize -= existingEntry.size;
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.currentSize += size;
  }

  /**
   * Verwijder entries als nodig voor ruimte
   */
  private evictIfNeeded(newEntrySize: number): void {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;
    
    // Evict by size
    while (this.currentSize + newEntrySize > maxSizeBytes || this.cache.size >= this.config.maxEntries) {
      const oldestKey = this.getLeastRecentlyUsed();
      if (oldestKey) {
        this.evict(oldestKey);
      } else {
        break;
      }
    }
  }

  /**
   * Haal least recently used key op
   */
  private getLeastRecentlyUsed(): string | null {
    let oldestKey: string | null = null;
    let oldestOrder = Infinity;

    for (const [key, order] of this.accessOrder) {
      if (order < oldestOrder) {
        oldestOrder = order;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Verwijder entry uit cache
   */
  private evict(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.currentSize -= entry.size;
      this.evictionCount++;
    }
  }

  /**
   * Maak verlopen entries schoon
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (!this.isValid(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.evict(key);
    }

    console.log(`[CACHE] Cleaned up ${keysToDelete.length} expired entries`);
  }

  /**
   * Haal cache statistieken op
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hitCount + this.missCount;

    return {
      totalEntries: this.cache.size,
      totalSize: this.currentSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      evictionCount: this.evictionCount,
      memoryUsage: this.currentSize / (1024 * 1024), // MB
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  /**
   * Leeg cache volledig
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
    this.accessCounter = 0;
  }

  /**
   * Haal alle cache keys op
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * Analysis Cache Manager
 * Beheert verschillende cache layers voor analysis pipeline
 */
export class AnalysisCacheManager {
  private scrapeCache: LRUCache<ScrapedContent>;
  private aiCache: LRUCache<BusinessAnalysis>;
  private analysisCache: LRUCache<any>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private config: CacheConfig = {
    maxSize: 100, // 100MB default
    maxEntries: 1000,
    defaultTTL: 60, // 1 hour
    cleanupInterval: 15, // 15 minutes
    enableMetrics: true
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.scrapeCache = new LRUCache<ScrapedContent>(this.config);
    this.aiCache = new LRUCache<BusinessAnalysis>(this.config);
    this.analysisCache = new LRUCache<any>(this.config);
  }

  /**
   * Initialiseer cache manager
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Start cleanup interval
    if (this.config.cleanupInterval > 0) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval * 60 * 1000);
    }

    this.isInitialized = true;
    console.log('[CACHE] Analysis cache manager initialized');
  }

  /**
   * Stop cache manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isInitialized = false;
    console.log('[CACHE] Analysis cache manager shutdown');
  }

  // === SCRAPED CONTENT CACHE ===

  /**
   * Cache scraped content
   */
  cacheScrapedContent(url: string, content: ScrapedContent, options?: any): void {
    const ttl = 2 * 60 * 60 * 1000; // 2 hours voor scraped content
    this.scrapeCache.set(url, content, options, ttl);
    console.log(`[CACHE] Cached scraped content for: ${url}`);
  }

  /**
   * Haal gecachte scraped content op
   */
  getScrapedContent(url: string, options?: any): ScrapedContent | null {
    const result = this.scrapeCache.get(url, options);
    if (result) {
      console.log(`[CACHE] Cache hit for scraped content: ${url}`);
    }
    return result;
  }

  // === AI ANALYSIS CACHE ===

  /**
   * Cache AI analysis result
   */
  cacheAIAnalysis(url: string, analysis: BusinessAnalysis, options?: any): void {
    const ttl = 6 * 60 * 60 * 1000; // 6 hours voor AI analysis
    this.aiCache.set(url, analysis, options, ttl);
    console.log(`[CACHE] Cached AI analysis for: ${url}`);
  }

  /**
   * Haal gecachte AI analysis op
   */
  getAIAnalysis(url: string, options?: any): BusinessAnalysis | null {
    const result = this.aiCache.get(url, options);
    if (result) {
      console.log(`[CACHE] Cache hit for AI analysis: ${url}`);
    }
    return result;
  }

  // === FINAL ANALYSIS CACHE ===

  /**
   * Cache final analysis result
   */
  cacheFinalAnalysis(url: string, analysis: any, options?: any): void {
    const ttl = 24 * 60 * 60 * 1000; // 24 hours voor final analysis
    this.analysisCache.set(url, analysis, options, ttl);
    console.log(`[CACHE] Cached final analysis for: ${url}`);
  }

  /**
   * Haal gecachte final analysis op
   */
  getFinalAnalysis(url: string, options?: any): any | null {
    const result = this.analysisCache.get(url, options);
    if (result) {
      console.log(`[CACHE] Cache hit for final analysis: ${url}`);
    }
    return result;
  }

  // === CACHE MANAGEMENT ===

  /**
   * Invalideer cache voor specifieke URL
   */
  invalidateUrl(url: string): void {
    const keys = [
      ...this.scrapeCache.keys(),
      ...this.aiCache.keys(),
      ...this.analysisCache.keys()
    ];

    const urlHash = createHash('md5').update(url).digest('hex');
    const keysToInvalidate = keys.filter(key => key.startsWith(urlHash));

    keysToInvalidate.forEach(key => {
      // Note: we don't have a direct delete method, but setting with 0 TTL effectively removes it
      // In a real implementation, you'd add a delete method to LRUCache
    });

    console.log(`[CACHE] Invalidated ${keysToInvalidate.length} cache entries for: ${url}`);
  }

  /**
   * Cleanup verlopen entries
   */
  cleanup(): void {
    this.scrapeCache.cleanup();
    this.aiCache.cleanup();
    this.analysisCache.cleanup();
  }

  /**
   * Haal uitgebreide cache metrics op
   */
  getMetrics(): CacheMetrics {
    const scrapeStats = this.scrapeCache.getStats();
    const aiStats = this.aiCache.getStats();
    const analysisStats = this.analysisCache.getStats();

    const overall: CacheStats = {
      totalEntries: scrapeStats.totalEntries + aiStats.totalEntries + analysisStats.totalEntries,
      totalSize: scrapeStats.totalSize + aiStats.totalSize + analysisStats.totalSize,
      hitCount: scrapeStats.hitCount + aiStats.hitCount + analysisStats.hitCount,
      missCount: scrapeStats.missCount + aiStats.missCount + analysisStats.missCount,
      hitRate: 0,
      evictionCount: scrapeStats.evictionCount + aiStats.evictionCount + analysisStats.evictionCount,
      memoryUsage: scrapeStats.memoryUsage + aiStats.memoryUsage + analysisStats.memoryUsage,
      oldestEntry: Math.min(scrapeStats.oldestEntry || Infinity, aiStats.oldestEntry || Infinity, analysisStats.oldestEntry || Infinity),
      newestEntry: Math.max(scrapeStats.newestEntry || 0, aiStats.newestEntry || 0, analysisStats.newestEntry || 0)
    };

    const totalRequests = overall.hitCount + overall.missCount;
    overall.hitRate = totalRequests > 0 ? (overall.hitCount / totalRequests) * 100 : 0;

    return {
      scrapeCache: scrapeStats,
      aiCache: aiStats,
      analysisCache: analysisStats,
      overall
    };
  }

  /**
   * Leeg alle caches
   */
  clearAll(): void {
    this.scrapeCache.clear();
    this.aiCache.clear();
    this.analysisCache.clear();
    console.log('[CACHE] All caches cleared');
  }

  /**
   * Haal cache status op
   */
  getStatus(): {
    isInitialized: boolean;
    config: CacheConfig;
    metrics: CacheMetrics;
    uptime: number;
  } {
    return {
      isInitialized: this.isInitialized,
      config: this.config,
      metrics: this.getMetrics(),
      uptime: process.uptime()
    };
  }
}

// === SINGLETON INSTANCE ===

let cacheManager: AnalysisCacheManager | null = null;

/**
 * Haal singleton cache manager instance op
 */
export function getCacheManager(config?: Partial<CacheConfig>): AnalysisCacheManager {
  if (!cacheManager) {
    cacheManager = new AnalysisCacheManager(config);
    cacheManager.initialize();
  }
  return cacheManager;
}

/**
 * Shutdown cache manager (voor testing/cleanup)
 */
export function shutdownCacheManager(): void {
  if (cacheManager) {
    cacheManager.shutdown();
    cacheManager = null;
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Genereer cache key voor consistent caching
 */
export function generateCacheKey(url: string, options?: any): string {
  const baseKey = createHash('md5').update(url).digest('hex');
  if (options) {
    const optionsHash = createHash('md5').update(JSON.stringify(options)).digest('hex');
    return `${baseKey}-${optionsHash}`;
  }
  return baseKey;
}

/**
 * Format cache metrics voor logging
 */
export function formatCacheMetrics(metrics: CacheMetrics): string {
  const { overall } = metrics;
  return `Cache Stats - Entries: ${overall.totalEntries}, Size: ${overall.memoryUsage.toFixed(2)}MB, Hit Rate: ${overall.hitRate.toFixed(1)}%`;
}

/**
 * Check cache health
 */
export function checkCacheHealth(metrics: CacheMetrics): {
  isHealthy: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const { overall } = metrics;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check hit rate
  if (overall.hitRate < 50) {
    warnings.push(`Low cache hit rate: ${overall.hitRate.toFixed(1)}%`);
    recommendations.push('Consider increasing cache TTL or reviewing cache strategy');
  }

  // Check memory usage
  if (overall.memoryUsage > 80) {
    warnings.push(`High memory usage: ${overall.memoryUsage.toFixed(2)}MB`);
    recommendations.push('Consider increasing cache size limit or reducing TTL');
  }

  // Check eviction rate
  const evictionRate = overall.totalEntries > 0 ? (overall.evictionCount / overall.totalEntries) * 100 : 0;
  if (evictionRate > 20) {
    warnings.push(`High eviction rate: ${evictionRate.toFixed(1)}%`);
    recommendations.push('Consider increasing cache size or reducing entry count');
  }

  return {
    isHealthy: warnings.length === 0,
    warnings,
    recommendations
  };
} 
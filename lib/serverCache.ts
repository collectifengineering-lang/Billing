/**
 * Server-side cache for API responses
 * Uses in-memory caching with TTL (Time To Live)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ServerCache {
  private static instance: ServerCache;
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default

  private constructor() {
    this.cache = new Map();
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  static getInstance(): ServerCache {
    if (!ServerCache.instance) {
      ServerCache.instance = new ServerCache();
    }
    return ServerCache.instance;
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Cache HIT for key: ${key}`);
    return entry.data as T;
  }

  /**
   * Set cache data with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };

    this.cache.set(key, entry);
    console.log(`💾 Cache SET for key: ${key} (TTL: ${entry.ttl}ms)`);
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Cache DELETED for key: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ All cache entries CLEARED');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get or set cache with a factory function
   * This is useful for caching API responses
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }

    console.log(`❌ Cache MISS for key: ${key} - fetching fresh data...`);
    const data = await factory();
    this.set(key, data, ttl);
    
    return { data, fromCache: false };
  }
}

export const serverCache = ServerCache.getInstance();


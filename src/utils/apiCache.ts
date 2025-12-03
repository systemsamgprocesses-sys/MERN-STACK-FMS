// Simple in-memory cache for API responses
export interface CacheEntry {
    data: any;
    timestamp: number;
    expiry: number;
}

export class APICache {
    private cache: Map<string, CacheEntry> = new Map();
    private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

    // Generate cache key from URL and params
    private getCacheKey(url: string, params?: any): string {
        const paramStr = params ? JSON.stringify(params) : '';
        return `${url}${paramStr}`;
    }

    // Get cached data if still valid
    get(url: string, params?: any): any | null {
        const key = this.getCacheKey(url, params);
        const entry = this.cache.get(key);

        if (!entry) return null;

        const now = Date.now();
        if (now > entry.timestamp + entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    // Set cache entry
    set(url: string, data: any, params?: any, ttl?: number): void {
        const key = this.getCacheKey(url, params);
        const now = Date.now();
        const expiry = ttl || this.defaultTTL;

        this.cache.set(key, {
            data,
            timestamp: now,
            expiry
        });
    }

    // Invalidate cache for a specific URL pattern
    invalidate(pattern: string): void {
        const keysToDelete: string[] = [];
        this.cache.forEach((_, key) => {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    // Clear all cache
    clear(): void {
        this.cache.clear();
    }

    // Clear expired entries
    cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];
        
        this.cache.forEach((entry, key) => {
            if (now > entry.timestamp + entry.expiry) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => this.cache.delete(key));
    }
}

// Singleton instance
export const apiCache = new APICache();

// Cleanup expired entries every minute (only in browser environment)
if (typeof window !== 'undefined') {
    setInterval(() => {
        apiCache.cleanup();
    }, 60 * 1000);
}

// Axios interceptor wrapper for caching
export const cachedAxiosGet = async (
    url: string,
    config?: any,
    ttl?: number
): Promise<any> => {
    const params = config?.params || {};
    
    // Check cache first
    const cached = apiCache.get(url, params);
    if (cached !== null) {
        return { data: cached, fromCache: true };
    }

    // Make actual API call
    const axios = (await import('axios')).default;
    const response = await axios.get(url, config);
    
    // Cache the response
    apiCache.set(url, response.data, params, ttl);
    
    return { data: response.data, fromCache: false };
};


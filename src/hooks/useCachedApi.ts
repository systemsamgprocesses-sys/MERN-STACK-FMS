import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosRequestConfig } from 'axios';
import { useApiCache } from '../contexts/ApiCacheContext';

interface UseCachedApiOptions {
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  refetchOnMount?: boolean; // Force refetch on mount even if cache exists
}

interface UseCachedApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  invalidate: () => void;
}

/**
 * Custom hook for making cached API calls
 * Implements stale-while-revalidate pattern to reduce CPU load
 * 
 * @param url - API endpoint URL
 * @param config - Axios request configuration
 * @param options - Caching options
 * @returns Object with data, loading state, error, and refetch function
 */
export function useCachedApi<T = any>(
  url: string | null,
  config: AxiosRequestConfig = {},
  options: UseCachedApiOptions = {}
): UseCachedApiReturn<T> {
  const {
    enabled = true,
    ttl,
    staleWhileRevalidate = true,
    onSuccess,
    onError,
    refetchOnMount = false,
  } = options;

  const cache = useApiCache();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Generate cache key from URL and config
  const generateCacheKey = useCallback(() => {
    if (!url) return null;
    const params = new URLSearchParams(config.params).toString();
    const method = config.method || 'GET';
    const body = config.data ? JSON.stringify(config.data) : '';
    return `api:${method}:${url}:${params}:${body}`;
  }, [url, config]);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!url || !enabled) return;

      const cacheKey = generateCacheKey();
      if (!cacheKey) return;

      // Check cache first (unless forcing refresh)
      if (!forceRefresh && !refetchOnMount) {
        const cached = cache.getCache<T>(cacheKey);
        if (cached) {
          const isStale = cache.isStale(cacheKey);
          
          // If data is fresh, use it directly
          if (!isStale) {
            setData(cached.data);
            setError(null);
            onSuccess?.(cached.data);
            return;
          }

          // If stale but staleWhileRevalidate is enabled, use stale data immediately
          if (staleWhileRevalidate) {
            setData(cached.data);
            setError(null);
            // Continue to fetch fresh data in background
          } else {
            // Data is stale and we don't want to use it, clear it
            cache.invalidateCache(cacheKey);
          }
        }
      }

      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response = await axios({
          url,
          ...config,
          signal: abortControllerRef.current.signal,
        });

        if (!isMountedRef.current) return;

        const responseData = response.data;

        // Update cache
        cache.setCache(cacheKey, responseData, ttl);

        // Update state
        setData(responseData);
        setError(null);
        onSuccess?.(responseData);
      } catch (err: any) {
        if (!isMountedRef.current) return;

        // Don't set error if request was aborted
        if (axios.isCancel(err) || err.name === 'AbortError') {
          return;
        }

        setError(err);
        onError?.(err);

        // If we have stale data and error occurred, keep using stale data
        if (staleWhileRevalidate && data) {
          console.warn('API fetch failed, using stale cache data:', err.message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [url, config, enabled, ttl, staleWhileRevalidate, refetchOnMount, cache, generateCacheKey, onSuccess, onError, data]
  );

  const invalidate = useCallback(() => {
    const cacheKey = generateCacheKey();
    if (cacheKey) {
      cache.invalidateCache(cacheKey);
      setData(null);
    }
  }, [cache, generateCacheKey]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url]); // Only refetch if URL changes

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate,
  };
}


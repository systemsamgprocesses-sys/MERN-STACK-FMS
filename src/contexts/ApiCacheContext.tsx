import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface ApiCacheContextType {
  getCache: <T>(key: string) => CacheEntry<T> | null;
  setCache: <T>(key: string, data: T, ttl?: number) => void;
  invalidateCache: (key: string | string[]) => void;
  clearAllCache: () => void;
  isStale: (key: string, maxAge?: number) => boolean;
}

const ApiCacheContext = createContext<ApiCacheContextType | undefined>(undefined);

// Default TTL: 5 minutes (300000ms)
const DEFAULT_TTL = 5 * 60 * 1000;
// Stale threshold: 2 minutes (120000ms) - data older than this is considered stale but still usable
const STALE_THRESHOLD = 2 * 60 * 1000;

export const ApiCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const getCache = useCallback(<T,>(key: string): CacheEntry<T> | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      cacheRef.current.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }, []);

  const setCache = useCallback(<T,>(key: string, data: T, ttl: number = DEFAULT_TTL): void => {
    const now = Date.now();
    cacheRef.current.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }, []);

  const invalidateCache = useCallback((key: string | string[]): void => {
    if (Array.isArray(key)) {
      key.forEach(k => cacheRef.current.delete(k));
    } else {
      cacheRef.current.delete(key);
    }
  }, []);

  const clearAllCache = useCallback((): void => {
    cacheRef.current.clear();
  }, []);

  const isStale = useCallback((key: string, maxAge: number = STALE_THRESHOLD): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) return true;

    const age = Date.now() - entry.timestamp;
    return age > maxAge;
  }, []);

  return (
    <ApiCacheContext.Provider
      value={{
        getCache,
        setCache,
        invalidateCache,
        clearAllCache,
        isStale,
      }}
    >
      {children}
    </ApiCacheContext.Provider>
  );
};

export const useApiCache = (): ApiCacheContextType => {
  const context = useContext(ApiCacheContext);
  if (!context) {
    throw new Error('useApiCache must be used within ApiCacheProvider');
  }
  return context;
};


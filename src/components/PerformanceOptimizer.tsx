import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Loader2, RefreshCw, Wifi, WifiOff, AlertCircle, 
  CheckCircle, Clock, Zap, Database, Cpu, 
  BarChart3, TrendingUp, Activity
} from 'lucide-react';

interface CacheConfig {
  maxAge: number; // milliseconds
  maxSize: number; // number of entries
  autoCleanup?: boolean;
}

interface PerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  networkRequests: number;
  memoryUsage: number;
  renderTime: number;
  bundleSize: number;
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  stage: 'fetching' | 'processing' | 'caching' | 'rendering' | 'complete';
}

interface OptimizedDataConfig {
  cacheConfig?: CacheConfig;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  pagination?: {
    pageSize: number;
    enableInfiniteScroll?: boolean;
    prefetchDistance?: number;
  };
  debounceDelay?: number;
  enableRealTimeUpdates?: boolean;
  updateInterval?: number;
}

interface DataProvider<T> {
  fetch: (params?: any) => Promise<T>;
  update?: (id: string, data: any) => Promise<T>;
  create?: (data: any) => Promise<T>;
  delete?: (id: string) => Promise<void>;
  search?: (query: string) => Promise<T>;
}

// Performance Cache Manager
class PerformanceCache {
  private cache = new Map<string, { data: any; timestamp: number; hits: number }>();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.startCleanup();
  }

  private startCleanup() {
    if (this.config.autoCleanup) {
      setInterval(() => this.cleanup(), 60000); // Clean up every minute
    }
  }

  set(key: string, data: any): void {
    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and timestamp
    entry.hits++;
    entry.timestamp = Date.now();
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalHits,
      hitRate: totalHits > 0 ? (this.cache.size / totalHits) * 100 : 0
    };
  }
}

// Error Boundary with Performance Monitoring
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  performanceData?: PerformanceMetrics;
}

class PerformanceErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error, metrics: PerformanceMetrics) => void },
  ErrorBoundaryState
> {
  private renderStartTime = 0;
  private componentMountTime = Date.now();

  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const renderTime = Date.now() - (this as any).renderStartTime;
    
    return {
      hasError: true,
      error,
      performanceData: {
        loadTime: Date.now() - (this as any).componentMountTime,
        cacheHitRate: 0,
        networkRequests: 0,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        renderTime,
        bundleSize: 0
      }
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const performanceData = this.state.performanceData;
    
    if (this.props.onError && performanceData) {
      this.props.onError(error, performanceData);
    }

    // Log to performance monitoring service
    console.error('Component error with performance data:', {
      error,
      errorInfo,
      performanceData
    });
  }

  componentDidMount() {
    this.componentMountTime = Date.now();
    this.renderStartTime = Date.now();
  }

  componentDidUpdate() {
    this.renderStartTime = Date.now();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Performance Error</h3>
            <p className="text-red-600 mt-1">
              A performance issue occurred. Please refresh the page or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Network Status Monitor
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };

      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
};

// Main Performance Optimizer Component
interface PerformanceOptimizerProps<T> {
  dataProvider: DataProvider<T>;
  config: OptimizedDataConfig;
  children: (props: {
    data: T[];
    loading: LoadingState;
    error: Error | null;
    refetch: () => void;
    search: (query: string) => void;
    metrics: PerformanceMetrics;
    isOnline: boolean;
    connectionType: string;
    cacheStats: any;
  }) => React.ReactNode;
  dependencies?: any[];
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}

const PerformanceOptimizer = <T,>({
  dataProvider,
  config,
  children,
  dependencies = [],
  onPerformanceUpdate
}: PerformanceOptimizerProps<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    message: 'Initializing...',
    stage: 'fetching'
  });
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    cacheHitRate: 0,
    networkRequests: 0,
    memoryUsage: 0,
    renderTime: 0,
    bundleSize: 0
  });

  const cacheRef = useRef<PerformanceCache | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isOnline, connectionType } = useNetworkStatus();
  const renderStartTime = useRef<number>(Date.now());

  // Initialize cache
  useEffect(() => {
    if (config.cacheConfig) {
      cacheRef.current = new PerformanceCache(config.cacheConfig);
    }
  }, [config.cacheConfig]);

  // Cache key generator
  const generateCacheKey = useCallback((params?: any) => {
    const key = JSON.stringify(params || {});
    return `data_${btoa(key)}`;
  }, []);

  // Fetch data with caching, retry logic, and performance tracking
  const fetchData = useCallback(async (params?: any, forceRefresh = false) => {
    const startTime = performance.now();
    const cacheKey = generateCacheKey(params);

    setLoading({
      isLoading: true,
      progress: 10,
      message: 'Checking cache...',
      stage: 'fetching'
    });

    // Check cache first
    let cachedData = null;
    if (!forceRefresh && cacheRef.current && !config.retryConfig) {
      cachedData = cacheRef.current.get(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setLoading({
          isLoading: false,
          progress: 100,
          message: 'Data loaded from cache',
          stage: 'complete'
        });

        // Update metrics
        const endTime = performance.now();
        setMetrics(prev => ({
          ...prev,
          loadTime: endTime - startTime,
          cacheHitRate: 100,
          networkRequests: prev.networkRequests + 1
        }));

        return cachedData;
      }
    }

    setLoading({
      isLoading: true,
      progress: 30,
      message: 'Fetching data from server...',
      stage: 'fetching'
    });

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Retry logic
    let retryCount = 0;
    const maxRetries = config.retryConfig?.maxRetries || 3;
    const retryDelay = config.retryConfig?.retryDelay || 1000;
    const backoffMultiplier = config.retryConfig?.backoffMultiplier || 2;

    while (retryCount <= maxRetries) {
      try {
        setLoading({
          isLoading: true,
          progress: 40 + (retryCount * 10),
          message: `Fetching data... (Attempt ${retryCount + 1})`,
          stage: 'fetching'
        });

        const result = await dataProvider.fetch(params);
        
        setLoading({
          isLoading: true,
          progress: 80,
          message: 'Processing data...',
          stage: 'processing'
        });

        // Update cache
        if (cacheRef.current) {
          cacheRef.current.set(cacheKey, result);
        }

        setData(Array.isArray(result) ? result : [result]);
        
        setLoading({
          isLoading: false,
          progress: 100,
          message: 'Data loaded successfully',
          stage: 'complete'
        });

        // Calculate performance metrics
        const endTime = performance.now();
        const cacheStats = cacheRef.current?.getStats();
        
        const newMetrics: PerformanceMetrics = {
          loadTime: endTime - startTime,
          cacheHitRate: cacheStats?.hitRate || 0,
          networkRequests: metrics.networkRequests + 1,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          renderTime: Date.now() - renderStartTime.current,
          bundleSize: (performance as any).getEntriesByType('navigation')[0]?.transferSize || 0
        };

        setMetrics(newMetrics);
        onPerformanceUpdate?.(newMetrics);

        return result;

      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // Request was aborted
        }

        retryCount++;
        
        if (retryCount <= maxRetries) {
          const delay = retryDelay * Math.pow(backoffMultiplier, retryCount - 1);
          setLoading({
            isLoading: true,
            progress: 50 + (retryCount * 10),
            message: `Retrying in ${delay}ms...`,
            stage: 'fetching'
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          setError(err);
          setLoading({
            isLoading: false,
            progress: 100,
            message: 'Failed to load data',
            stage: 'complete'
          });
          throw err;
        }
      }
    }
  }, [dataProvider, config, generateCacheKey, onPerformanceUpdate, metrics.networkRequests]);

  // Search function with debouncing
  const search = useCallback((query: string) => {
    const debounceDelay = config.debounceDelay || 300;
    
    setTimeout(async () => {
      if (query.trim()) {
        try {
          setLoading({
            isLoading: true,
            progress: 50,
            message: 'Searching...',
            stage: 'fetching'
          });

          const results = await dataProvider.search?.(query) || data;
          setData(Array.isArray(results) ? results : [results]);
          
          setLoading({
            isLoading: false,
            progress: 100,
            message: 'Search completed',
            stage: 'complete'
          });
        } catch (err) {
          setError(err as Error);
        }
      } else {
        // If search is cleared, refetch original data
        fetchData();
      }
    }, debounceDelay);
  }, [dataProvider, config.debounceDelay, fetchData]);

  // Real-time updates
  useEffect(() => {
    if (config.enableRealTimeUpdates && config.updateInterval) {
      const interval = setInterval(() => {
        if (isOnline) {
          fetchData(undefined, true);
        }
      }, config.updateInterval);

      return () => clearInterval(interval);
    }
  }, [config.enableRealTimeUpdates, config.updateInterval, isOnline, fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, dependencies);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cacheStats = cacheRef.current?.getStats();

  return children({
    data,
    loading,
    error,
    refetch: () => fetchData(undefined, true),
    search,
    metrics,
    isOnline,
    connectionType,
    cacheStats
  });
};

// Loading States Components
export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 rounded h-4 mb-2"></div>
    <div className="bg-gray-200 rounded h-4 w-3/4 mb-2"></div>
    <div className="bg-gray-200 rounded h-4 w-1/2"></div>
  </div>
);

export const LoadingSpinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg'; 
  message?: string;
  progress?: number;
  className?: string;
}> = ({ 
  size = 'md', 
  message, 
  progress, 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      )}
      {progress !== undefined && (
        <div className="mt-2 w-32 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

// Performance Monitor Component
export const PerformanceMonitor: React.FC<{ metrics: PerformanceMetrics }> = ({ metrics }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPerformanceColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'text-green-600';
    if (value < thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-5 w-5 text-blue-600" />
        <span className="font-medium text-gray-900">Performance</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Load Time:</span>
            <span className={getPerformanceColor(metrics.loadTime, [1000, 3000])}>
              {metrics.loadTime.toFixed(0)}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cache Hit Rate:</span>
            <span className={getPerformanceColor(metrics.cacheHitRate, [50, 20])}>
              {metrics.cacheHitRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Network Requests:</span>
            <span className="text-gray-600">{metrics.networkRequests}</span>
          </div>
          <div className="flex justify-between">
            <span>Memory Usage:</span>
            <span className="text-gray-600">
              {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
            </span>
          </div>
          <div className="flex justify-between">
            <span>Render Time:</span>
            <span className={getPerformanceColor(metrics.renderTime, [100, 300])}>
              {metrics.renderTime.toFixed(0)}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export { PerformanceCache, PerformanceErrorBoundary };
export default PerformanceOptimizer;
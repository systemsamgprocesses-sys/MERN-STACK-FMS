# API Cache Optimization

## Overview
This optimization reduces CPU load by implementing a global API caching system that prevents redundant API calls when navigating between pages.

## What Was Changed

### 1. API Cache Context (`src/contexts/ApiCacheContext.tsx`)
- Global cache provider that stores API responses with timestamps
- Default TTL: 5 minutes
- Stale threshold: 2 minutes (data older than this is considered stale but still usable)

### 2. Cached API Hook (`src/hooks/useCachedApi.ts`)
- Custom hook that implements stale-while-revalidate pattern
- Returns cached data immediately if available and fresh
- Fetches fresh data in background if cached data is stale
- Automatically handles request cancellation and cleanup

### 3. Updated Components

#### App.tsx
- Wrapped application with `ApiCacheProvider` to enable global caching

#### AdminTasks.tsx
- Replaced direct `axios.get` calls with `useCachedApi` hook
- Tasks are now cached for 2 minutes
- Reduces API calls when navigating back to this page

#### Sidebar.tsx
- Replaced multiple `axios.get` calls with `useCachedApi` hooks
- Counts are cached for 1 minute
- Still refreshes on task update events

## How It Works

1. **First Visit**: API call is made and response is cached
2. **Subsequent Visits (within TTL)**: Cached data is returned immediately, no API call
3. **Stale Data**: If data is older than stale threshold but within TTL:
   - Cached data is returned immediately (stale-while-revalidate)
   - Fresh data is fetched in background
   - UI updates when fresh data arrives

## Benefits

- **Reduced CPU Load**: No redundant API calls when navigating between pages
- **Faster Page Loads**: Cached data displays instantly
- **Better UX**: No loading spinners for recently viewed pages
- **Automatic Cleanup**: Expired cache entries are automatically removed

## Usage Example

```typescript
import { useCachedApi } from '../hooks/useCachedApi';

const MyComponent = () => {
  const { user } = useAuth();
  const apiUrl = user?.id ? `${address}/api/tasks?userId=${user.id}` : null;
  
  const { data, loading, error, refetch } = useCachedApi(
    apiUrl,
    {},
    {
      ttl: 2 * 60 * 1000, // 2 minutes cache
      staleWhileRevalidate: true,
    }
  );

  // Use data, loading, error as needed
  // Call refetch(true) to force refresh
};
```

## Applying to Other Pages

To optimize other pages, replace:
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  axios.get(url).then(res => {
    setData(res.data);
    setLoading(false);
  });
}, []);
```

With:
```typescript
const { data, loading, error, refetch } = useCachedApi(url, {}, {
  ttl: 2 * 60 * 1000,
  staleWhileRevalidate: true,
});
```

## Cache Invalidation

To invalidate cache when data changes:
```typescript
import { useApiCache } from '../contexts/ApiCacheContext';

const { invalidateCache } = useApiCache();

// After creating/updating/deleting
invalidateCache('api:GET:/api/tasks:...');
// Or invalidate multiple keys
invalidateCache(['key1', 'key2']);
```

## Notes

- Cache keys are automatically generated from URL, method, params, and body
- Different parameters create different cache entries
- Cache is stored in memory (cleared on page refresh)
- TTL can be customized per API call


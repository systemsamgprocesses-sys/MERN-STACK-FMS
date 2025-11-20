# CPU Spike Analysis Report

## Executive Summary
This report identifies potential causes of CPU spikes (100% usage) in the MERN-STACK-FMS application and provides recommendations for optimization.

---

## 🚨 CRITICAL ISSUES FOUND

### 1. **Fetching ALL Tasks Without Pagination** ⚠️ HIGH PRIORITY
**Location:** Multiple frontend pages
**Impact:** VERY HIGH - Can cause massive memory usage and CPU spikes

**Problematic Code:**
- `src/pages/AdminTasks.tsx:49` - `limit=1000000`
- `src/pages/MasterTasks.tsx:198` - `limit=1000000`
- `src/pages/MasterRecurringTasks.tsx:301` - `limit=1000000`
- `src/pages/AssignedByMe.tsx:48` - `limit=1000000`

**Problem:** 
- These pages fetch potentially hundreds of thousands of records at once
- All filtering is done on the frontend after fetching all data
- Each time a user visits these pages, millions of bytes are transferred
- Frontend has to process, filter, and render all this data

**CPU Impact:**
- MongoDB query loads entire collection into memory
- Network bandwidth consumed transferring large JSON payloads
- Frontend JavaScript has to parse and process massive arrays
- Re-rendering large lists causes browser to freeze

**Recommended Fix:**
```javascript
// Instead of limit: 1000000, use proper pagination:
const params = new URLSearchParams({
  taskType: 'one-time',
  page: currentPage,
  limit: 50  // Reasonable page size
});
```

---

### 2. **Aggressive Polling Every 30 Seconds** ⚠️ MEDIUM PRIORITY
**Location:** `src/components/Sidebar.tsx:175`

**Code:**
```javascript
const interval = setInterval(fetchCounts, 30000); // Every 30 seconds
```

**Problem:**
- Every 30 seconds, the sidebar makes 4-6 API calls:
  1. Dashboard counts API
  2. Objections API
  3. Help tickets API
  4. My objections API
  5. Complaints API
  6. Assigned by me count API

**CPU Impact:**
- If 10 users are logged in = 40-60 API calls per minute
- If 50 users are logged in = 200-300 API calls per minute
- Each API call triggers database queries
- Can overwhelm the backend server and database

**Recommended Fix:**
```javascript
// Increase interval to 60-120 seconds
const interval = setInterval(fetchCounts, 90000); // Every 90 seconds

// Or use WebSocket for real-time updates instead of polling
// Or implement a smart polling strategy based on user activity
```

---

### 3. **Missing Database Indexes** ⚠️ HIGH PRIORITY
**Location:** `server/models/Task.js`

**Problem:**
- The Task model has NO indexes defined for frequently queried fields
- Common queries filter by: `assignedTo`, `assignedBy`, `status`, `taskType`, `dueDate`
- Without indexes, MongoDB performs full collection scans

**CPU Impact:**
- Every query scans ALL documents in the collection
- O(n) complexity instead of O(log n)
- Queries that should take milliseconds take seconds
- Multiple users querying simultaneously causes CPU spikes

**Recommended Fix - Add to Task.js:**
```javascript
// Add indexes for frequently queried fields
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1, createdAt: -1 });
taskSchema.index({ taskType: 1, isActive: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 });

// Compound index for common query patterns
taskSchema.index({ assignedTo: 1, taskType: 1, status: 1 });
```

---

### 4. **No Query Result Caching** ⚠️ MEDIUM PRIORITY
**Location:** Backend API routes

**Problem:**
- Every API request hits the database directly
- No caching layer for frequently accessed data
- Dashboard stats recalculated on every request
- Count queries run repeatedly for same data

**Recommended Fix:**
- Implement Redis caching for dashboard counts (cache for 60 seconds)
- Cache user permissions and roles
- Use ETag headers for static data

---

### 5. **Inefficient Populate Queries** ⚠️ MEDIUM PRIORITY
**Location:** Various task routes

**Problem:**
- Some queries populate multiple levels of references
- No field selection when populating (fetches all user data)

**Example of problematic code:**
```javascript
.populate('assignedTo')  // Fetches ALL user fields
.populate('assignedBy')  // Fetches ALL user fields
```

**Recommended Fix:**
```javascript
.populate('assignedTo', 'username email')  // Only fetch needed fields
.populate('assignedBy', 'username')
```

---

## 📊 MODERATE CONCERNS

### 6. **Real-time Update Intervals**
**Location:** `src/components/PerformanceOptimizer.tsx:496`

- Component can refresh data frequently if `updateInterval` is set low
- Check usage across the app to ensure reasonable intervals

### 7. **Large File Uploads**
**Location:** `server/config.js:20`

- Max file size is 10MB which is reasonable
- However, multiple concurrent uploads could spike CPU during file processing

---

## 🔍 BACKEND SERVER CONCERNS

### 8. **No Rate Limiting**
- No rate limiting detected in the codebase
- A single user or bot can spam the API with requests
- Recommended: Add `express-rate-limit` middleware

### 9. **No Request Compression**
- Not using gzip/brotli compression for API responses
- Large JSON payloads consume more bandwidth and CPU
- Recommended: Add `compression` middleware

### 10. **MongoDB Connection Pool**
**Location:** `server/config.js`

- Check if connection pool size is configured
- Default pool size might be too small for high traffic

---

## 💡 IMMEDIATE ACTION ITEMS (Priority Order)

### 🔴 URGENT (Do within 24 hours)
1. **Add database indexes** to Task model
2. **Replace `limit=1000000` with proper pagination** (limit to 50-100 per page)
3. **Increase sidebar polling interval** from 30s to 90-120s

### 🟡 HIGH PRIORITY (Do within 1 week)
4. Implement backend caching with Redis for dashboard counts
5. Add rate limiting to prevent API abuse
6. Optimize `.populate()` queries to fetch only required fields

### 🟢 MEDIUM PRIORITY (Do within 2 weeks)
7. Implement WebSockets for real-time updates instead of polling
8. Add response compression middleware
9. Configure MongoDB connection pool size appropriately
10. Add monitoring/alerting for CPU usage

---

## 📈 MONITORING RECOMMENDATIONS

1. **Add Performance Monitoring:**
   - Install PM2 with monitoring
   - Set up New Relic or Datadog APM
   - Monitor slow database queries

2. **Database Query Profiling:**
   ```javascript
   // Enable MongoDB slow query logging
   mongoose.set('debug', true); // In development only
   ```

3. **CPU Profiling:**
   - Use Node.js built-in profiler
   - Identify hot code paths
   - Monitor event loop lag

---

## 🔧 CONFIGURATION SUGGESTIONS

### Add to `server/index.js`:
```javascript
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Enable compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use('/api/', limiter);

// Set MongoDB connection pool
const mongoOptions = {
  maxPoolSize: 50, // Adjust based on expected concurrent users
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

---

## 📝 TESTING AFTER FIXES

1. **Load Testing:**
   - Use Apache JMeter or k6 to simulate 50+ concurrent users
   - Monitor CPU usage during load test
   - Verify response times improve

2. **Database Performance:**
   - Use MongoDB Atlas Performance Advisor
   - Check if indexes are being used: `explain()` in queries
   - Monitor slow query logs

3. **Frontend Performance:**
   - Use Chrome DevTools Performance tab
   - Monitor bundle size
   - Check memory leaks in React components

---

## ✅ EXPECTED IMPROVEMENTS AFTER FIXES

- **CPU Usage:** Should drop from 100% spikes to <50% average
- **Response Times:** 3-10x faster queries with indexes
- **Database Load:** 80% reduction with pagination
- **API Requests:** 50% reduction with increased polling interval
- **User Experience:** Faster page loads, smoother interactions

---

## 🚀 LONG-TERM OPTIMIZATIONS

1. Implement Redis for session management
2. Move to microservices architecture for scalability
3. Use CDN for static assets
4. Implement database read replicas for analytics
5. Add message queue (RabbitMQ/Redis) for background jobs
6. Consider using GraphQL to reduce over-fetching

---

**Report Generated:** $(date)
**Severity:** HIGH - Immediate action required
**Estimated Time to Fix Critical Issues:** 4-8 hours


# 🔥 Login CPU Spike - Root Cause & Fix

## Problem Identified

**CPU Usage:** 79% on user login  
**Root Cause:** Dashboard loads TOO MUCH DATA immediately after login

---

## What Happens on Login (Currently)

1. User logs in → `/api/auth/login` (✅ Fast - already optimized)
2. Redirects to `/dashboard`
3. Dashboard **immediately** makes these API calls:
   - `/api/users` - Fetches ALL users (could be 100+ users)
   - `/api/dashboard/analytics` - **MASSIVE aggregation queries**
   - `/api/dashboard/counts` - Counts all tasks in database  
   - `/api/dashboard/member-trend` - More analytics
4. Sidebar also starts making 5-6 API calls every 90 seconds
5. **ALL of this happens simultaneously** = CPU spike to 79%

---

## 🎯 The REAL Problem

The `/api/dashboard/analytics` route (line 48-91 in `dashboard.js`) does:

```javascript
// FMS Project aggregation - scans entire projects collection
const fmsMetrics = await Project.aggregate([...]);

// Team performance aggregation - scans entire tasks collection  
const overallTeamPerformance = await Task.aggregate([...]);

// More aggregations for scores, trends, etc.
```

**Each aggregation scans thousands of documents** = 79% CPU spike!

---

## ✅ Quick Fixes (Apply NOW)

### Fix 1: Add Simple In-Memory Cache for Dashboard (5 minutes)

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">server/routes/dashboard.js

# Server Files Update - Quick Reference

## Overview
This document lists **ONLY the server-related files** that need attention for hosting on:
- Main App: `hub.amgrealty.in`
- HR Portal: `hr.amgrealty.in`
- Backend: `hub.amgrealty.in`

---

## ✅ Server Files Status

### Already Correctly Configured:

1. **`server/config.js`**
   - ✅ `productionDomain: 'https://hub.amgrealty.in'` - Correct
   - ✅ CORS origin can be set via environment variable

2. **`server/index.js`**
   - ✅ CORS includes both domains:
     - `'https://hub.amgrealty.in'` (line 48)
     - `'https://hr.amgrealty.in'` (line 51)
   - ✅ Server listens on port 3000
   - ✅ Serves static files in production mode

---

## 📝 Server Environment Variables

Create/update `.env` file in `server/` directory:

```env
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
BACKEND_PORT=3000
CORS_ORIGIN=https://hub.amgrealty.in
```

---

## 🔧 Server Deployment Commands

### On VPS Server:

```bash
# Navigate to server directory
cd /path/to/MERN-STACK-FMS/server

# Install dependencies
npm install

# Start with PM2
pm2 start index.js --name "fms-backend"
pm2 save

# Or start with systemd
sudo systemctl start fms-backend
```

---

## 🌐 Nginx Configuration (Server-Side)

### Main App Nginx Config
**File:** `/etc/nginx/sites-available/hub.amgrealty.in`

Key points:
- Serves static files from `dist/` folder
- Proxies `/api/` to `http://localhost:3000`
- Proxies `/uploads/` and `/assets/` to backend

### HR Portal Nginx Config
**File:** `/etc/nginx/sites-available/hr.amgrealty.in`

Key points:
- Serves static files from `hr-admin-portal/dist/` folder
- Proxies `/api/` to `https://hub.amgrealty.in` (external)
- Proxies `/uploads/` and `/assets/` to backend

---

## 🔍 Verification Commands

### Check if server is running:
```bash
# With PM2
pm2 list
pm2 logs fms-backend

# With systemd
sudo systemctl status fms-backend
sudo journalctl -u fms-backend -f

# Test health endpoint
curl http://localhost:3000/health
curl https://hub.amgrealty.in/health
```

### Check Nginx:
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

---

## ⚠️ Important Notes

1. **Backend Port:** Server runs on port 3000 internally, but Nginx handles external access
2. **CORS:** Already configured for both domains - no code changes needed
3. **Static Files:** In production, main app serves from `dist/` folder
4. **API Endpoints:** All API calls go to `/api/*` which Nginx proxies to backend

---

## 🚀 Quick Update Steps (Server Only)

1. **Update environment variables** in `server/.env`
2. **Restart backend server:**
   ```bash
   pm2 restart fms-backend
   # or
   sudo systemctl restart fms-backend
   ```
3. **Update Nginx configs** (if not already done)
4. **Reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
5. **Verify:**
   ```bash
   curl https://hub.amgrealty.in/health
   ```

---

## 📋 Server Files Checklist

- [x] `server/config.js` - Production domain configured
- [x] `server/index.js` - CORS configured for both domains
- [ ] `server/.env` - Environment variables set
- [ ] Nginx config for `hub.amgrealty.in` created
- [ ] Nginx config for `hr.amgrealty.in` created
- [ ] Backend server running on port 3000
- [ ] SSL certificates configured for both domains

---

**Note:** The frontend files (`utils/ipAddress.ts` and `hr-admin-portal/src/utils/ipAddress.ts`) are already configured correctly and will automatically use `hub.amgrealty.in` as the backend URL when deployed.


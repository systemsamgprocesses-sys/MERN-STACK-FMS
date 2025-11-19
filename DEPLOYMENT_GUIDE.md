# Deployment Guide: Hostinger VPS Configuration

## Overview
This guide covers updating server configuration files to:
- Host main application on: `hub.amgrealty.in`
- Host HR Admin Portal on: `hr.amgrealty.in`
- Backend API URL: `hub.amgrealty.in` (for both applications)

---

## Step 1: Update Server Configuration Files

### 1.1 Update Main App Backend URL (`utils/ipAddress.ts`)
**File:** `utils/ipAddress.ts`

**Current:**
```typescript
export const address = import.meta.env.VITE_BACKEND_URL || 'https://hub.amgrealty.in';
```

**Status:** ✅ Already correct - no changes needed

---

### 1.2 Update Main App Source Backend URL (`src/utils/ipAddress.ts`)
**File:** `src/utils/ipAddress.ts`

**Current:** Already configured to use `hub.amgrealty.in` when on production domain.

**Status:** ✅ Already correct - no changes needed

---

### 1.3 Update HR Admin Portal Backend URL
**File:** `hr-admin-portal/src/utils/ipAddress.ts`

**Current:** Already configured to use `hub.amgrealty.in`

**Status:** ✅ Already correct - no changes needed

**Note:** The HR portal will automatically detect it's running on `hr.amgrealty.in` and use `https://hub.amgrealty.in` as the backend URL.

---

### 1.4 Update Server CORS Configuration
**File:** `server/index.js`

**Current:** Already includes both domains in allowed origins:
- `https://hub.amgrealty.in` (Main App)
- `https://hr.amgrealty.in` (HR Portal)

**Status:** ✅ Already correct - no changes needed

---

### 1.5 Update Server Config
**File:** `server/config.js`

**Current:** `productionDomain: 'https://hub.amgrealty.in'`

**Status:** ✅ Already correct - no changes needed

---

## Step 2: Nginx Configuration

Create or update your Nginx configuration on the VPS. You'll need **two server blocks**:

### 2.1 Main Application (hub.amgrealty.in)

Create/update: `/etc/nginx/sites-available/hub.amgrealty.in`

```nginx
server {
    listen 80;
    server_name hub.amgrealty.in;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hub.amgrealty.in;
    
    # SSL Certificate paths (update with your actual certificate paths)
    ssl_certificate /etc/letsencrypt/live/hub.amgrealty.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hub.amgrealty.in/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Root directory (path to your built main app)
    root /path/to/MERN-STACK-FMS/dist;
    index index.html;
    
    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Proxy uploads
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Proxy assets
    location /assets/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

### 2.2 HR Admin Portal (hr.amgrealty.in)

Create/update: `/etc/nginx/sites-available/hr.amgrealty.in`

```nginx
server {
    listen 80;
    server_name hr.amgrealty.in;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hr.amgrealty.in;
    
    # SSL Certificate paths (update with your actual certificate paths)
    ssl_certificate /etc/letsencrypt/live/hr.amgrealty.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hr.amgrealty.in/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Root directory (path to your built HR portal)
    root /path/to/MERN-STACK-FMS/hr-admin-portal/dist;
    index index.html;
    
    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy API requests to Node.js backend (hub.amgrealty.in)
    location /api/ {
        proxy_pass https://hub.amgrealty.in;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host hub.amgrealty.in;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Proxy uploads from backend
    location /uploads/ {
        proxy_pass https://hub.amgrealty.in;
        proxy_set_header Host hub.amgrealty.in;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Proxy assets from backend
    location /assets/ {
        proxy_pass https://hub.amgrealty.in;
        proxy_set_header Host hub.amgrealty.in;
    }
}
```

### 2.3 Enable Nginx Sites

```bash
# Enable both sites
sudo ln -s /etc/nginx/sites-available/hub.amgrealty.in /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/hr.amgrealty.in /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 3: Build Commands

### 3.1 Build Main Application

On your local machine or VPS:

```bash
# For Windows
npm run build:win

# For Linux/Mac
npm run build:prod
```

This will:
- Build the React app with `VITE_BACKEND_URL=https://hub.amgrealty.in`
- Output to `dist/` folder

### 3.2 Build HR Admin Portal

```bash
cd hr-admin-portal

# Build with backend URL environment variable
# For Windows
set VITE_BACKEND_URL=https://hub.amgrealty.in && npm run build

# For Linux/Mac
VITE_BACKEND_URL=https://hub.amgrealty.in npm run build
```

This will output to `hr-admin-portal/dist/` folder.

---

## Step 4: Deployment Steps on VPS

Before copying any new build artifacts, make sure the VPS has the latest code:

```bash
# SSH into the Hostinger VPS
ssh user@your-vps-ip

# Navigate to the app root
cd /path/to/MERN-STACK-FMS

# Switch to the primary branch (usually main) and pull latest changes
git checkout main
git pull origin main

# If the HR portal is tracked as a separate repo, update it as well
cd hr-admin-portal
git checkout main
git pull origin main

# Go back to the root when done
cd ..
```

If the repository is not initialized on the VPS, clone it instead:

```bash
git clone https://github.com/your-org/MERN-STACK-FMS.git
cd MERN-STACK-FMS
```

### 4.1 Upload Files to VPS

Upload the following to your VPS:
1. **Main App:** Upload `dist/` folder contents to `/path/to/MERN-STACK-FMS/dist/`
2. **HR Portal:** Upload `hr-admin-portal/dist/` folder contents to `/path/to/MERN-STACK-FMS/hr-admin-portal/dist/`
3. **Server:** Upload entire `server/` folder (if not already there)

### 4.2 Install/Update Dependencies

```bash
cd /path/to/MERN-STACK-FMS/server
npm install
```

### 4.3 Set Environment Variables

Create/update `.env` file in `server/` directory:

```env
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
BACKEND_PORT=3000
CORS_ORIGIN=https://hub.amgrealty.in
```

### 4.4 Start/Restart Backend Server

Using PM2 (recommended):

```bash
# Install PM2 if not installed
npm install -g pm2

# Start the server
cd /path/to/MERN-STACK-FMS/server
pm2 start index.js --name "fms-backend"

# Or restart if already running
pm2 restart fms-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

Or using systemd service:

```bash
# Create systemd service file
sudo nano /etc/systemd/system/fms-backend.service
```

Add this content:

```ini
[Unit]
Description=FMS Backend Server
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/MERN-STACK-FMS/server
ExecStart=/usr/bin/node index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable fms-backend
sudo systemctl start fms-backend
sudo systemctl status fms-backend
```

---

## Step 5: SSL Certificate Setup

### 5.1 Install Certbot (Let's Encrypt)

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificates

```bash
# For main app
sudo certbot --nginx -d hub.amgrealty.in

# For HR portal
sudo certbot --nginx -d hr.amgrealty.in
```

### 5.3 Auto-renewal

Certbot automatically sets up renewal. Test with:

```bash
sudo certbot renew --dry-run
```

---

## Step 6: DNS Configuration

Ensure your DNS records are set correctly:

```
Type: A
Name: hub
Value: [Your VPS IP Address]

Type: A
Name: hr
Value: [Your VPS IP Address]
```

Or if using CNAME:

```
Type: CNAME
Name: hub
Value: [Your domain or subdomain]

Type: CNAME
Name: hr
Value: [Your domain or subdomain]
```

---

## Step 7: Verify Deployment

### 7.1 Check Backend Health

```bash
curl https://hub.amgrealty.in/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "uptime": ...,
  "environment": "production"
}
```

### 7.2 Test Main Application

1. Visit: `https://hub.amgrealty.in`
2. Check browser console for any errors
3. Test login functionality
4. Verify API calls are going to `hub.amgrealty.in`

### 7.3 Test HR Admin Portal

1. Visit: `https://hr.amgrealty.in`
2. Check browser console for any errors
3. Verify API calls are going to `hub.amgrealty.in` (check Network tab)

---

## Step 8: Troubleshooting

### 8.1 CORS Errors

If you see CORS errors, verify:
- `server/index.js` includes both domains in `allowedOrigins`
- Nginx is forwarding the correct `Host` header
- Backend server is running and accessible

### 8.2 502 Bad Gateway

- Check if Node.js server is running: `pm2 list` or `sudo systemctl status fms-backend`
- Check server logs: `pm2 logs fms-backend` or `sudo journalctl -u fms-backend -f`
- Verify port 3000 is not blocked by firewall

### 8.3 SSL Certificate Issues

- Verify certificate paths in Nginx config
- Check certificate expiration: `sudo certbot certificates`
- Renew if needed: `sudo certbot renew`

### 8.4 API Not Working

- Check Nginx proxy_pass configuration
- Verify backend URL in frontend code
- Check browser Network tab to see actual API requests
- Verify backend is accessible: `curl http://localhost:3000/health`

---

## Summary of Files to Update

### ✅ Already Configured (No Changes Needed):
1. `utils/ipAddress.ts` - Main app backend URL
2. `src/utils/ipAddress.ts` - Main app source backend URL
3. `hr-admin-portal/src/utils/ipAddress.ts` - HR portal backend URL
4. `server/index.js` - CORS configuration
5. `server/config.js` - Production domain

### 📝 Files You Need to Create/Update on VPS:
1. Nginx configuration for `hub.amgrealty.in`
2. Nginx configuration for `hr.amgrealty.in`
3. Environment variables (`.env` in server folder)
4. SSL certificates for both domains

### 🔨 Build Commands:
1. Main app: `npm run build:prod` or `npm run build:win`
2. HR portal: `VITE_BACKEND_URL=https://hub.amgrealty.in npm run build`

---

## Quick Checklist

- [ ] DNS records configured for both domains
- [ ] Main app built and uploaded to VPS
- [ ] HR portal built and uploaded to VPS
- [ ] Nginx configurations created and enabled
- [ ] SSL certificates obtained for both domains
- [ ] Backend server running on port 3000
- [ ] Environment variables set in server/.env
- [ ] CORS configured correctly in server/index.js
- [ ] Test both applications in browser
- [ ] Verify API calls are working correctly

---

## Support

If you encounter issues:
1. Check server logs: `pm2 logs` or `sudo journalctl -u fms-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify all services are running: `pm2 list`, `sudo systemctl status nginx`


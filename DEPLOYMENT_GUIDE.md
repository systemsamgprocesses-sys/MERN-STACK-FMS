# Deployment Guide - Complete Setup

## 📦 Files to Upload

### Required Files
```
├── server/                    ✅ Upload entire folder
│   ├── models/
│   ├── routes/               (including new import.js)
│   ├── utils/
│   ├── index.js
│   └── config.js
├── dist/                      ✅ Upload (newly built with all features)
├── assets/                    ✅ Upload
│   ├── AMG LOGO.webp
│   ├── favicon.ico
│   └── projects.csv
├── package.json               ✅ Upload
├── package-lock.json          ✅ Upload
└── .env                       ✅ Upload (configure for production)
```

### Don't Upload
- `node_modules/` (install on server)
- `src/` (already compiled in dist)
- `.git/`
- Development files

## 🔧 Server Setup

### 1. Upload Files
```bash
# Using FTP/SFTP, upload all required files
# Or use rsync:
rsync -avz --exclude 'node_modules' ./ user@hub.amgrealty.in:/path/to/app/
```

### 2. Install Dependencies
```bash
cd /path/to/app
npm install --production
```

### 3. Configure Environment
Edit `.env` file:
```env
MONGO_URI=mongodb://localhost:27017/task-management-system
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secret-production-key
CORS_ORIGIN=https://hub.amgrealty.in
```

### 4. Create Required Directories
```bash
mkdir -p uploads/imports
mkdir -p uploads
mkdir -p assets
```

### 5. Set Permissions
```bash
chmod -R 755 server/
chmod -R 755 dist/
chmod -R 777 uploads/
```

## 🚀 Start the Application

### Option 1: Direct Start
```bash
NODE_ENV=production node server/index.js
```

### Option 2: Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server/index.js --name "amg-task-system"

# Save PM2 config
pm2 save

# Setup auto-start on reboot
pm2 startup
```

### Option 3: Using systemd
Create `/etc/systemd/system/amg-task.service`:
```ini
[Unit]
Description=AMG Task Management System
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable amg-task
sudo systemctl start amg-task
sudo systemctl status amg-task
```

## 🌐 Nginx Configuration (if using)

```nginx
server {
    listen 80;
    server_name hub.amgrealty.in;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hub.amgrealty.in;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # API and file uploads
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://localhost:5000;
    }

    location /assets/ {
        proxy_pass http://localhost:5000;
    }

    # Frontend (SPA)
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## ✅ Verification Steps

### 1. Check Server is Running
```bash
curl http://localhost:5000/health
# Should return: {"status":"OK",...}
```

### 2. Check Frontend
Visit: `https://hub.amgrealty.in`
- Should show login page
- Logo should be visible
- No console errors

### 3. Test Import/Export
1. Login as admin
2. Go to Import/Export page
3. Download a sample CSV
4. Upload it back
5. Verify import success

### 4. Test Start Project
1. Login as any user (employee/manager/admin)
2. Verify "Start Project" is visible in sidebar
3. Click and verify page loads

## 📊 Post-Deployment Tasks

### 1. Import Data (if needed)
```bash
# Import existing tasks
npm run import-tasks

# Import FMS templates
npm run import-fms

# Import projects
npm run import-projects
```

### 2. Create Users
Use Admin Panel or seed script:
```bash
npm run seed-users
```

### 3. Configure Task Settings
Login as admin → Admin Panel → Settings tab
Configure completion requirements

## 🔍 Troubleshooting

### Issue: Assets not showing
**Solution**:
```bash
# Check assets directory exists
ls -la assets/

# Verify permissions
chmod 755 assets/
chmod 644 assets/*

# Check server logs
pm2 logs amg-task-system
```

### Issue: Import not working
**Solution**:
```bash
# Check uploads directory
mkdir -p uploads/imports
chmod 777 uploads/imports

# Verify csv-parser is installed
npm list csv-parser
```

### Issue: "Start Project" not accessible
**Solution**:
- Clear browser cache (Ctrl+Shift+R)
- Verify new dist folder is deployed
- Check user permissions in database

### Issue: MongoDB connection failed
**Solution**:
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Test connection
mongo --eval "db.stats()"

# Check .env MONGO_URI is correct
```

## 📝 Monitoring

### Check Application Logs
```bash
# PM2
pm2 logs amg-task-system

# Systemd
sudo journalctl -u amg-task -f

# Direct
tail -f /path/to/app/logs/app.log
```

### Monitor Performance
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

## 🔄 Updates

### Deploy New Changes
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Rebuild frontend
npm run build

# Restart server
pm2 restart amg-task-system
```

## 🎉 Success Criteria

- ✅ Server running on port 5000
- ✅ Frontend accessible at https://hub.amgrealty.in
- ✅ Login works
- ✅ Assets (logo, favicon) visible
- ✅ Import/Export page accessible
- ✅ Sample CSVs download correctly
- ✅ File uploads work
- ✅ Start Project accessible to all users
- ✅ No console errors
- ✅ MongoDB connected

## 📞 Support

If issues persist:
1. Check server logs
2. Verify all environment variables
3. Test MongoDB connection
4. Clear browser cache
5. Check file permissions

Your application is now production-ready! 🚀

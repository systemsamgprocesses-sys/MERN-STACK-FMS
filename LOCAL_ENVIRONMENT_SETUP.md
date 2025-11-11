
# 🖥️ Local Environment Setup Guide

This guide explains how to configure the backend to switch between local development and production environments.

## 📋 Table of Contents

1. [Current Architecture](#current-architecture)
2. [Environment Variables](#environment-variables)
3. [Local Development Setup](#local-development-setup)
4. [Backend Configuration](#backend-configuration)
5. [Frontend Configuration](#frontend-configuration)
6. [Switching Environments](#switching-environments)

---

## 1. Current Architecture

The application uses environment variables to determine which backend URL to use:

- **Development**: Backend runs on `http://localhost:3000`
- **Production**: Backend runs on `https://hub.amgrealty.in`

---

## 2. Environment Variables

### Backend Environment Variables (`.env`)

Create a `.env` file in the root directory (if not exists):

```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/task-management-system

# Server Configuration
BACKEND_PORT=3000
NODE_ENV=development

# JWT Secret
JWT_SECRET=dev-jwt-secret-key-change-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:5000
```

### Frontend Environment Variables

The frontend uses `VITE_BACKEND_URL` to determine the backend URL.

**For Local Development**: Set in `.replit` or terminal:
```bash
export VITE_BACKEND_URL="http://localhost:3000"
```

**For Production Build**:
```bash
export VITE_BACKEND_URL="https://hub.amgrealty.in"
```

---

## 3. Local Development Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start MongoDB Locally

**Option A: Using Replit (Current Setup)**
```bash
mkdir -p ~/mongodb-data
mongod --dbpath ~/mongodb-data --port 27017 --bind_ip 127.0.0.1
```

**Option B: Using System MongoDB**
```bash
sudo systemctl start mongod
```

### Step 3: Start Backend Server

```bash
export MONGO_URI="mongodb://localhost:27017/task-management-system"
export BACKEND_PORT="3000"
export NODE_ENV="development"
export JWT_SECRET="dev-jwt-secret-key-change-in-production"
export CORS_ORIGIN="http://localhost:5000"
npm run server
```

### Step 4: Start Frontend Development Server

```bash
export VITE_BACKEND_URL="http://localhost:3000"
npm run client
```

### Step 5: Access Application

Open your browser to: `http://localhost:5000`

---

## 4. Backend Configuration

The backend configuration is in `server/config.js`:

```javascript
// Server Configuration
export const config = {
  // MongoDB Connection String
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/task-management-system',
  
  // Server Configuration
  port: process.env.BACKEND_PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT Secret for authentication
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  
  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  
  // Production domain
  productionDomain: 'https://hub.amgrealty.in',
  
  // File Upload Configuration
  maxFileSize: 10 * 1024 * 1024, // 10MB
  uploadsDir: './uploads'
};
```

### CORS Configuration (server/index.js)

The CORS setup already supports multiple origins:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'https://hub.amgrealty.in',
  'https://task.amgrealty.in',
  'https://tasks.amgrealty.in',
  replitDomain ? `https://${replitDomain}` : null,
  config.corsOrigin
].filter(Boolean);
```

**This means your local development environment is already supported!**

---

## 5. Frontend Configuration

The frontend uses `utils/ipAddress.ts` to determine the backend URL:

```typescript
export const address = import.meta.env.VITE_BACKEND_URL || 'https://hub.amgrealty.in';
```

### How It Works

- If `VITE_BACKEND_URL` is set, it uses that value
- Otherwise, it defaults to production: `https://hub.amgrealty.in`

---

## 6. Switching Environments

### Method 1: Using Environment Variables (Recommended)

**For Local Development:**

```bash
# Terminal 1 - MongoDB
mkdir -p ~/mongodb-data
mongod --dbpath ~/mongodb-data --port 27017 --bind_ip 127.0.0.1

# Terminal 2 - Backend
export MONGO_URI="mongodb://localhost:27017/task-management-system"
export BACKEND_PORT="3000"
export NODE_ENV="development"
export CORS_ORIGIN="http://localhost:5000"
npm run server

# Terminal 3 - Frontend
export VITE_BACKEND_URL="http://localhost:3000"
npm run client
```

**For Production:**

```bash
export VITE_BACKEND_URL="https://hub.amgrealty.in"
npm run build
```

### Method 2: Using NPM Scripts

You can add convenience scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "dev:local": "cross-env VITE_BACKEND_URL=http://localhost:3000 npm run client",
    "dev:prod": "cross-env VITE_BACKEND_URL=https://hub.amgrealty.in npm run client",
    "client": "vite --host 0.0.0.0 --port 5000",
    "server": "nodemon ./server/index.js"
  }
}
```

Then run:

```bash
# Local development
npm run dev:local

# Testing with production backend
npm run dev:prod
```

### Method 3: Create Environment-Specific Files

**Create `.env.local`:**

```env
VITE_BACKEND_URL=http://localhost:3000
```

**Create `.env.production`:**

```env
VITE_BACKEND_URL=https://hub.amgrealty.in
```

Then modify your build scripts:

```json
{
  "scripts": {
    "build": "vite build",
    "build:local": "vite build --mode local",
    "build:prod": "vite build --mode production"
  }
}
```

---

## 🔧 Quick Environment Switch Script

Create a file named `switch-env.sh`:

```bash
#!/bin/bash

if [ "$1" = "local" ]; then
    echo "🔧 Switching to LOCAL environment..."
    export VITE_BACKEND_URL="http://localhost:3000"
    export MONGO_URI="mongodb://localhost:27017/task-management-system"
    export NODE_ENV="development"
    export CORS_ORIGIN="http://localhost:5000"
    echo "✅ Environment set to LOCAL"
    echo "Backend: http://localhost:3000"
    echo "Frontend: http://localhost:5000"
elif [ "$1" = "prod" ]; then
    echo "🚀 Switching to PRODUCTION environment..."
    export VITE_BACKEND_URL="https://hub.amgrealty.in"
    export NODE_ENV="production"
    export CORS_ORIGIN="https://hub.amgrealty.in"
    echo "✅ Environment set to PRODUCTION"
    echo "Backend: https://hub.amgrealty.in"
else
    echo "Usage: ./switch-env.sh [local|prod]"
fi
```

Make it executable:

```bash
chmod +x switch-env.sh
```

Use it:

```bash
# Switch to local
source ./switch-env.sh local

# Switch to production
source ./switch-env.sh prod
```

---

## 🧪 Testing Your Setup

### Test Backend Connection

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-11T...",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0"
}
```

### Test Frontend Connection

Open browser console on `http://localhost:5000` and check:

```javascript
console.log(import.meta.env.VITE_BACKEND_URL);
// Should show: http://localhost:3000
```

---

## 🐛 Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Check backend logs for blocked origins
2. Verify `CORS_ORIGIN` environment variable
3. Ensure frontend URL is in `allowedOrigins` array in `server/index.js`

### Cannot Connect to Backend

1. Verify backend is running: `curl http://localhost:3000/health`
2. Check `VITE_BACKEND_URL` is set correctly
3. Check browser console for the actual URL being used

### MongoDB Connection Failed

1. Ensure MongoDB is running: `mongod --version`
2. Check connection string in `.env`
3. Verify MongoDB is listening on localhost:27017

---

## 📝 Summary

Your application is already configured to work in both local and production environments! The key is setting the `VITE_BACKEND_URL` environment variable:

- **Local**: `http://localhost:3000`
- **Production**: `https://hub.amgrealty.in`

The backend CORS configuration already allows both origins, so no backend changes are needed for local development.

**Happy coding! 🎉**

# Task Management System Setup Guide

## Quick Fix for MongoDB Connection Error

The server was failing to connect to MongoDB because the connection string was undefined. I've created a configuration system to fix this.

## What I Fixed

1. **Created `server/config.js`** - Centralized configuration file
2. **Updated `server/index.js`** - Now uses the config instead of undefined environment variables
3. **Added fallback values** - Server will work with default local MongoDB setup

## MongoDB Setup

### Option 1: Local MongoDB (Recommended for development)

1. Install MongoDB locally on your machine
2. Start MongoDB service
3. The server will automatically connect to `mongodb://localhost:27017/task-management-system`

### Option 2: MongoDB Atlas (Cloud)

1. Create a free MongoDB Atlas account
2. Create a cluster
3. Get your connection string
4. Create a `.env` file in the root directory with:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/task-management-system?retryWrites=true&w=majority
   ```

## Running the Server

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm run server
   ```

3. **Start the frontend (in another terminal):**
   ```bash
   npm run dev
   ```

## Default Admin User

The system automatically creates an admin user with these credentials:
- **Username:** Admin
- **Email:** admin@taskmanagement.com
- **Password:** 123456

**Note:** You can login using either the username or email.

## Configuration Options

### Backend Environment Variables (.env file in root directory)

You can customize the server by creating a `.env` file with these variables:

- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (default: development)
- `JWT_SECRET` - Secret for JWT tokens
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:5173)

### Frontend Environment Variables (.env file in root directory)

For the frontend, you can optionally set:

- `VITE_BACKEND_URL` - Backend server URL (default: http://localhost:5000)

**Note:** The frontend will automatically use `http://localhost:5000` if no environment variable is set.

## Troubleshooting

### Backend Issues
- **MongoDB connection error:** Make sure MongoDB is running locally or your Atlas connection string is correct
- **Port already in use:** Change the PORT in config.js or .env file
- **CORS errors:** Update CORS_ORIGIN in config.js or .env file

### Frontend Issues
- **"POST http://localhost:5173/undefined/api/auth/login 404" error:** This was caused by missing backend URL configuration. Fixed by updating `utils/ipAddress.ts` with fallback value.
- **API calls failing:** Make sure the backend server is running on the correct port (default: 5000)

The server should now start successfully with the default local MongoDB configuration!

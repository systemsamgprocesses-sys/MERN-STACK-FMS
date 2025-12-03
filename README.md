# AMG Task & FMS Management System
test
A comprehensive task management and FMS (Field Management System) application built with React, Node.js, Express, and MongoDB.

## 🚀 Quick Start

### Development
```bash
# Clone the repository
git clone <your-repo-url>
cd amg-task-system

# Copy environment file
cp env.development .env

# Install dependencies
npm install

# Start development server (both frontend and backend)
npm run dev
```

### Production Deployment

#### Quick Setup
```bash
# Run the automated setup script
chmod +x setup-production.sh
./setup-production.sh
```

#### Manual Setup
1. Copy production environment:
   ```bash
   cp env.production .env
   ```

2. Update `.env` with your production values:
   - MongoDB connection string
   - JWT secret key
   - Domain configuration

3. Build and deploy:
   ```bash
   npm install
   npm run build:prod
   pm2 start ecosystem.config.js --env production
   ```

## 📖 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete production deployment instructions
- **[Environment Configuration](env.example)** - Environment variables reference

## 🛠️ Available Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build frontend for development
- `npm run build:prod` - Build frontend for production
- `npm run start` - Start production server
- `npm run deploy` - Build and start production server
- `npm run import-fms` - Import FMS data from CSV
- `npm run import-tasks` - Import tasks data from CSV

## 🌐 Production URL

The application is deployed at: **https://hub.amgrealty.in**

## 🔧 System Requirements

- Node.js 18.x or higher
- MongoDB 5.x or higher
- PM2 (for production)
- Nginx (for reverse proxy)

## 📊 Features

- **Task Management**: Create, assign, and track tasks
- **FMS System**: Field Management System with templates
- **User Management**: Role-based access control
- **Dashboard**: Analytics and reporting
- **File Uploads**: Support for task attachments
- **Responsive Design**: Works on desktop and mobile

## 🔐 Default Admin Credentials

- **Email**: admin@taskmanagement.com
- **Password**: 123456

**⚠️ Important**: Change the default admin password after first login!

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Authentication**: JWT
- **File Storage**: Local filesystem
- **Process Management**: PM2
- **Web Server**: Nginx (production)

## 📞 Support

For deployment issues or questions, refer to the [Deployment Guide](DEPLOYMENT_GUIDE.md) or contact the development team.

---

**AMG Realty** - Task & FMS Management System

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
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Production domain
  productionDomain: 'https://hub.amgrealty.in',
  
  // File Upload Configuration
  maxFileSize: 10 * 1024 * 1024, // 10MB
  uploadsDir: './uploads'
};

// MongoDB connection options
export const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

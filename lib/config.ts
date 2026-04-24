/**
 * Application Configuration
 * Centralized configuration for the backend API
 */

export const config = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'tutor-support-system-secret-key-2025',
    expiresIn: '7d',
    refreshExpiresIn: '30d'
  },

  // Vercel Blob Storage
  blob: {
    token: process.env.BLOB_READ_WRITE_TOKEN || '',
    enabled: !!process.env.BLOB_READ_WRITE_TOKEN
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    enabled: !!process.env.MONGODB_URI,
    database: process.env.MONGODB_DATABASE || 'tutor-support-system'
  },

  // WebSocket Configuration
  websocket: {
    url: process.env.WEBSOCKET_URL || 'ws://localhost:3001'
  },

  // Frontend Configuration
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173'
  },

  // API Configuration
  api: {
    port: parseInt(process.env.API_PORT || '3000'),
    basePath: '/api'
  },

  // Python Agent Service
  agentService: {
    url: process.env.AGENT_SERVICE_URL || 'http://localhost:8001',
    timeoutMs: parseInt(process.env.AGENT_SERVICE_TIMEOUT_MS || '20000')
  },

  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  // Pagination Defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100
  },

  // Session Configuration
  session: {
    minDuration: 30, // minutes
    maxDuration: 180, // minutes
    reminderTime: 60 // minutes before session
  },

  // Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4']
  },

  // Training Credits Policy
  trainingCredits: {
    // Minimum requirements for eligibility
    minAttendanceRate: 80, // percentage
    minSessionsCompleted: 5,
    minPerformanceScore: 7.0, // optional
    // Maximum credits per session/semester
    maxCreditsPerSession: 1,
    maxCreditsPerSemester: 5,
    // Duplicate award prevention (BR-1)
    preventDuplicateAwards: true,
    duplicateCheckWindow: 'semester' // 'session' | 'semester' | 'year'
  },

  // Document Sharing Configuration
  documents: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'video/mp4'
    ],
    requireEncryption: false, // For sensitive documents
    scanForMalware: false, // Would integrate with antivirus service
    defaultAccessLevel: 'private'
  }
};

export default config;


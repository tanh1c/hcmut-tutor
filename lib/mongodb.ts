  /**
 * MongoDB Connection Utility
 * Manages MongoDB connection and provides database instance
 */

import { MongoClient, Db, MongoClientOptions } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Get MongoDB connection string from environment
 */
export function getMongoUri(): string | null {
  return process.env.MONGODB_URI || null;
}

/**
 * Check if MongoDB is configured
 */
export function isMongoEnabled(): boolean {
  return !!getMongoUri();
}

/**
 * Connect to MongoDB
 */
export async function connectMongo(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = getMongoUri();
  if (!uri) {
    throw new Error('MongoDB URI not configured. Set MONGODB_URI environment variable.');
  }

  const options: MongoClientOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 10000, // Increased timeout
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    // SSL/TLS configuration for MongoDB Atlas
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    // Retry configuration
    retryWrites: true,
    retryReads: true,
  };

  try {
    client = new MongoClient(uri, options);
    await client.connect();
    
    // Extract database name from URI
    // Format: mongodb://.../database?options or mongodb+srv://.../database?options
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    const dbName = match ? match[1] : (process.env.MONGODB_DATABASE || 'tutor-support-system');
    db = client.db(dbName);
    
    console.log('✅ Connected to MongoDB:', dbName);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get database instance (connect if needed)
 */
export async function getDb(): Promise<Db> {
  if (!db) {
    return await connectMongo();
  }
  return db;
}

/**
 * Close MongoDB connection
 */
export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('🔌 MongoDB connection closed');
  }
}

/**
 * Get collection by name
 */
export async function getCollection<T = any>(collectionName: string) {
  const database = await getDb();
  return database.collection<T>(collectionName);
}

/**
 * Health check - test MongoDB connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    return false;
  }
}


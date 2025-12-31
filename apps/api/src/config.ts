/**
 * API Konfiguration
 *
 * Liest Environment-Variablen und stellt typisierte Config bereit.
 */

interface Config {
  // Server
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';

  // Database
  mongoUri: string;
  mongoDbName: string;

  // JWT
  jwtSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;

  // MinIO
  minioEndpoint: string;
  minioPort: number;
  minioUseSSL: boolean;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;

  // App
  appName: string;
  apiVersion: string;

  // Registration
  requireInviteCode: boolean;

  // Google OAuth
  googleClientId: string;
  googleClientIdIos: string;
  googleClientIdAndroid: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

export const config: Config = {
  // Server
  port: parseInt(getEnv('PORT', '3000'), 10),
  host: getEnv('HOST', '0.0.0.0'),
  nodeEnv: getEnv('NODE_ENV', 'development') as Config['nodeEnv'],

  // Database
  mongoUri: getEnv('MONGO_URI', 'mongodb://localhost:27017'),
  mongoDbName: getEnv('MONGO_DB_NAME', 'picsec'),

  // JWT
  jwtSecret: getEnv('JWT_SECRET', 'development-secret-change-in-production'),
  jwtAccessExpiresIn: getEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // MinIO
  minioEndpoint: getEnv('MINIO_ENDPOINT', 'localhost'),
  minioPort: parseInt(getEnv('MINIO_PORT', '9000'), 10),
  minioUseSSL: getEnv('MINIO_USE_SSL', 'false') === 'true',
  minioAccessKey: getEnv('MINIO_ACCESS_KEY', 'minioadmin'),
  minioSecretKey: getEnv('MINIO_SECRET_KEY', 'minioadmin'),
  minioBucket: getEnv('MINIO_BUCKET', 'picsec'),

  // App
  appName: 'PicSec API',
  apiVersion: '1.0.0',

  // Registration
  requireInviteCode: getEnv('REQUIRE_INVITE_CODE', 'true') === 'true',

  // Google OAuth
  googleClientId: getEnv('GOOGLE_CLIENT_ID', ''),
  googleClientIdIos: getEnv('GOOGLE_CLIENT_ID_IOS', ''),
  googleClientIdAndroid: getEnv('GOOGLE_CLIENT_ID_ANDROID', ''),
};

/**
 * Validiert die Konfiguration
 */
export const validateConfig = (): void => {
  if (config.nodeEnv === 'production') {
    if (config.jwtSecret === 'development-secret-change-in-production') {
      throw new Error('JWT_SECRET muss in Production gesetzt werden!');
    }
    if (config.mongoUri === 'mongodb://localhost:27017') {
      console.warn('[Config] WARNUNG: Lokale MongoDB URI in Production!');
    }
  }
};

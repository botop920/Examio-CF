import { Redis } from '@upstash/redis';

// Determine environment variables based on the platform
const getEnv = (key: string) => {
  if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV[key]) {
    return (window as any).ENV[key];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

let redisInstance: Redis | null = null;

export const getRedis = (env?: any) => {
  if (!redisInstance) {
    const url = env?.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || getEnv('UPSTASH_REDIS_REST_URL') || 'https://placeholder-url.upstash.io';
    const token = env?.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || getEnv('UPSTASH_REDIS_REST_TOKEN') || 'placeholder-token';

    if (url === 'https://placeholder-url.upstash.io') {
      console.warn("Redis credentials missing. Check .env or Cloudflare variables");
    }

    redisInstance = new Redis({ url, token });
  }
  return redisInstance;
};

export const redis = new Proxy({} as Redis, {
  get: (target, prop) => {
    return (getRedis() as any)[prop];
  }
});

// Keys
export const QUEUE_KEY = 'exam_submissions';
export const FAILED_QUEUE_KEY = 'exam_submission_dlq'; // Dead Letter Queue
export const CONFIG_MAINTENANCE_MODE = 'config:maintenance_mode';
export const CONFIG_BATCH_SIZE = 'config:batch_size';
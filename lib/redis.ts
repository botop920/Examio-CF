import { Redis } from '@upstash/redis';

// Determine environment variables based on the platform
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const url = getEnv('UPSTASH_REDIS_REST_URL');
const token = getEnv('UPSTASH_REDIS_REST_TOKEN');

if (!url || !token) {
  console.warn("Redis credentials missing. Check .env");
}

export const redis = new Redis({
  url: url || 'https://placeholder-url.upstash.io',
  token: token || 'placeholder-token',
});

// Keys
export const QUEUE_KEY = 'exam_submissions';
export const FAILED_QUEUE_KEY = 'exam_submission_dlq'; // Dead Letter Queue
export const CONFIG_MAINTENANCE_MODE = 'config:maintenance_mode';
export const CONFIG_BATCH_SIZE = 'config:batch_size';
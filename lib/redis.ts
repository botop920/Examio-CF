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
    const url = env?.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || getEnv('UPSTASH_REDIS_REST_URL');
    const token = env?.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || getEnv('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      console.warn("Redis credentials missing. Check .env or Cloudflare variables. Using mock Redis instance.");
      // Return a mock Redis instance that does nothing to prevent crashes
      redisInstance = {
        get: async () => null,
        set: async () => 'OK',
        del: async () => 1,
        lpush: async () => 1,
        rpop: async () => null,
        lrange: async () => [],
        llen: async () => 0,
        sadd: async () => 1,
        srem: async () => 1,
        smembers: async () => [],
        hget: async () => null,
        hset: async () => 1,
        hgetall: async () => ({}),
        incr: async () => 1,
        expire: async () => 1,
        ttl: async () => -1,
        ping: async () => 'PONG',
      } as unknown as Redis;
      return redisInstance;
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
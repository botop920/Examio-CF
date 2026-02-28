import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from "@cloudflare/vite-plugin";
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Generate .dev.vars for Cloudflare local dev
  if (process.env.NODE_ENV !== 'production') {
    const devVars = [
      `VITE_SUPABASE_URL=${env.VITE_SUPABASE_URL || ''}`,
      `VITE_SUPABASE_ANON_KEY=${env.VITE_SUPABASE_ANON_KEY || ''}`,
      `UPSTASH_REDIS_REST_URL=${env.UPSTASH_REDIS_REST_URL || ''}`,
      `UPSTASH_REDIS_REST_TOKEN=${env.UPSTASH_REDIS_REST_TOKEN || ''}`,
      `SUPABASE_SERVICE_ROLE_KEY=${env.SUPABASE_SERVICE_ROLE_KEY || ''}`
    ].join('\n');
    fs.writeFileSync('.dev.vars', devVars);
  }

  return {
    plugins: [react(), cloudflare()],
    define: {
      // Map system env vars to process.env for the Google GenAI SDK
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
    },
  };
});
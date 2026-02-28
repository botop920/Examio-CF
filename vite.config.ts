import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react(), cloudflare()],
    define: {
      // Map system env vars to process.env for the Google GenAI SDK
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
    },
  };
});
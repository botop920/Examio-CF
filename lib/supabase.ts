import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables across different environments
const getEnv = (key: string) => {
  if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV[key]) {
    return (window as any).ENV[key];
  }
  // Check import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  // Check process.env (Node/Legacy)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

let supabaseInstance: any = null;

export const getSupabase = (env?: any) => {
  if (!supabaseInstance) {
    let supabaseUrl = env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || getEnv('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
    const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || getEnv('VITE_SUPABASE_ANON_KEY') || 'placeholder';

    // Sanitize URL: remove trailing slash
    if (supabaseUrl && supabaseUrl.endsWith('/')) {
      supabaseUrl = supabaseUrl.slice(0, -1);
    }

    if (supabaseUrl === 'https://placeholder.supabase.co') {
      console.warn("Supabase credentials missing. Please check your .env file or Cloudflare variables.");
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

export const formatError = (error: any): string => {
  if (!error) return 'Unknown error';
  const message = error.message || String(error);
  if (message.includes('Load failed') || message.includes('Failed to fetch')) {
    return 'Network error: Please check your internet connection or disable Adblockers/VPN.';
  }
  return message;
};

export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    return (getSupabase() as any)[prop];
  }
});
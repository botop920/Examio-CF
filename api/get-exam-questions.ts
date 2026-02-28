
import { createClient } from '@supabase/supabase-js';
import { getRedis } from '../lib/redis';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request, env: any) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Use Service Role Key for robust backend access (bypasses RLS)
  const supabaseUrl = env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const redis = getRedis(env);

  try {
    const { searchParams } = new URL(req.url);
    const exam_id = searchParams.get('exam_id');

    if (!exam_id) {
      return new Response(JSON.stringify({ error: 'Missing exam_id' }), { status: 400 });
    }

    // Redis Cache Key for Exam Questions
    const CACHE_KEY = `exam_questions:${exam_id}`;
    const CACHE_DURATION = 7200; // 2 Hours (in seconds)

    // 1. Try Fetching from Redis (Fast Path)
    const cachedData: any = await redis.get(CACHE_KEY);
    
    if (cachedData) {
      // Redis returns data as string or object depending on client, ensure it's returned correctly
      return new Response(JSON.stringify(typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData), { 
        status: 200,
        headers: { 
            'Content-Type': 'application/json', 
            'X-Cache': 'HIT',
            'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=59'
        }
      });
    }

    // 2. Fetch from Database (Slow Path - Only for first user)
    // Try RPC first (optimized query)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_exam_questions_student', {
        p_exam_id: exam_id
    });

    let finalData = [];

    if (!rpcError && rpcData) {
        finalData = rpcData;
    } else {
        // Fallback to standard query if RPC fails
        const { data: rawData, error: rawError } = await supabase
            .from('questions')
            .select('*')
            .eq('exam_id', exam_id)
            .order('id', { ascending: true });

        if (rawError) {
            throw rawError;
        }
        finalData = rawData || [];
    }

    // 3. Store in Redis for 2 Hours
    if (finalData.length > 0) {
        await redis.set(CACHE_KEY, JSON.stringify(finalData), { ex: CACHE_DURATION });
    }

    return new Response(JSON.stringify(finalData), { 
      status: 200,
      headers: { 
          'Content-Type': 'application/json', 
          'X-Cache': 'MISS',
          'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=59'
      }
    });

  } catch (error: any) {
    console.error('Get Questions API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Error' }), { status: 500 });
  }
}

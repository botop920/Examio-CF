import { createClient } from '@supabase/supabase-js';
import { getRedis } from '../lib/redis';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request, env: any) {
  // Initialize Supabase
  const supabaseUrl = env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const redis = getRedis(env);

  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('exam_id');

    if (!examId) {
      return new Response(JSON.stringify({ error: 'Missing exam_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const CACHE_KEY = `leaderboard:${examId}`;

    // 1. Try fetching from Redis
    try {
      const cachedData = await redis.get(CACHE_KEY);
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
            'X-Cache': 'HIT'
          },
        });
      }
    } catch (redisError) {
      console.error('Redis Fetch Error:', redisError);
      // Continue to DB fetch if Redis fails
    }

    // 2. Fetch from Database
    const { data, error } = await supabase
      .from('student_submissions')
      .select('student_name, student_roll, obtained_marks, time_taken')
      .eq('exam_id', examId)
      .order('obtained_marks', { ascending: false })
      .order('time_taken', { ascending: true }) // Tie-breaker: less time is better
      .limit(50);

    if (error) throw error;

    // 3. Cache in Redis (5 Seconds)
    if (data && data.length > 0) {
      try {
        await redis.set(CACHE_KEY, JSON.stringify(data), { ex: 5 });
      } catch (redisSetError) {
        console.error('Redis Set Error:', redisSetError);
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'X-Cache': 'MISS'
      },
    });

  } catch (error: any) {
    console.error('Leaderboard API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

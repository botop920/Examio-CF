import { createClient } from '@supabase/supabase-js';
import { getRedis, QUEUE_KEY } from '../lib/redis';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request, env: any) {
  // Initialize Supabase
  // Uses Service Role Key if available for backend processing (bypasses RLS), otherwise falls back to Anon key
  const supabaseUrl = env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const redis = getRedis(env);

  try {
    // 1. Security Check
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== 'Alif123@') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch items from Redis (Batch of 50)
    // lpop(key, count) removes and returns the first 'count' elements
    const rawData = await redis.lpop(QUEUE_KEY, 50);

    if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'Queue is empty' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normalize data (Upstash can return single item or array depending on client/version)
    const items = Array.isArray(rawData) ? rawData : [rawData];

    // Parse JSON data safely
    const payloads = items
      .map((item: any) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch (e) {
          console.error('JSON Parse Error:', e);
          return null;
        }
      })
      .filter((p) => p !== null);

    if (payloads.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'No valid payloads parsed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Insert into Supabase (Safety Net Wrapped)
    try {
      // Using RPC 'process_exam_result_queue' is recommended because exam payloads usually
      // contain nested data (submission + answers) which requires transactional handling.
      // If this RPC does not exist, standard table insert will be attempted below in catch, 
      // or you can replace this with `supabase.from('student_results').insert(payloads)` if flat structure.
      const { data, error } = await supabase.rpc('process_exam_result_queue', {
        payloads: payloads,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, processed: payloads.length, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (dbError: any) {
      console.error('Supabase Sync Failed:', dbError);

      // 4. SAFETY NET: Push data back to Redis
      // If DB insert fails, we MUST put the data back into the queue to prevent data loss.
      // We use rpush to add them to the end of the queue (or FAILED_QUEUE_KEY if preferred).
      
      const failedItems = payloads.map((p: any) => JSON.stringify(p));
      await redis.rpush(QUEUE_KEY, ...failedItems);

      return new Response(
        JSON.stringify({
          error: 'Database sync failed, items returned to queue',
          details: dbError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('Process Queue Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
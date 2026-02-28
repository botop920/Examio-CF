import { createClient } from '@supabase/supabase-js';
import { redis, QUEUE_KEY, FAILED_QUEUE_KEY, CONFIG_BATCH_SIZE } from '../../lib/redis';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// CRITICAL FIX: Use Service Role Key for background jobs to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!; 

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export const config = {
  runtime: 'edge', 
};

export default async function handler(req: Request) {
  // Security check: Verify Vercel Cron or specific secret
  const authHeader = req.headers.get('authorization');
  if (req.headers.get('user-agent') !== 'vercel-cron/1.0' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     // Uncomment in production for security
     // return new Response('Unauthorized', { status: 401 }); 
  }

  try {
    // 1. Get Batch Size Config (Default to 50 for stability)
    const batchSizeStr = await redis.get(CONFIG_BATCH_SIZE) as string;
    const batchSize = batchSizeStr ? parseInt(batchSizeStr) : 50;

    // 2. Pop batch from Redis
    const rawData = await redis.lpop(QUEUE_KEY, batchSize);

    if (!rawData || rawData.length === 0) {
      return new Response(JSON.stringify({ message: 'Queue is empty' }), { status: 200 });
    }

    // 3. Parse Data safely
    const payloads = rawData.map((item: any) => {
        try {
            return typeof item === 'string' ? JSON.parse(item) : item;
        } catch (e) {
            console.error("JSON Parse Error on item:", item);
            return null;
        }
    }).filter(p => p !== null); // Remove failed parses

    if (payloads.length === 0) {
        return new Response(JSON.stringify({ message: 'No valid payloads found' }), { status: 200 });
    }

    // 4. Send to Supabase RPC (Batch Insert)
    const { data, error } = await supabase.rpc('process_exam_result_queue', {
      payloads: payloads
    });

    if (error) {
      console.error('Supabase Sync Failed:', error);
      
      // CRITICAL: Integrity Fallback
      // If DB Insert fails, push items back to DLQ (Dead Letter Queue)
      const failedStrings = payloads.map((p: any) => JSON.stringify(p));
      await redis.rpush(FAILED_QUEUE_KEY, ...failedStrings);

      return new Response(JSON.stringify({ error: 'Sync failed, moved to DLQ', details: error }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: payloads.length, 
      db_result: data 
    }), { status: 200 });

  } catch (error: any) {
    console.error('Worker Crash:', error);
    return new Response(JSON.stringify({ error: 'Worker Crashed', details: error.message }), { status: 500 });
  }
}
import { c as createClient } from "./index-CnDy_vzX.js";
import { r as redis, a as CONFIG_BATCH_SIZE, Q as QUEUE_KEY, F as FAILED_QUEUE_KEY } from "./redis--Ks5ba5B.js";
import "stream";
import "http";
import "url";
import "https";
import "zlib";
const config = {
  runtime: "edge"
};
async function handler(req) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase credentials missing" }), { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const authHeader = req.headers.get("authorization");
  if (req.headers.get("user-agent") !== "vercel-cron/1.0" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) ;
  try {
    const batchSizeStr = await redis.get(CONFIG_BATCH_SIZE);
    const batchSize = batchSizeStr ? parseInt(batchSizeStr) : 50;
    const rawData = await redis.lpop(QUEUE_KEY, batchSize);
    if (!rawData || rawData.length === 0) {
      return new Response(JSON.stringify({ message: "Queue is empty" }), { status: 200 });
    }
    const payloads = rawData.map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch (e) {
        console.error("JSON Parse Error on item:", item);
        return null;
      }
    }).filter((p) => p !== null);
    if (payloads.length === 0) {
      return new Response(JSON.stringify({ message: "No valid payloads found" }), { status: 200 });
    }
    const { data, error } = await supabase.rpc("process_exam_result_queue", {
      payloads
    });
    if (error) {
      console.error("Supabase Sync Failed:", error);
      const failedStrings = payloads.map((p) => JSON.stringify(p));
      await redis.rpush(FAILED_QUEUE_KEY, ...failedStrings);
      return new Response(JSON.stringify({ error: "Sync failed, moved to DLQ", details: error }), { status: 500 });
    }
    return new Response(JSON.stringify({
      success: true,
      processed: payloads.length,
      db_result: data
    }), { status: 200 });
  } catch (error) {
    console.error("Worker Crash:", error);
    return new Response(JSON.stringify({ error: "Worker Crashed", details: error.message }), { status: 500 });
  }
}
export {
  config,
  handler as default
};

import { c as createClient } from "./index-CnDy_vzX.js";
import { r as redis, Q as QUEUE_KEY } from "./redis-DAGFdtOs.js";
import "stream";
import "http";
import "url";
import "https";
import "zlib";
const config = {
  runtime: "edge"
};
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    if (secret !== "Alif123@") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const rawData = await redis.lpop(QUEUE_KEY, 50);
    if (!rawData || Array.isArray(rawData) && rawData.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "Queue is empty" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const items = Array.isArray(rawData) ? rawData : [rawData];
    const payloads = items.map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch (e) {
        console.error("JSON Parse Error:", e);
        return null;
      }
    }).filter((p) => p !== null);
    if (payloads.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No valid payloads parsed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      const { data, error } = await supabase.rpc("process_exam_result_queue", {
        payloads
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, processed: payloads.length, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (dbError) {
      console.error("Supabase Sync Failed:", dbError);
      const failedItems = payloads.map((p) => JSON.stringify(p));
      await redis.rpush(QUEUE_KEY, ...failedItems);
      return new Response(
        JSON.stringify({
          error: "Database sync failed, items returned to queue",
          details: dbError.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Process Queue Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
export {
  config,
  handler as default
};

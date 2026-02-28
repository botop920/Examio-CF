import { c as createClient } from "./index-CnDy_vzX.js";
import { r as redis } from "./redis-DWDO0PVE.js";
import "stream";
import "http";
import "url";
import "https";
import "zlib";
const config = {
  runtime: "edge"
};
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("exam_id");
    if (!examId) {
      return new Response(JSON.stringify({ error: "Missing exam_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const CACHE_KEY = `leaderboard:${examId}`;
    try {
      const cachedData = await redis.get(CACHE_KEY);
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
            "X-Cache": "HIT"
          }
        });
      }
    } catch (redisError) {
      console.error("Redis Fetch Error:", redisError);
    }
    const { data, error } = await supabase.from("student_submissions").select("student_name, obtained_marks, time_taken").eq("exam_id", examId).order("obtained_marks", { ascending: false }).order("time_taken", { ascending: true }).limit(50);
    if (error) throw error;
    if (data && data.length > 0) {
      try {
        await redis.set(CACHE_KEY, JSON.stringify(data), { ex: 7200 });
      } catch (redisSetError) {
        console.error("Redis Set Error:", redisSetError);
      }
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        "X-Cache": "MISS"
      }
    });
  } catch (error) {
    console.error("Leaderboard API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
export {
  config,
  handler as default
};

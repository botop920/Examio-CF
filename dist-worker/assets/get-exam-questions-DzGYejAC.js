import { c as createClient } from "./index-CnDy_vzX.js";
import { r as redis } from "./redis-DAGFdtOs.js";
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
const supabase = createClient(supabaseUrl, supabaseKey);
async function handler(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const exam_id = searchParams.get("exam_id");
    if (!exam_id) {
      return new Response(JSON.stringify({ error: "Missing exam_id" }), { status: 400 });
    }
    const CACHE_KEY = `exam_questions:${exam_id}`;
    const CACHE_DURATION = 7200;
    const cachedData = await redis.get(CACHE_KEY);
    if (cachedData) {
      return new Response(JSON.stringify(typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT",
          "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=59"
        }
      });
    }
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_exam_questions_student", {
      p_exam_id: exam_id
    });
    let finalData = [];
    if (!rpcError && rpcData) {
      finalData = rpcData;
    } else {
      const { data: rawData, error: rawError } = await supabase.from("questions").select("*").eq("exam_id", exam_id).order("id", { ascending: true });
      if (rawError) {
        throw rawError;
      }
      finalData = rawData || [];
    }
    if (finalData.length > 0) {
      await redis.set(CACHE_KEY, JSON.stringify(finalData), { ex: CACHE_DURATION });
    }
    return new Response(JSON.stringify(finalData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=59"
      }
    });
  } catch (error) {
    console.error("Get Questions API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Error" }), { status: 500 });
  }
}
export {
  config,
  handler as default
};

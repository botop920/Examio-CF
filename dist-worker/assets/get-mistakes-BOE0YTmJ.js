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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
async function handler(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const teacher_id = searchParams.get("teacher_id");
    const student_roll = searchParams.get("student_roll");
    if (!teacher_id || !student_roll) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }
    const CACHE_KEY = `mistakes_v2:${teacher_id}:${student_roll.trim()}`;
    const cachedData = await redis.get(CACHE_KEY);
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-Cache": "HIT" }
      });
    }
    let finalData = [];
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_student_mistakes_v2", {
      p_teacher_id: teacher_id,
      p_student_roll: student_roll.trim()
    });
    if (!rpcError && rpcData && rpcData.length > 0) {
      finalData = rpcData;
    } else {
      console.log("RPC failed or empty, using fallback query...");
      const { data: rawData, error: rawError } = await supabase.from("student_answers").select(`
                selected_option,
                is_correct,
                questions (
                    question_text,
                    correct_answer,
                    explanation,
                    subject
                ),
                student_submissions!inner (
                    student_roll,
                    exams!inner (
                        title,
                        teacher_id
                    )
                )
            `).eq("student_submissions.student_roll", student_roll.trim()).eq("student_submissions.exams.teacher_id", teacher_id).eq("is_correct", false).order("created_at", { ascending: false }).limit(50);
      if (rawError) {
        throw rawError;
      }
      if (rawData) {
        finalData = rawData.map((item) => ({
          exam_title: item.student_submissions?.exams?.title || "Unknown Exam",
          question_text: item.questions?.question_text || "Question removed",
          selected_option: item.selected_option,
          correct_answer: item.questions?.correct_answer,
          explanation: item.questions?.explanation,
          subject: item.questions?.subject || "General"
        }));
      }
    }
    if (finalData.length > 0) {
      await redis.set(CACHE_KEY, JSON.stringify(finalData), { ex: 600 });
    }
    return new Response(JSON.stringify(finalData), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" }
    });
  } catch (error) {
    console.error("Mistakes API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Error" }), { status: 500 });
  }
}
export {
  config,
  handler as default
};

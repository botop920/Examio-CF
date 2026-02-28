import { c as createClient } from "./index-CnDy_vzX.js";
import { g as getRedis, C as CONFIG_MAINTENANCE_MODE, Q as QUEUE_KEY } from "./redis-ClkGpTev.js";
import "stream";
import "http";
import "url";
import "https";
import "zlib";
const config = {
  runtime: "edge"
};
async function handler(req, env) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const supabaseUrl = env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase credentials missing" }), { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const redis = getRedis(env);
  try {
    const isMaintenance = await redis.get(CONFIG_MAINTENANCE_MODE);
    if (isMaintenance === "true") {
      return new Response(JSON.stringify({ error: "System is under maintenance. Please try again in 5 minutes." }), { status: 503 });
    }
    const body = await req.json();
    const { exam_id, student_name, student_roll, answers, time_taken, metadata } = body;
    if (!exam_id || !student_roll || !answers) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    const sanitizedRoll = student_roll.trim();
    const lockKey = `sub_lock:${exam_id}:${sanitizedRoll}`;
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      return new Response(JSON.stringify({
        error: "Submission already received. Processing results.",
        code: "ALREADY_SUBMITTED"
      }), { status: 409 });
    }
    const { data: examData, error: examError } = await supabase.from("exams").select("id, negative_marking, show_results_instant").eq("id", exam_id).single();
    if (examError || !examData) {
      return new Response(JSON.stringify({ error: "Exam settings not found" }), { status: 404 });
    }
    const negativePercentage = Number(examData.negative_marking) || 0;
    const showResultsInstant = examData.show_results_instant !== false;
    const { data: questionsData, error: qError } = await supabase.from("questions").select("id, correct_answer, marks, question_type, explanation").eq("exam_id", exam_id);
    if (qError || !questionsData) {
      return new Response(JSON.stringify({ error: "Exam data not found" }), { status: 404 });
    }
    const questions = questionsData;
    let totalScore = 0;
    let obtainedScore = 0;
    const processedAnswers = [];
    const solutionKey = {};
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    for (const ans of answers) {
      const question = questionMap.get(ans.question_id);
      if (!question) continue;
      const marks = parseFloat(question.marks) || 1;
      totalScore += marks;
      let isCorrect = false;
      let marksObtained = 0;
      solutionKey[question.id] = {
        correct: question.correct_answer,
        explanation: question.explanation
      };
      if (question.question_type === "mcq") {
        if (ans.selected_option === question.correct_answer) {
          isCorrect = true;
          marksObtained = marks;
          obtainedScore += marks;
        } else if (ans.selected_option) {
          const deduction = marks * (negativePercentage / 100);
          marksObtained = -deduction;
          obtainedScore -= deduction;
        }
      }
      processedAnswers.push({
        question_id: ans.question_id,
        selected_option: ans.selected_option,
        text_answer: ans.text_answer,
        attachment_url: ans.attachment_url,
        is_correct: isCorrect,
        marks_obtained: marksObtained
      });
    }
    const payload = {
      exam_id,
      student_name,
      student_roll: sanitizedRoll,
      total_marks: totalScore,
      obtained_marks: obtainedScore,
      // Score is SAVED here regardless of visibility
      answers: processedAnswers,
      submitted_at: (/* @__PURE__ */ new Date()).toISOString(),
      time_taken: time_taken || 0,
      metadata: metadata || {}
    };
    await redis.lpush(QUEUE_KEY, JSON.stringify(payload));
    await redis.set(lockKey, "true", { ex: 86400 });
    const tempResultKey = `temp_res:${exam_id}:${sanitizedRoll}`;
    const clientPayload = {
      score: showResultsInstant ? obtainedScore : null,
      solutions: showResultsInstant ? solutionKey : null,
      answers: processedAnswers,
      timestamp: Date.now(),
      hidden: !showResultsInstant
      // Flag for client to know it's hidden
    };
    await redis.set(tempResultKey, JSON.stringify(clientPayload), { ex: 3600 });
    return new Response(JSON.stringify({
      success: true,
      score: showResultsInstant ? obtainedScore : null,
      solutions: showResultsInstant ? solutionKey : null,
      message: "Submission queued successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Submission Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 });
  }
}
export {
  config,
  handler as default
};

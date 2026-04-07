
import { createClient } from '@supabase/supabase-js';
import { getRedis, QUEUE_KEY, CONFIG_MAINTENANCE_MODE } from '../lib/redis';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request, env: any) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabaseUrl = env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const redis = getRedis(env);

  try {
    // 1. Check Maintenance Mode
    const isMaintenance = await redis.get(CONFIG_MAINTENANCE_MODE);
    if (isMaintenance === 'true') {
      return new Response(JSON.stringify({ error: 'System is under maintenance. Please try again in 5 minutes.' }), { status: 503 });
    }

    const body = await req.json();
    const { exam_id, student_name, student_roll, answers, time_taken, metadata } = body;

    if (!exam_id || !student_roll || !answers) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const sanitizedRoll = student_roll.trim();
    
    // --- REDIS LOCK CHECK ---
    const lockKey = `sub_lock:${exam_id}:${sanitizedRoll}`;
    const isLocked = await redis.get(lockKey);

    if (isLocked) {
      return new Response(JSON.stringify({ 
        error: 'Submission already received. Processing results.',
        code: 'ALREADY_SUBMITTED' 
      }), { status: 409 });
    }

    // 2. Fetch Exam Settings & Questions
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('id, negative_marking, show_results_instant')
      .eq('id', exam_id)
      .single();

    if (examError || !examData) {
      return new Response(JSON.stringify({ error: 'Exam settings not found' }), { status: 404 });
    }

    const negativePercentage = Number(examData.negative_marking) || 0;
    // Default to true if null (for backward compatibility)
    const showResultsInstant = examData.show_results_instant !== false; 

    const { data: questionsData, error: qError } = await supabase
      .from('questions')
      .select('id, correct_answer, marks, question_type, explanation')
      .eq('exam_id', exam_id);

    if (qError || !questionsData) {
      return new Response(JSON.stringify({ error: 'Exam data not found' }), { status: 404 });
    }

    const questions = questionsData as any[];

    // 3. Calculate Score Instantly (ALWAYS PERFORMED)
    let totalScore = 0;
    let obtainedScore = 0;
    const processedAnswers = [];
    
    // Prepare Solution Key for Client
    const solutionKey: Record<string, any> = {};

    const questionMap = new Map(questions.map((q: any) => [q.id, q]));

    for (const ans of answers) {
      const question = questionMap.get(ans.question_id);
      if (!question) continue;

      const marks = parseFloat(question.marks) || 1;
      totalScore += marks;

      let isCorrect = false;
      let marksObtained = 0;

      // Fill Solution Key (Only sent if showResultsInstant is true)
      solutionKey[question.id] = {
          correct: question.correct_answer,
          explanation: question.explanation
      };

      if (question.question_type === 'mcq') {
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

    // 4. Construct Payload (Full data for DB via Redis)
    const payload = {
      exam_id,
      student_name,
      student_roll: sanitizedRoll,
      total_marks: totalScore,
      obtained_marks: obtainedScore, // Score is SAVED here regardless of visibility
      answers: processedAnswers,
      submitted_at: new Date().toISOString(),
      time_taken: time_taken || 0,
      metadata: metadata || {}
    };

    // 5. REDIS OPERATIONS (Batch)
    // A. Push to Queue (For Cron Job -> DB)
    await redis.lpush(QUEUE_KEY, JSON.stringify(payload));
    
    // B. Set Lock (Prevent Duplicate)
    await redis.set(lockKey, 'true', { ex: 86400 });

    // C. Invalidate Leaderboard Cache (CRITICAL for Instant Updates)
    const leaderboardKey = `leaderboard:${exam_id}`;
    try {
        await redis.del(leaderboardKey);
        
        // D. Trigger Queue Processing in Background (Near-Instant DB Sync)
        const origin = new URL(req.url).origin;
        fetch(`${origin}/api/process-queue?secret=Alif123@`).catch(e => console.error("Queue trigger failed", e));
    } catch (e) {
        console.error("Failed to invalidate leaderboard cache or trigger queue:", e);
    }

    // E. Set Temporary Result Key (For Instant Client Access via API)
    const tempResultKey = `temp_res:${exam_id}:${sanitizedRoll}`;
    
    // Client Payload: Score/Solutions are NULL if hidden
    const clientPayload = {
        score: showResultsInstant ? obtainedScore : null,
        solutions: showResultsInstant ? solutionKey : null,
        answers: processedAnswers,
        timestamp: Date.now(),
        hidden: !showResultsInstant // Flag for client to know it's hidden
    };
    
    await redis.set(tempResultKey, JSON.stringify(clientPayload), { ex: 3600 });

    // 6. Return Result (Conditionally hidden)
    return new Response(JSON.stringify({ 
      success: true, 
      score: showResultsInstant ? obtainedScore : null, 
      solutions: showResultsInstant ? solutionKey : null, 
      message: 'Submission queued successfully' 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Submission Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}

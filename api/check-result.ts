
import { redis } from '../lib/redis';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const exam_id = searchParams.get('exam_id');
    const student_roll = searchParams.get('student_roll');

    if (!exam_id || !student_roll) {
      return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400 });
    }

    const sanitizedRoll = student_roll.trim();
    const tempResultKey = `temp_res:${exam_id}:${sanitizedRoll}`;

    // Fetch from Redis
    const cachedResult: any = await redis.get(tempResultKey);

    if (!cachedResult) {
      return new Response(JSON.stringify({ found: false }), { status: 200 });
    }

    // Parse if it's a string (Redis usually returns parsed JSON with Upstash, but being safe)
    const resultData = typeof cachedResult === 'string' ? JSON.parse(cachedResult) : cachedResult;

    return new Response(JSON.stringify({ 
      found: true, 
      data: resultData 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Check Result Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 });
  }
}

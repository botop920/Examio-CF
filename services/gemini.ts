import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.API_KEY });

export async function* generateDoubtStream(query: string, imageData?: string, audioData?: string) {
  const model = "gemini-2.5-flash"; // Using the recommended model
  const systemInstruction = `You are an expert AI tutor for Bengali students (HSC/Admission level). Answer the doubt clearly, concisely, and accurately in Bengali.

Formatting Rules:
Organize the answer step-by-step.
Add 1 blank line between each step.
Highlight important lines using bold.
For math problems, solve step-by-step vertically. NEVER write equations inline like A=B=C.
Use LaTeX for ALL math formulas, variables, and numbers. ALWAYS use $ for inline math (e.g., $x^2$, $5$) and $$ for block math equations. Do NOT use \\( or \\[.
STRICTLY FORBIDDEN: Do NOT use code blocks (\`\`\`latex). NEVER output raw LaTeX without $ or $$ wrappers.
Act like a caring and experienced teacher. If you don't know, admit it.`;

  const parts: any[] = [];
  if (imageData) {
    // Extract base64 data and mime type
    const match = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }
  if (audioData) {
    const match = audioData.match(/^data:(audio\/[a-zA-Z0-9+-]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }
  if (query) parts.push({ text: query });

  const result = await genAI.models.generateContentStream({ 
    model,
    contents: [{ role: "user", parts }],
    config: { systemInstruction }
  });

  for await (const chunk of result) {
    yield chunk.text;
  }
}

export const SYSTEM_PROMPT = 'You are an expert academic assistant. Help students learn effectively. Always respond with valid JSON as requested. Do not include markdown code fences or extra text.';

import { z } from 'zod';

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

// Zod schemas for validating AI outputs
export const SummarySchema = z.object({
  summary: z.string().min(1),
  keywords: z.string().optional(),
  concepts: z.string().optional(),
  learningObjectives: z.string().optional(),
  importantQuestions: z.string().optional(),
});

export const FlashcardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});
export const FlashcardsSchema = z.array(FlashcardSchema).min(1).max(20);

export const McqSchema = z.object({
  question: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().optional(),
});
export const McqsSchema = z.array(McqSchema).min(1).max(20);

export async function createZaiClient() {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const apiKey = process.env.ZAI_API_KEY;
  const model = process.env.ZAI_DEFAULT_MODEL || undefined;
  if (!apiKey) {
    throw new Error('ZAI_API_KEY is not configured');
  }
  return ZAI.create({ apiKey, model });
}

export function cleanJSON(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export async function callAI(messages: ChatMessage[], timeoutMs = 30_000): Promise<string> {
  const zai = await createZaiClient();

  const callPromise = (async () => {
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });
    return completion.choices?.[0]?.message?.content || '';
  })();

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
  );

  return Promise.race([callPromise, timeoutPromise]) as Promise<string>;
}

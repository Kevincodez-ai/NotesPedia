import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth';
import { rateLimiter, RateLimits, getClientIdentifier } from '@/lib/rate-limiter';
import { z } from 'zod';

const SYSTEM_PROMPT = 'You are an expert academic assistant. Help students learn effectively. Always respond with valid JSON as requested. Do not include markdown code fences or extra text.';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

// Zod schemas for validating AI outputs
const SummarySchema = z.object({
  summary: z.string().min(1),
  keywords: z.string().optional(),
  concepts: z.string().optional(),
  learningObjectives: z.string().optional(),
  importantQuestions: z.string().optional(),
});

const FlashcardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});
const FlashcardsSchema = z.array(FlashcardSchema).min(1).max(20);

const McqSchema = z.object({
  question: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().optional(),
});
const McqsSchema = z.array(McqSchema).min(1).max(20);

async function createZaiClient() {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const apiKey = process.env.ZAI_API_KEY;
  const model = process.env.ZAI_DEFAULT_MODEL || undefined;
  if (!apiKey) {
    throw new Error('ZAI_API_KEY is not configured');
  }
  // The SDK's create signature may vary; pass apiKey and model when available
  return ZAI.create({ apiKey, model });
}

async function callAI(messages: ChatMessage[], timeoutMs = 30_000): Promise<string> {
  const zai = await createZaiClient();

  const callPromise = (async () => {
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
      // model may also be accepted here via options; the client init above passes it
    });
    return completion.choices?.[0]?.message?.content || '';
  })();

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
  );

  return Promise.race([callPromise, timeoutPromise]) as Promise<string>;
}

function cleanJSON(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown code fences
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit AI processing (expensive operation)
    const clientId = getClientIdentifier(request, user.id);
    const { allowed } = rateLimiter.check(`ai:${clientId}`, RateLimits.ai.limit, RateLimits.ai.windowMs);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'AI processing limit reached. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json({ success: false, error: 'noteId is required' }, { status: 400 });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
      include: { aiSummary: true, flashcards: true, mcqs: true },
    });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // IDOR check: only the owner or admin/moderator can process a note
    if (note.uploaderId !== user.id && !hasRole(user.role, ['admin', 'moderator'])) {
      return NextResponse.json({ success: false, error: 'Forbidden. You can only process your own notes.' }, { status: 403 });
    }

    if (!note.extractedText && !note.description) {
      return NextResponse.json({ success: false, error: 'No text content available for AI processing' }, { status: 400 });
    }

    const contentText = note.extractedText || note.description || '';

    // Truncate very long text to avoid token limits
    const truncatedText = contentText.length > 8000 ? contentText.slice(0, 8000) + '...' : contentText;

    // Check if note is already being processed (prevent duplicate processing)
    if (note.status === 'processing') {
      return NextResponse.json(
        { success: false, error: 'Note is already being processed. Please wait.' },
        { status: 409 }
      );
    }

    // Update note status to processing
    await db.note.update({ where: { id: noteId }, data: { status: 'processing' } });

    // Track results
    let summaryData: z.infer<typeof SummarySchema> | null = null;
    let flashcards: Array<{ question: string; answer: string }> = [];
    let mcqs: Array<any> = [];

    try {
      // 1. Generate Summary
      const summaryResponse = await callAI([
        { role: 'assistant', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze the following academic text and generate:\n1. A concise summary (2-3 paragraphs)\n2. 5-8 keywords (comma-separated)\n3. 3-5 key concepts (comma-separated)\n4. 3-5 learning objectives (comma-separated)\n5. 5 important questions (comma-separated)\n\nText: "${truncatedText}"\n\nRespond ONLY with valid JSON in this exact format:\n{"summary": "...", "keywords": "...", "concepts": "...", "learningObjectives": "...", "importantQuestions": "..."}`,
        },
      ]);

      try {
        const parsed = JSON.parse(cleanJSON(summaryResponse));
        const validated = SummarySchema.safeParse(parsed);
        if (validated.success) {
          summaryData = validated.data;
        } else {
          console.error('Summary validation failed', validated.error.issues);
        }
      } catch (e) {
        console.error('Failed to parse summary response as JSON', e);
      }
    } catch (err) {
      console.error('AI summary generation failed:', err);
    }

    try {
      // 2. Generate Flashcards
      const flashcardResponse = await callAI([
        { role: 'assistant', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Based on the following academic text, generate exactly 5 flashcards with question-answer pairs.\n\nText: "${truncatedText}"\n\nRespond ONLY with valid JSON array in this exact format:\n[{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}, ...]`,
        },
      ]);

      try {
        const parsed = JSON.parse(cleanJSON(flashcardResponse));
        const validated = FlashcardsSchema.safeParse(parsed);
        if (validated.success) {
          flashcards = validated.data;
        } else {
          console.error('Flashcards validation failed', validated.error.issues);
        }
      } catch (e) {
        console.error('Failed to parse flashcards response as JSON', e);
      }
    } catch (err) {
      console.error('AI flashcard generation failed:', err);
    }

    try {
      // 3. Generate MCQs
      const mcqResponse = await callAI([
        { role: 'assistant', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Based on the following academic text, generate exactly 5 multiple choice questions.\n\nText: "${truncatedText}"\n\nRespond ONLY with valid JSON array in this exact format:\n[{"question": "...", "optionA": "...", "optionB": "...", "optionC": "...", "optionD": "...", "correctAnswer": "A", "explanation": "..."}, ...]\n\ncorrectAnswer must be one of: A, B, C, D`,
        },
      ]);

      try {
        const parsed = JSON.parse(cleanJSON(mcqResponse));
        const validated = McqsSchema.safeParse(parsed);
        if (validated.success) {
          mcqs = validated.data;
        } else {
          console.error('MCQs validation failed', validated.error.issues);
        }
      } catch (e) {
        console.error('Failed to parse MCQ response as JSON', e);
      }
    } catch (err) {
      console.error('AI MCQ generation failed:', err);
    }

    // Save validated results only
    try {
      await db.$transaction(async (tx) => {
        // Delete existing AI content if reprocessing
        if (note.aiSummary) {
          await tx.aISummary.delete({ where: { noteId } });
        }
        await tx.flashcard.deleteMany({ where: { noteId } });
        await tx.mCQ.deleteMany({ where: { noteId } });

        // Store AI Summary (if we got one and validated)
        if (summaryData) {
          await tx.aISummary.create({
            data: {
              noteId,
              summary: summaryData.summary || null,
              keywords: summaryData.keywords || null,
              concepts: summaryData.concepts || null,
              learningObjectives: summaryData.learningObjectives || null,
              importantQuestions: summaryData.importantQuestions || null,
            },
          });
        }

        // Store Flashcards
        if (flashcards.length > 0) {
          await tx.flashcard.createMany({
            data: flashcards.map((fc, index) => ({
              noteId,
              question: fc.question,
              answer: fc.answer,
              order: index,
            })),
          });
        }

        // Store MCQs
        if (mcqs.length > 0) {
          await tx.mCQ.createMany({
            data: mcqs.map((mcq: any, index: number) => ({
              noteId,
              question: mcq.question,
              optionA: mcq.optionA,
              optionB: mcq.optionB,
              optionC: mcq.optionC,
              optionD: mcq.optionD,
              correctAnswer: mcq.correctAnswer,
              explanation: mcq.explanation || null,
              order: index,
            })),
          });
        }

        // Always set status back to active (even for partial results)
        await tx.note.update({ where: { id: noteId }, data: { status: 'active' } });
      });
    } catch (dbError) {
      console.error('AI results DB save failed:', dbError);
      try {
        await db.note.update({ where: { id: noteId }, data: { status: 'active' } });
      } catch {
        // ignore
      }
      return NextResponse.json({ success: false, error: 'Failed to save AI processing results' }, { status: 500 });
    }

    // Check if we got any results at all
    const hasAnyResults = !!summaryData || flashcards.length > 0 || mcqs.length > 0;
    if (!hasAnyResults) {
      // Nothing validated — return helpful error to caller (and note status already reset)
      return NextResponse.json({ success: false, error: 'AI processing did not produce valid results. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'AI processing completed',
      aiSummary: summaryData ? {
        summary: summaryData.summary,
        keywords: summaryData.keywords?.split(',').map(s => s.trim()).filter(Boolean) || [],
        concepts: summaryData.concepts?.split(',').map(s => s.trim()).filter(Boolean) || [],
        learningObjectives: summaryData.learningObjectives?.split(',').map(s => s.trim()).filter(Boolean) || [],
        importantQuestions: summaryData.importantQuestions?.split(',').map(s => s.trim()).filter(Boolean) || [],
      } : null,
      flashcardsCount: flashcards.length,
      mcqsCount: mcqs.length,
    });
  } catch (error) {
    console.error('AI processing error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process note with AI' }, { status: 500 });
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ success: false, error: 'noteId is required' }, { status: 400 });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
      include: {
        aiSummary: true,
        _count: { select: { flashcards: true, mcqs: true } },
      },
    });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Only owner or admin/moderator can check processing status
    if (note.uploaderId !== user.id && !hasRole(user.role, ['admin', 'moderator'])) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      status: note.status,
      hasAISummary: !!note.aiSummary,
      flashcardsCount: note._count.flashcards,
      mcqsCount: note._count.mcqs,
    });
  } catch (error) {
    console.error('AI status check error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check AI processing status' }, { status: 500 });
  }
}

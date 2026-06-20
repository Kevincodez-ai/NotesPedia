import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const SYSTEM_PROMPT = 'You are an expert academic assistant. Help students learn effectively. Always respond with valid JSON as requested. Do not include markdown code fences or extra text.';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

async function callAI(messages: ChatMessage[]): Promise<string> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  });
  return completion.choices?.[0]?.message?.content || '';
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

    if (!note.extractedText && !note.description) {
      return NextResponse.json({ success: false, error: 'No text content available for AI processing' }, { status: 400 });
    }

    const contentText = note.extractedText || note.description || '';

    // Truncate very long text to avoid token limits
    const truncatedText = contentText.length > 8000 ? contentText.slice(0, 8000) + '...' : contentText;

    // Update note status to processing
    await db.note.update({
      where: { id: noteId },
      data: { status: 'processing' },
    });

    try {
      // 1. Generate Summary
      const summaryResponse = await callAI([
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze the following academic text and generate:
1. A concise summary (2-3 paragraphs)
2. 5-8 keywords (comma-separated)
3. 3-5 key concepts (comma-separated)
4. 3-5 learning objectives (comma-separated)
5. 5 important questions (comma-separated)

Text: "${truncatedText}"

Respond ONLY with valid JSON in this exact format:
{"summary": "...", "keywords": "...", "concepts": "...", "learningObjectives": "...", "importantQuestions": "..."}` },
      ]);

      let summaryData: Record<string, string>;
      try {
        summaryData = JSON.parse(cleanJSON(summaryResponse));
      } catch {
        summaryData = {
          summary: summaryResponse.slice(0, 500),
          keywords: '',
          concepts: '',
          learningObjectives: '',
          importantQuestions: '',
        };
      }

      // 2. Generate Flashcards
      const flashcardResponse = await callAI([
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: `Based on the following academic text, generate exactly 5 flashcards with question-answer pairs.

Text: "${truncatedText}"

Respond ONLY with valid JSON array in this exact format:
[{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}, ...]` },
      ]);

      let flashcards: Array<{ question: string; answer: string }>;
      try {
        flashcards = JSON.parse(cleanJSON(flashcardResponse));
        if (!Array.isArray(flashcards)) flashcards = [];
      } catch {
        flashcards = [];
      }

      // 3. Generate MCQs
      const mcqResponse = await callAI([
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: `Based on the following academic text, generate exactly 5 multiple choice questions.

Text: "${truncatedText}"

Respond ONLY with valid JSON array in this exact format:
[{"question": "...", "optionA": "...", "optionB": "...", "optionC": "...", "optionD": "...", "correctAnswer": "A", "explanation": "..."}, ...]

correctAnswer must be one of: A, B, C, D` },
      ]);

      let mcqs: Array<{ question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; explanation: string }>;
      try {
        mcqs = JSON.parse(cleanJSON(mcqResponse));
        if (!Array.isArray(mcqs)) mcqs = [];
      } catch {
        mcqs = [];
      }

      // Delete existing AI content if reprocessing
      if (note.aiSummary) {
        await db.aISummary.delete({ where: { noteId } });
      }
      await db.flashcard.deleteMany({ where: { noteId } });
      await db.mCQ.deleteMany({ where: { noteId } });

      // Store AI Summary
      await db.aISummary.create({
        data: {
          noteId,
          summary: summaryData.summary || null,
          keywords: summaryData.keywords || null,
          concepts: summaryData.concepts || null,
          learningObjectives: summaryData.learningObjectives || null,
          importantQuestions: summaryData.importantQuestions || null,
        },
      });

      // Store Flashcards
      if (flashcards.length > 0) {
        await db.flashcard.createMany({
          data: flashcards.map((fc, index) => ({
            noteId,
            question: fc.question || '',
            answer: fc.answer || '',
            order: index,
          })),
        });
      }

      // Store MCQs
      if (mcqs.length > 0) {
        await db.mCQ.createMany({
          data: mcqs.map((mcq, index) => ({
            noteId,
            question: mcq.question || '',
            optionA: mcq.optionA || '',
            optionB: mcq.optionB || '',
            optionC: mcq.optionC || '',
            optionD: mcq.optionD || '',
            correctAnswer: mcq.correctAnswer || 'A',
            explanation: mcq.explanation || null,
            order: index,
          })),
        });
      }

      // Update note status to active
      await db.note.update({
        where: { id: noteId },
        data: { status: 'active' },
      });

      return NextResponse.json({
        success: true,
        message: 'AI processing completed',
        aiSummary: {
          summary: summaryData.summary,
          keywords: summaryData.keywords?.split(',').filter(Boolean) || [],
          concepts: summaryData.concepts?.split(',').filter(Boolean) || [],
          learningObjectives: summaryData.learningObjectives?.split(',').filter(Boolean) || [],
          importantQuestions: summaryData.importantQuestions?.split(',').filter(Boolean) || [],
        },
        flashcardsCount: flashcards.length,
        mcqsCount: mcqs.length,
      });
    } catch (aiError) {
      // Revert note status on AI failure
      await db.note.update({
        where: { id: noteId },
        data: { status: 'active' },
      });
      throw aiError;
    }
  } catch (error) {
    console.error('AI processing error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process note with AI' }, { status: 500 });
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
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

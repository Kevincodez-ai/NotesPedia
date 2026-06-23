#!/usr/bin/env node

/**
 * Simple AI background worker that polls the DB for notes with status='queued'
 * and runs the AI processing. Run this as a separate long-lived process.
 *
 * Usage: NODE_ENV=production ZAI_API_KEY=... node ./dist/worker/ai-processor.js
 * (or run with ts-node during development)
 */

import { db } from '@/lib/db';
import { createZaiClient, callAI, cleanJSON, SummarySchema, FlashcardsSchema, McqsSchema, SYSTEM_PROMPT } from '@/lib/ai';

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function processNote(noteId: string) {
  const note = await db.note.findUnique({ where: { id: noteId }, include: { aiSummary: true, flashcards: true, mcqs: true } });
  if (!note) return;

  const contentText = note.extractedText || note.description || '';
  if (!contentText) {
    // mark failed
    await db.note.update({ where: { id: noteId }, data: { status: 'failed' } });
    return;
  }

  const truncatedText = contentText.length > 8000 ? contentText.slice(0, 8000) + '...' : contentText;

  let summaryData: any = null;
  let flashcards: any[] = [];
  let mcqs: any[] = [];

  try {
    // Summary
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
      if (validated.success) summaryData = validated.data;
      else console.error('Worker: summary validation failed', validated.error.issues);
    } catch (e) {
      console.error('Worker: parse summary failed', e);
    }
  } catch (e) {
    console.error('Worker: AI summary error', e);
  }

  try {
    const flashcardResponse = await callAI([
      { role: 'assistant', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Based on the following academic text, generate exactly 5 flashcards with question-answer pairs.\n\nText: "${truncatedText}"\n\nRespond ONLY with valid JSON array in this exact format:\n[{"question": "...", "answer": "..."}, ...]`,
      },
    ]);

    try {
      const parsed = JSON.parse(cleanJSON(flashcardResponse));
      const validated = FlashcardsSchema.safeParse(parsed);
      if (validated.success) flashcards = validated.data;
      else console.error('Worker: flashcards validation failed', validated.error.issues);
    } catch (e) {
      console.error('Worker: parse flashcards failed', e);
    }
  } catch (e) {
    console.error('Worker: AI flashcards error', e);
  }

  try {
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
      if (validated.success) mcqs = validated.data;
      else console.error('Worker: mcqs validation failed', validated.error.issues);
    } catch (e) {
      console.error('Worker: parse mcq failed', e);
    }
  } catch (e) {
    console.error('Worker: AI mcq error', e);
  }

  try {
    await db.$transaction(async (tx) => {
      if (note.aiSummary) await tx.aISummary.delete({ where: { noteId } });
      await tx.flashcard.deleteMany({ where: { noteId } });
      await tx.mCQ.deleteMany({ where: { noteId } });

      if (summaryData) {
        await tx.aISummary.create({ data: { noteId, summary: summaryData.summary || null, keywords: summaryData.keywords || null, concepts: summaryData.concepts || null, learningObjectives: summaryData.learningObjectives || null, importantQuestions: summaryData.importantQuestions || null } });
      }

      if (flashcards.length > 0) {
        await tx.flashcard.createMany({ data: flashcards.map((fc, index) => ({ noteId, question: fc.question, answer: fc.answer, order: index })) });
      }

      if (mcqs.length > 0) {
        await tx.mCQ.createMany({ data: mcqs.map((mcq: any, index: number) => ({ noteId, question: mcq.question, optionA: mcq.optionA, optionB: mcq.optionB, optionC: mcq.optionC, optionD: mcq.optionD, correctAnswer: mcq.correctAnswer, explanation: mcq.explanation || null, order: index })) });
      }

      await tx.note.update({ where: { id: noteId }, data: { status: 'active' } });
    });
  } catch (dbErr) {
    console.error('Worker: DB save failed', dbErr);
    try { await db.note.update({ where: { id: noteId }, data: { status: 'failed' } }); } catch {};
  }
}

async function pollLoop() {
  console.log('AI worker started, polling for queued notes...');
  while (true) {
    try {
      const queued = await db.note.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } });
      if (!queued) {
        await sleep(5000);
        continue;
      }

      // Attempt to claim the job
      const updated = await db.note.updateMany({ where: { id: queued.id, status: 'queued' }, data: { status: 'processing' } });
      if (updated.count === 0) {
        // someone else claimed it
        continue;
      }

      console.log('Processing note', queued.id);
      await processNote(queued.id);
    } catch (e) {
      console.error('Worker: polling error', e);
      await sleep(5000);
    }
  }
}

// Start
pollLoop();

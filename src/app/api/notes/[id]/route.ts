import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    const note = await db.note.findUnique({
      where: { id },
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } },
        subject: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        tags: { select: { tag: true } },
        aiSummary: true,
        flashcards: { orderBy: { order: 'asc' } },
        mcqs: { orderBy: { order: 'asc' } },
        comments: {
          where: { isDeleted: false, parentId: null },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            replies: {
              where: { isDeleted: false },
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        bookmarks: user ? { where: { userId: user.id }, select: { id: true } } : false,
        ratings: user ? { where: { userId: user.id }, select: { value: true } } : false,
        versions: { orderBy: { version: 'desc' }, take: 5 },
      },
    });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    await db.note.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    const formattedNote = {
      id: note.id,
      title: note.title,
      description: note.description,
      filePath: note.filePath,
      fileType: note.fileType,
      fileSize: note.fileSize,
      thumbnailUrl: note.thumbnailUrl,
      previewText: note.previewText,
      extractedText: note.extractedText,
      subject: note.subject,
      college: note.college,
      department: note.department,
      semester: note.semester,
      uploader: note.uploader,
      version: note.version,
      isPublic: note.isPublic,
      status: note.status,
      downloadCount: note.downloadCount,
      viewCount: note.viewCount + 1,
      bookmarkCount: note.bookmarkCount,
      commentCount: note.commentCount,
      avgRating: note.avgRating,
      ratingCount: note.ratingCount,
      qualityScore: note.qualityScore,
      tags: note.tags.map((t) => t.tag),
      createdAt: note.createdAt.toISOString(),
      isBookmarked: user ? (note.bookmarks as unknown as unknown[])?.length > 0 : false,
      userRating: user ? (note.ratings as { value: number }[])?.[0]?.value ?? null : null,
      aiSummary: note.aiSummary ? {
        summary: note.aiSummary.summary,
        keywords: note.aiSummary.keywords?.split(',').filter(Boolean) || [],
        concepts: note.aiSummary.concepts?.split(',').filter(Boolean) || [],
        learningObjectives: note.aiSummary.learningObjectives?.split(',').filter(Boolean) || [],
        importantQuestions: note.aiSummary.importantQuestions?.split(',').filter(Boolean) || [],
      } : null,
      flashcards: note.flashcards.map((f) => ({
        id: f.id, question: f.question, answer: f.answer, order: f.order,
      })),
      mcqs: note.mcqs.map((m) => ({
        id: m.id, question: m.question, optionA: m.optionA, optionB: m.optionB,
        optionC: m.optionC, optionD: m.optionD, correctAnswer: m.correctAnswer,
        explanation: m.explanation, order: m.order,
      })),
      comments: note.comments.map((c) => ({
        id: c.id, content: c.content, isEdited: c.isEdited,
        createdAt: c.createdAt.toISOString(), user: c.user,
        replies: c.replies.map((r) => ({
          id: r.id, content: r.content, isEdited: r.isEdited,
          createdAt: r.createdAt.toISOString(), user: r.user,
        })),
      })),
    };

    return NextResponse.json({ success: true, note: formattedNote });
  } catch (error) {
    console.error('Note detail error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch note' }, { status: 500 });
  }
}

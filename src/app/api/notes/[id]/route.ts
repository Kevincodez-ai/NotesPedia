import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// PUT - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, subjectId, collegeId, departmentId, semester, tags, isPublic } = body;

    // Fetch existing note
    const existingNote = await db.note.findUnique({ where: { id } });
    if (!existingNote) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Only owner or admin can edit
    if (existingNote.uploaderId !== user.id && !['admin', 'super_admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (subjectId !== undefined) updateData.subjectId = subjectId || null;
    if (collegeId !== undefined) updateData.collegeId = collegeId || null;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (semester !== undefined) updateData.semester = semester || null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Handle tags: delete existing and create new ones
    if (tags !== undefined) {
      await db.noteTag.deleteMany({ where: { noteId: id } });
      if (Array.isArray(tags) && tags.length > 0) {
        updateData.tags = {
          create: tags.map((tag: string) => ({ tag: tag.trim() })),
        };
      }
    }

    // Increment version
    updateData.version = existingNote.version + 1;

    // Create a version record
    await db.noteVersion.create({
      data: {
        noteId: id,
        version: existingNote.version + 1,
        filePath: existingNote.filePath,
        changeLog: `Updated note`,
      },
    });

    const updatedNote = await db.note.update({
      where: { id },
      data: updateData,
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } },
        subject: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        tags: { select: { tag: true } },
      },
    });

    return NextResponse.json({
      success: true,
      note: {
        id: updatedNote.id,
        title: updatedNote.title,
        description: updatedNote.description,
        subject: updatedNote.subject,
        college: updatedNote.college,
        department: updatedNote.department,
        semester: updatedNote.semester,
        version: updatedNote.version,
        isPublic: updatedNote.isPublic,
        tags: updatedNote.tags.map((t) => t.tag),
        updatedAt: updatedNote.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Note update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE - Soft delete a note
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const note = await db.note.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Only owner or admin can delete
    if (note.uploaderId !== user.id && !['admin', 'super_admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Soft delete: set status to 'removed'
    await db.note.update({
      where: { id },
      data: { status: 'removed' },
    });

    // Decrement uploader's uploadCount and contributionScore
    await db.profile.update({
      where: { userId: note.uploaderId },
      data: {
        uploadCount: { decrement: 1 },
        contributionScore: { decrement: 10 },
      },
    });

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Note delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete note' }, { status: 500 });
  }
}

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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET - Comments for a note
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!noteId) {
      return NextResponse.json({ success: false, error: 'noteId is required' }, { status: 400 });
    }

    const note = await db.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Get top-level comments with replies
    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: { noteId, isDeleted: false, parentId: null },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          replies: {
            where: { isDeleted: false },
            include: {
              user: { select: { id: true, name: true, avatarUrl: true, role: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.comment.count({
        where: { noteId, isDeleted: false, parentId: null },
      }),
    ]);

    const formattedComments = comments.map((c) => ({
      id: c.id,
      content: c.content,
      isEdited: c.isEdited,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      user: c.user,
      replies: c.replies.map((r) => ({
        id: r.id,
        content: r.content,
        isEdited: r.isEdited,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        user: r.user,
        parentId: r.parentId,
      })),
    }));

    return NextResponse.json({
      success: true,
      comments: formattedComments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST - Add comment
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { noteId, content, parentId } = body;

    if (!noteId || !content?.trim()) {
      return NextResponse.json({ success: false, error: 'noteId and content are required' }, { status: 400 });
    }

    // Check if note exists
    const note = await db.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // If parentId, verify parent comment exists and belongs to same note
    if (parentId) {
      const parentComment = await db.comment.findFirst({
        where: { id: parentId, noteId, isDeleted: false },
      });
      if (!parentComment) {
        return NextResponse.json({ success: false, error: 'Parent comment not found' }, { status: 404 });
      }
    }

    const comment = await db.comment.create({
      data: {
        noteId,
        userId: user.id,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    // Increment comment count on note
    await db.note.update({
      where: { id: noteId },
      data: { commentCount: { increment: 1 } },
    });

    // Award reputation for commenting
    await db.profile.update({
      where: { userId: user.id },
      data: { contributionScore: { increment: 2 } },
    });

    await db.reputationLog.create({
      data: {
        userId: user.id,
        action: 'comment',
        points: 2,
        noteId,
      },
    });

    // Notify note uploader
    if (note.uploaderId !== user.id) {
      await db.notification.create({
        data: {
          userId: note.uploaderId,
          type: 'comment',
          title: 'New Comment',
          message: `${user.name} commented on your note "${note.title}"`,
          link: `/notes/${noteId}`,
        },
      });
    }

    // If reply, notify parent comment author
    if (parentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (parentComment && parentComment.userId !== user.id) {
        await db.notification.create({
          data: {
            userId: parentComment.userId,
            type: 'mention',
            title: 'Reply to Comment',
            message: `${user.name} replied to your comment on "${note.title}"`,
            link: `/notes/${noteId}`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        parentId: comment.parentId,
        isEdited: comment.isEdited,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Comment creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add comment' }, { status: 500 });
  }
}

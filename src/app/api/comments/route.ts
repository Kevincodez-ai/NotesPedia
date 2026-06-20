import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const editCommentSchema = z.object({
  commentId: z.string().min(1),
  content: z.string().min(1, 'Content is required').max(2000, 'Comment must be at most 2000 characters'),
});

const createCommentSchema = z.object({
  noteId: z.string().min(1),
  content: z.string().min(1, 'Content is required').max(2000, 'Comment must be at most 2000 characters'),
  parentId: z.string().optional(),
});

// PUT - Edit a comment
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = editCommentSchema.parse(body);
    const { commentId, content } = data;

    const comment = await db.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    if (comment.isDeleted) {
      return NextResponse.json({ success: false, error: 'Cannot edit a deleted comment' }, { status: 400 });
    }

    // Only the comment author can edit
    if (comment.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Only the comment author can edit' }, { status: 403 });
    }

    const updatedComment = await db.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        isEdited: true,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: updatedComment.id,
        content: updatedComment.content,
        isEdited: updatedComment.isEdited,
        parentId: updatedComment.parentId,
        createdAt: updatedComment.createdAt.toISOString(),
        updatedAt: updatedComment.updatedAt.toISOString(),
        user: updatedComment.user,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      const message = firstIssue?.message || 'Validation error';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('Comment update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update comment' }, { status: 500 });
  }
}

// DELETE - Soft delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'commentId is required' }, { status: 400 });
    }

    const comment = await db.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    if (comment.isDeleted) {
      return NextResponse.json({ success: false, error: 'Comment already deleted' }, { status: 400 });
    }

    // Only comment author or admin/moderator can delete
    if (comment.userId !== user.id && !['admin', 'super_admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Soft delete: set isDeleted to true
    await db.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    // Decrement note's commentCount
    await db.note.update({
      where: { id: comment.noteId },
      data: { commentCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Comment delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete comment' }, { status: 500 });
  }
}

// GET - Comments for a note
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20') || 20));

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
    const data = createCommentSchema.parse(body);
    const { noteId, content, parentId } = data;

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
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      const message = firstIssue?.message || 'Validation error';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('Comment creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add comment' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET - List user's bookmarks with folders
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '12') || 12));

    const where: Record<string, unknown> = { userId: user.id };
    if (folderId) where.folderId = folderId;

    const [bookmarks, folders, total] = await Promise.all([
      db.bookmark.findMany({
        where,
        include: {
          note: {
            include: {
              uploader: { select: { id: true, name: true, avatarUrl: true } },
              subject: { select: { id: true, name: true } },
              college: { select: { id: true, name: true } },
              tags: { select: { tag: true } },
            },
          },
          folder: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.bookmarkFolder.findMany({
        where: { userId: user.id },
        include: { _count: { select: { bookmarks: true } } },
        orderBy: { name: 'asc' },
      }),
      db.bookmark.count({ where }),
    ]);

    const formattedBookmarks = bookmarks.map((b) => ({
      id: b.id,
      noteId: b.noteId,
      folderId: b.folderId,
      createdAt: b.createdAt.toISOString(),
      folder: b.folder,
      note: {
        id: b.note.id,
        title: b.note.title,
        description: b.note.description,
        fileType: b.note.fileType,
        thumbnailUrl: b.note.thumbnailUrl,
        subject: b.note.subject,
        college: b.note.college,
        downloadCount: b.note.downloadCount,
        avgRating: b.note.avgRating,
        ratingCount: b.note.ratingCount,
        uploader: b.note.uploader,
        tags: b.note.tags.map((t) => t.tag),
      },
    }));

    return NextResponse.json({
      success: true,
      bookmarks: formattedBookmarks,
      folders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Bookmarks fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bookmarks' }, { status: 500 });
  }
}

// POST - Add bookmark or manage folders
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Handle folder creation
    if (action === 'createFolder') {
      const { name, color, icon } = body;
      if (!name?.trim()) {
        return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
      }

      const folder = await db.bookmarkFolder.create({
        data: {
          name: name.trim(),
          color: color || null,
          icon: icon || null,
          userId: user.id,
        },
      });

      return NextResponse.json({ success: true, folder }, { status: 201 });
    }

    // Handle folder deletion
    if (action === 'deleteFolder') {
      const { folderId } = body;
      if (!folderId) {
        return NextResponse.json({ success: false, error: 'folderId is required' }, { status: 400 });
      }

      const folder = await db.bookmarkFolder.findFirst({
        where: { id: folderId, userId: user.id },
      });
      if (!folder) {
        return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
      }

      await db.bookmarkFolder.delete({ where: { id: folderId } });

      return NextResponse.json({ success: true, message: 'Folder deleted' });
    }

    // Default: bookmark toggle behavior
    const { noteId, folderId } = body;

    if (!noteId) {
      return NextResponse.json({ success: false, error: 'noteId is required' }, { status: 400 });
    }

    // Check if note exists
    const note = await db.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Check if already bookmarked
    const existing = await db.bookmark.findUnique({
      where: { noteId_userId: { noteId, userId: user.id } },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'Already bookmarked' }, { status: 409 });
    }

    // If folderId provided, verify it belongs to user
    if (folderId) {
      const folder = await db.bookmarkFolder.findFirst({
        where: { id: folderId, userId: user.id },
      });
      if (!folder) {
        return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
      }
    }

    const bookmark = await db.bookmark.create({
      data: {
        noteId,
        userId: user.id,
        folderId: folderId || null,
      },
      include: {
        folder: { select: { id: true, name: true, color: true, icon: true } },
      },
    });

    // Increment bookmark count on note
    await db.note.update({
      where: { id: noteId },
      data: { bookmarkCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, bookmark }, { status: 201 });
  } catch (error) {
    console.error('Bookmark add error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add bookmark' }, { status: 500 });
  }
}

// DELETE - Remove bookmark
export async function DELETE(request: NextRequest) {
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

    const bookmark = await db.bookmark.findUnique({
      where: { noteId_userId: { noteId, userId: user.id } },
    });

    if (!bookmark) {
      return NextResponse.json({ success: false, error: 'Bookmark not found' }, { status: 404 });
    }

    await db.bookmark.delete({
      where: { id: bookmark.id },
    });

    // Decrement bookmark count on note
    await db.note.update({
      where: { id: noteId },
      data: { bookmarkCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    console.error('Bookmark delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove bookmark' }, { status: 500 });
  }
}

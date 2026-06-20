import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const subjectId = searchParams.get('subjectId');
    const collegeId = searchParams.get('collegeId');
    const departmentId = searchParams.get('departmentId');
    const semester = searchParams.get('semester');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const uploaderId = searchParams.get('uploaderId');
    const status = searchParams.get('status') || 'active';

    const where: Record<string, unknown> = { status };
    if (subjectId) where.subjectId = subjectId;
    if (collegeId) where.collegeId = collegeId;
    if (departmentId) where.departmentId = departmentId;
    if (semester) where.semester = parseInt(semester);
    if (uploaderId) where.uploaderId = uploaderId;

    const orderBy: Record<string, string> = {};
    if (sortBy === 'downloads') orderBy.downloadCount = 'desc';
    else if (sortBy === 'rating') orderBy.avgRating = 'desc';
    else if (sortBy === 'views') orderBy.viewCount = 'desc';
    else orderBy.createdAt = 'desc';

    const [notes, total] = await Promise.all([
      db.note.findMany({
        where,
        include: {
          uploader: { select: { id: true, name: true, avatarUrl: true } },
          subject: { select: { id: true, name: true } },
          college: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          tags: { select: { tag: true } },
          bookmarks: { where: { userId: user.id }, select: { id: true } },
          ratings: { where: { userId: user.id }, select: { value: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.note.count({ where }),
    ]);

    const formattedNotes = notes.map((note) => ({
      id: note.id,
      title: note.title,
      description: note.description,
      fileType: note.fileType,
      thumbnailUrl: note.thumbnailUrl,
      subject: note.subject,
      college: note.college,
      department: note.department,
      semester: note.semester,
      uploader: note.uploader,
      downloadCount: note.downloadCount,
      viewCount: note.viewCount,
      bookmarkCount: note.bookmarkCount,
      avgRating: note.avgRating,
      ratingCount: note.ratingCount,
      tags: note.tags.map((t) => t.tag),
      createdAt: note.createdAt.toISOString(),
      status: note.status,
      isBookmarked: note.bookmarks.length > 0,
      userRating: note.ratings[0]?.value ?? null,
    }));

    return NextResponse.json({
      success: true,
      notes: formattedNotes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Notes fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, subjectId, collegeId, departmentId, semester, tags, filePath, fileType, fileSize, extractedText, previewText } = body;

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const note = await db.note.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        filePath: filePath || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        extractedText: extractedText || null,
        previewText: previewText || null,
        subjectId: subjectId || null,
        collegeId: collegeId || null,
        departmentId: departmentId || null,
        semester: semester || null,
        uploaderId: user.id,
        status: 'processing',
        tags: tags?.length ? {
          create: tags.map((tag: string) => ({ tag: tag.trim() }))
        } : undefined,
      },
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } },
        subject: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        tags: { select: { tag: true } },
      },
    });

    // Update user profile
    await db.profile.update({
      where: { userId: user.id },
      data: {
        uploadCount: { increment: 1 },
        contributionScore: { increment: 10 },
        reputationScore: { increment: 5 },
      },
    });

    // Log reputation
    await db.reputationLog.create({
      data: { userId: user.id, action: 'upload', points: 10, noteId: note.id },
    });

    // Set note status to active; AI processing can be triggered separately
    await db.note.update({
      where: { id: note.id },
      data: { status: 'active' },
    });

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (error) {
    console.error('Note creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500 });
  }
}

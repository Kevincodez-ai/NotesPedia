import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().max(2000, 'Description must be at most 2000 characters').nullable().optional(),
  subjectId: z.string().nullable().optional(),
  collegeId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  semester: z.number().int().min(1).max(12).nullable().optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(10, 'Maximum 10 tags').optional(),
  filePath: z.string().max(500).nullable().optional(),
  storageKey: z.string().max(500).nullable().optional(),
  fileType: z.string().max(20).nullable().optional(),
  fileSize: z.number().int().positive().nullable().optional(),
  extractedText: z.string().max(100000).nullable().optional(),
  previewText: z.string().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '12') || 12));
    const subjectId = searchParams.get('subjectId');
    const collegeId = searchParams.get('collegeId');
    const departmentId = searchParams.get('departmentId');
    const semester = searchParams.get('semester');
    const q = searchParams.get('q');
    const fileType = searchParams.get('fileType');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const uploaderId = searchParams.get('uploaderId');
    const requestedStatus = searchParams.get('status');

    // Only admins can view non-active notes
    const allowedStatuses = ['admin', 'super_admin', 'moderator'].includes(user.role)
      ? ['active', 'processing', 'flagged', 'removed']
      : ['active'];
    const status = (requestedStatus && allowedStatuses.includes(requestedStatus)) ? requestedStatus : 'active';

    const where: Record<string, unknown> = { status };
    if (subjectId) where.subjectId = subjectId;
    if (collegeId) where.collegeId = collegeId;
    if (departmentId) where.departmentId = departmentId;
    if (semester) { const s = parseInt(semester); if (!isNaN(s)) where.semester = s; }
    if (uploaderId) where.uploaderId = uploaderId;
    // Only show public notes, or own notes, or notes visible to admins
    if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
      if (!uploaderId || uploaderId !== user.id) {
        where.isPublic = true;
      }
    }
    if (fileType) where.fileType = fileType;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    }

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
    const data = createNoteSchema.parse(body);

    const { title, description, subjectId, collegeId, departmentId, semester, tags, filePath, storageKey, fileType, fileSize, extractedText, previewText } = data;

    const note = await db.note.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        filePath: filePath || null,
        storageKey: storageKey || null,
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
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      const message = firstIssue?.message || 'Validation error';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('Note creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500 });
  }
}

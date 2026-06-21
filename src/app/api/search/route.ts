import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { rateLimiter, RateLimits, getClientIdentifier } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();

    // Rate limit search queries (expensive DB operation)
    const clientId = getClientIdentifier(request, user?.id);
    const { allowed } = rateLimiter.check(`search:${clientId}`, RateLimits.search.limit, RateLimits.search.windowMs);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Search limit reached. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '12') || 12));
    const collegeId = searchParams.get('collegeId');
    const departmentId = searchParams.get('departmentId');
    const subjectId = searchParams.get('subjectId');
    const semester = searchParams.get('semester');
    const fileType = searchParams.get('fileType');
    const sortBy = searchParams.get('sortBy') || 'relevance';

    const where: Record<string, unknown> = { status: 'active', isPublic: true };

    // Text search on title, description, extractedText
    if (q.trim()) {
      where.OR = [
        { title: { contains: q.trim() } },
        { description: { contains: q.trim() } },
        { extractedText: { contains: q.trim() } },
      ];
    }

    // Apply filters
    if (collegeId) where.collegeId = collegeId;
    if (departmentId) where.departmentId = departmentId;
    if (subjectId) where.subjectId = subjectId;
    if (semester) { const s = parseInt(semester); if (!isNaN(s)) where.semester = s; }
    if (fileType) where.fileType = fileType;

    // Sorting
    const orderBy: Record<string, string> = {};
    if (sortBy === 'downloads') orderBy.downloadCount = 'desc';
    else if (sortBy === 'rating') orderBy.avgRating = 'desc';
    else if (sortBy === 'views') orderBy.viewCount = 'desc';
    else if (sortBy === 'newest') orderBy.createdAt = 'desc';
    else if (sortBy === 'relevance' && q.trim()) orderBy.createdAt = 'desc';
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
          ...(user ? {
            bookmarks: { where: { userId: user.id }, select: { id: true } },
            ratings: { where: { userId: user.id }, select: { value: true } },
          } : {}),
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
      isBookmarked: user ? (note.bookmarks as unknown as unknown[])?.length > 0 : false,
      userRating: user ? (note.ratings as { value: number }[])?.[0]?.value ?? null : null,
    }));

    return NextResponse.json({
      success: true,
      query: q,
      notes: formattedNotes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, error: 'Failed to search notes' }, { status: 500 });
  }
}

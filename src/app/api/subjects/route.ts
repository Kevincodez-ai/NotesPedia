import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET - List subjects with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const departmentId = searchParams.get('departmentId');
    const collegeId = searchParams.get('collegeId');
    const semester = searchParams.get('semester');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20') || 20));

    const where: Record<string, unknown> = {};
    if (q.trim()) where.name = { contains: q.trim() };
    if (departmentId) where.departmentId = departmentId;
    if (collegeId) where.collegeId = collegeId;
    if (semester) { const s = parseInt(semester); if (!isNaN(s)) where.semester = s; }

    const [subjects, total] = await Promise.all([
      db.subject.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, collegeId: true } },
          college: { select: { id: true, name: true } },
          _count: { select: { notes: true, follows: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.subject.count({ where }),
    ]);

    const formattedSubjects = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      semester: s.semester,
      description: s.description,
      iconUrl: s.iconUrl,
      noteCount: s.noteCount,
      followerCount: s.followerCount,
      department: s.department,
      college: s.college,
      actualNoteCount: s._count.notes,
      actualFollowerCount: s._count.follows,
    }));

    return NextResponse.json({
      success: true,
      subjects: formattedSubjects,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Subjects fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

// POST - Create subject (admin/moderator only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions. Only admins can create subjects.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, semester, departmentId, collegeId, description, iconUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Subject name is required' }, { status: 400 });
    }

    // Verify department and college if provided
    if (departmentId) {
      const dept = await db.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
      }
    }

    if (collegeId) {
      const college = await db.college.findUnique({ where: { id: collegeId } });
      if (!college) {
        return NextResponse.json({ success: false, error: 'College not found' }, { status: 404 });
      }
    }

    const subject = await db.subject.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        semester: semester ? (() => { const s = parseInt(semester); return isNaN(s) ? null : s; })() : null,
        departmentId: departmentId || null,
        collegeId: collegeId || null,
        description: description?.trim() || null,
        iconUrl: iconUrl?.trim() || null,
      },
      include: {
        department: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, subject }, { status: 201 });
  } catch (error) {
    console.error('Subject creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create subject' }, { status: 500 });
  }
}

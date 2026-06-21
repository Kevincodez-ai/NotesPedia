import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET - List colleges with search/filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type');
    const state = searchParams.get('state');
    const country = searchParams.get('country');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20') || 20));

    const where: Record<string, unknown> = {};
    if (q.trim()) where.name = { contains: q.trim() };
    if (type) where.type = type;
    if (state) where.state = state;
    if (country) where.country = country;

    const [colleges, total] = await Promise.all([
      db.college.findMany({
        where,
        include: {
          departments: { select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } },
          _count: { select: { departments: true, subjects: true, notes: true, profiles: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.college.count({ where }),
    ]);

    const formattedColleges = colleges.map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      city: c.city,
      state: c.state,
      country: c.country,
      type: c.type,
      website: c.website,
      logoUrl: c.logoUrl,
      isVerified: c.isVerified,
      departments: c.departments,
      departmentCount: c._count.departments,
      subjectCount: c._count.subjects,
      noteCount: c._count.notes,
      memberCount: c._count.profiles,
    }));

    return NextResponse.json({
      success: true,
      colleges: formattedColleges,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Colleges fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch colleges' }, { status: 500 });
  }
}

// POST - Create college (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, shortName, city, state, country, type, website, logoUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'College name is required' }, { status: 400 });
    }

    const college = await db.college.create({
      data: {
        name: name.trim(),
        shortName: shortName?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        type: type || null,
        website: website?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, college }, { status: 201 });
  } catch (error) {
    console.error('College creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create college' }, { status: 500 });
  }
}

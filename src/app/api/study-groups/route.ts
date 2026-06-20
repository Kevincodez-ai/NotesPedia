import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET - List study groups
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const collegeId = searchParams.get('collegeId');
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '12') || 12));

    const where: Record<string, unknown> = { isPublic: true };
    if (subjectId) where.subjectId = subjectId;
    if (collegeId) where.collegeId = collegeId;
    if (q.trim()) where.name = { contains: q.trim() };

    const [groups, total] = await Promise.all([
      db.studyGroup.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, avatarUrl: true } },
          subject: { select: { id: true, name: true } },
          college: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.studyGroup.count({ where }),
    ]);

    // Check if current user is a member
    const user = await getAuthUser();
    let userMemberships: string[] = [];
    if (user) {
      const memberships = await db.studyGroupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      });
      userMemberships = memberships.map((m) => m.groupId);
    }

    const formattedGroups = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      isPublic: g.isPublic,
      memberCount: g.memberCount,
      maxMembers: g.maxMembers,
      actualMemberCount: g._count.members,
      creator: g.creator,
      subject: g.subject,
      college: g.college,
      createdAt: g.createdAt.toISOString(),
      isMember: userMemberships.includes(g.id),
    }));

    return NextResponse.json({
      success: true,
      groups: formattedGroups,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Study groups fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch study groups' }, { status: 500 });
  }
}

// POST - Create study group
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, subjectId, collegeId, isPublic, maxMembers } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Group name is required' }, { status: 400 });
    }

    // Verify subject and college if provided
    if (subjectId) {
      const subject = await db.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
      }
    }

    if (collegeId) {
      const college = await db.college.findUnique({ where: { id: collegeId } });
      if (!college) {
        return NextResponse.json({ success: false, error: 'College not found' }, { status: 404 });
      }
    }

    const group = await db.studyGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        subjectId: subjectId || null,
        collegeId: collegeId || null,
        creatorId: user.id,
        isPublic: isPublic !== false,
        maxMembers: maxMembers || 50,
        memberCount: 1,
      },
    });

    // Add creator as admin member
    await db.studyGroupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
        role: 'admin',
      },
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    console.error('Study group creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create study group' }, { status: 500 });
  }
}

// PUT - Join/leave study group
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, action } = body;

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'groupId is required' }, { status: 400 });
    }

    if (!['join', 'leave'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Action must be join or leave' }, { status: 400 });
    }

    const group = await db.studyGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'Study group not found' }, { status: 404 });
    }

    const existingMember = await db.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });

    if (action === 'join') {
      if (existingMember) {
        return NextResponse.json({ success: false, error: 'Already a member' }, { status: 400 });
      }

      if (group.memberCount >= group.maxMembers) {
        return NextResponse.json({ success: false, error: 'Group is full' }, { status: 400 });
      }

      await db.studyGroupMember.create({
        data: {
          groupId,
          userId: user.id,
          role: 'member',
        },
      });

      await db.studyGroup.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } },
      });

      return NextResponse.json({ success: true, message: 'Joined study group', isMember: true });
    } else {
      // Leave
      if (!existingMember) {
        return NextResponse.json({ success: false, error: 'Not a member' }, { status: 400 });
      }

      // Cannot leave if you're the creator/admin
      if (existingMember.role === 'admin') {
        return NextResponse.json({ success: false, error: 'Group admin cannot leave. Transfer ownership first.' }, { status: 400 });
      }

      await db.studyGroupMember.delete({
        where: { id: existingMember.id },
      });

      await db.studyGroup.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      });

      return NextResponse.json({ success: true, message: 'Left study group', isMember: false });
    }
  } catch (error) {
    console.error('Study group join/leave error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update group membership' }, { status: 500 });
  }
}

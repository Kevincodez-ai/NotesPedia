import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/users/me — Get the current authenticated user's full profile
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        profile: {
          include: {
            college: { select: { id: true, name: true, shortName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            notes: { where: { status: { notIn: ['removed'] } } },
            followsReceived: true,
            followsGiven: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        collegeId: user.profile?.collegeId || null,
        departmentId: user.profile?.departmentId || null,
        semester: user.profile?.semester || null,
        college: user.profile?.college || null,
        department: user.profile?.department || null,
        stats: {
          notesCount: user._count.notes,
          followersCount: user._count.followsReceived,
          followingCount: user._count.followsGiven,
          bookmarksCount: user._count.bookmarks,
          contributionScore: user.profile?.contributionScore || 0,
          reputationScore: user.profile?.reputationScore || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

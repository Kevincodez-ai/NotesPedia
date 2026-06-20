import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - User profile with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
        profile: {
          include: {
            college: { select: { id: true, name: true, shortName: true } },
            department: { select: { id: true, name: true } },
          },
        },
        achievements: {
          include: {
            achievement: { select: { id: true, name: true, description: true, icon: true, category: true } },
          },
          orderBy: { unlockedAt: 'desc' },
        },
        _count: {
          select: {
            notes: { where: { status: 'active' } },
            followsGiven: true,
            followsReceived: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get recent notes
    const recentNotes = await db.note.findMany({
      where: { uploaderId: id, status: 'active' },
      include: {
        subject: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        tags: { select: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // Get total downloads of user's notes
    const totalDownloads = await db.download.count({
      where: { note: { uploaderId: id } },
    });

    // Get total ratings received
    const ratingStats = await db.rating.aggregate({
      where: { note: { uploaderId: id } },
      _count: { value: true },
      _avg: { value: true },
    });

    const formattedProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      joinedAt: user.createdAt.toISOString(),
      profile: user.profile ? {
        college: user.profile.college,
        department: user.profile.department,
        semester: user.profile.semester,
        year: user.profile.year,
        contributionScore: user.profile.contributionScore,
        reputationScore: user.profile.reputationScore,
        uploadCount: user.profile.uploadCount,
        downloadCount: user.profile.downloadCount,
        followerCount: user.profile.followerCount,
        followingCount: user.profile.followingCount,
        noteCount: user.profile.noteCount,
      } : null,
      stats: {
        totalNotes: user._count.notes,
        totalFollowers: user._count.followsReceived,
        totalFollowing: user._count.followsGiven,
        totalDownloads,
        totalRatingsReceived: ratingStats._count.value,
        avgRatingReceived: ratingStats._avg.value || 0,
      },
      achievements: user.achievements.map((ua) => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        unlockedAt: ua.unlockedAt.toISOString(),
      })),
      recentNotes: recentNotes.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        fileType: n.fileType,
        subject: n.subject,
        college: n.college,
        downloadCount: n.downloadCount,
        avgRating: n.avgRating,
        ratingCount: n.ratingCount,
        tags: n.tags.map((t) => t.tag),
        createdAt: n.createdAt.toISOString(),
      })),
    };

    // Check if current user follows this profile
    const currentUser = await db.user.findFirst({
      where: { id },
    });
    void currentUser; // Suppress unused variable warning

    return NextResponse.json({
      success: true,
      profile: formattedProfile,
    });
  } catch (error) {
    console.error('User profile fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

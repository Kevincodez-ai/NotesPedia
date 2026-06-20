import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Top users by reputation/contribution with college filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'reputation'; // reputation, contribution
    const collegeId = searchParams.get('collegeId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    const where: Record<string, unknown> = {};
    if (collegeId) where.collegeId = collegeId;

    const orderBy: Record<string, string> = {};
    if (type === 'contribution') orderBy.contributionScore = 'desc';
    else orderBy.reputationScore = 'desc';

    const [profiles, total] = await Promise.all([
      db.profile.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          college: { select: { id: true, name: true, shortName: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.profile.count({ where }),
    ]);

    const leaderboard = profiles.map((p, index) => ({
      rank: (page - 1) * limit + index + 1,
      user: p.user,
      college: p.college,
      department: p.department,
      reputationScore: p.reputationScore,
      contributionScore: p.contributionScore,
      uploadCount: p.uploadCount,
      downloadCount: p.downloadCount,
      noteCount: p.noteCount,
      followerCount: p.followerCount,
    }));

    return NextResponse.json({
      success: true,
      leaderboard,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET - Admin dashboard stats
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all stats in parallel
    const [
      totalUsers,
      totalNotes,
      totalDownloads,
      totalColleges,
      totalSubjects,
      pendingReports,
      totalComments,
      totalRatings,
      totalBookmarks,
      processingNotes,
      flaggedNotes,
      activeUsers,
      newUsersToday,
      newNotesToday,
      notesByType,
      topColleges,
      recentReports,
    ] = await Promise.all([
      // Total users
      db.user.count(),

      // Total notes
      db.note.count(),

      // Total downloads
      db.download.count(),

      // Total colleges
      db.college.count(),

      // Total subjects
      db.subject.count(),

      // Pending reports
      db.report.count({ where: { status: 'pending' } }),

      // Total comments
      db.comment.count({ where: { isDeleted: false } }),

      // Total ratings
      db.rating.count(),

      // Total bookmarks
      db.bookmark.count(),

      // Processing notes
      db.note.count({ where: { status: 'processing' } }),

      // Flagged notes
      db.note.count({ where: { status: 'flagged' } }),

      // Active users (with profile)
      db.profile.count({ where: { contributionScore: { gt: 0 } } }),

      // New users today
      db.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // New notes today
      db.note.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Notes by file type
      db.note.groupBy({
        by: ['fileType'],
        _count: { fileType: true },
        where: { fileType: { not: null } },
      }),

      // Top colleges by notes
      db.college.findMany({
        include: { _count: { select: { notes: true, profiles: true } } },
        orderBy: { notes: { _count: 'desc' } },
        take: 5,
      }),

      // Recent reports
      db.report.findMany({
        where: { status: 'pending' },
        include: {
          reporter: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // User role distribution
    const userRoleDistribution = await db.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    // Note status distribution
    const noteStatusDistribution = await db.note.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Total downloads via note sum
    const downloadSum = await db.note.aggregate({
      _sum: { downloadCount: true },
    });

    const stats = {
      totalUsers,
      totalNotes,
      totalDownloads: downloadSum._sum.downloadCount || 0,
      totalColleges,
      totalSubjects,
      pendingReports,
      totalComments,
      totalRatings,
      totalBookmarks,
      processingNotes,
      flaggedNotes,
      activeUsers,
      newUsersToday,
      newNotesToday,
      notesByType: notesByType.reduce<Record<string, number>>((acc, item) => {
        if (item.fileType) acc[item.fileType] = item._count.fileType;
        return acc;
      }, {}),
      userRoleDistribution: userRoleDistribution.reduce<Record<string, number>>((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {}),
      noteStatusDistribution: noteStatusDistribution.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      topColleges: topColleges.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        noteCount: c._count.notes,
        memberCount: c._count.profiles,
      })),
      recentReports: recentReports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter,
      })),
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}

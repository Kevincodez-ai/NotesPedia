import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Public stats endpoint - no auth required
export async function GET() {
  try {
    const [totalUsers, totalNotes, totalColleges, totalSubjects] = await Promise.all([
      db.user.count(),
      db.note.count({ where: { status: 'active' } }),
      db.college.count(),
      db.subject.count(),
    ]);

    const res = NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalNotes,
        totalColleges,
        totalSubjects,
      },
    });
    // Public stats are safe to cache for 10 min — numbers change slowly
    res.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
    return res;
  } catch (error) {
    console.error('Public stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

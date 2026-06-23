import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET - Ultra-lightweight endpoint for polling unread notification count
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Execute exactly ONE optimized query using the [userId, isRead] compound index
    const unreadCount = await db.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    const response = NextResponse.json({
      success: true,
      unreadCount,
    });
    
    // Prevent caching so the poll always gets the latest count
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
    return response;
  } catch (error) {
    console.error('Unread count fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch unread count' }, { status: 500 });
  }
}

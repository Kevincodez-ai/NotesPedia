import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET - User's notifications (paginated)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = { userId: user.id };
    if (type) where.type = type;
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    const formattedNotifications = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PUT - Mark as read
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'notificationId is required' }, { status: 400 });
    }

    const notification = await db.notification.findFirst({
      where: { id: notificationId, userId: user.id },
    });

    if (!notification) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE - Clear all notifications
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await db.notification.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Notification clear error:', error);
    return NextResponse.json({ success: false, error: 'Failed to clear notifications' }, { status: 500 });
  }
}

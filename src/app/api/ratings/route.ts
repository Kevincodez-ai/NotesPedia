import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST - Rate a note (1-5), upsert
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { noteId, value } = body;

    if (!noteId || !value) {
      return NextResponse.json({ success: false, error: 'noteId and value are required' }, { status: 400 });
    }

    const ratingValue = parseInt(value);
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return NextResponse.json({ success: false, error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Check if note exists
    const note = await db.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Check if user is rating their own note
    if (note.uploaderId === user.id) {
      return NextResponse.json({ success: false, error: 'Cannot rate your own note' }, { status: 400 });
    }

    // Upsert rating
    const rating = await db.rating.upsert({
      where: { noteId_userId: { noteId, userId: user.id } },
      update: { value: ratingValue },
      create: { noteId, userId: user.id, value: ratingValue },
    });

    // Recalculate average rating and count
    const ratingStats = await db.rating.aggregate({
      where: { noteId },
      _avg: { value: true },
      _count: { value: true },
    });

    await db.note.update({
      where: { id: noteId },
      data: {
        avgRating: ratingStats._avg.value || 0,
        ratingCount: ratingStats._count.value,
      },
    });

    // Award reputation to note uploader if new rating
    if (rating.createdAt === rating.updatedAt) {
      await db.profile.update({
        where: { userId: note.uploaderId },
        data: { reputationScore: { increment: 2 } },
      });

      await db.reputationLog.create({
        data: {
          userId: note.uploaderId,
          action: 'rating_received',
          points: 2,
          noteId,
        },
      });

      // Create notification for uploader
      await db.notification.create({
        data: {
          userId: note.uploaderId,
          type: 'rating',
          title: 'New Rating',
          message: `${user.name} rated your note "${note.title}" ${ratingValue} star${ratingValue > 1 ? 's' : ''}`,
          link: `/notes/${noteId}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      rating: {
        id: rating.id,
        noteId: rating.noteId,
        userId: rating.userId,
        value: rating.value,
      },
      avgRating: ratingStats._avg.value || 0,
      ratingCount: ratingStats._count.value,
    });
  } catch (error) {
    console.error('Rating error:', error);
    return NextResponse.json({ success: false, error: 'Failed to rate note' }, { status: 500 });
  }
}

// GET - Get ratings for a note
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ success: false, error: 'noteId is required' }, { status: 400 });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
      select: { avgRating: true, ratingCount: true },
    });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Get rating distribution
    const ratings = await db.rating.findMany({
      where: { noteId },
      select: { value: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      distribution[r.value] = (distribution[r.value] || 0) + 1;
    });

    // Check if current user has rated
    const user = await getAuthUser();
    let userRating = null;
    if (user) {
      const existingRating = await db.rating.findUnique({
        where: { noteId_userId: { noteId, userId: user.id } },
        select: { value: true },
      });
      userRating = existingRating?.value || null;
    }

    return NextResponse.json({
      success: true,
      avgRating: note.avgRating,
      ratingCount: note.ratingCount,
      distribution,
      userRating,
    });
  } catch (error) {
    console.error('Ratings fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch ratings' }, { status: 500 });
  }
}

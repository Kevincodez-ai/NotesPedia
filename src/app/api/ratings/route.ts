import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const rateNoteSchema = z.object({
  noteId: z.string().min(1),
  value: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
});

// POST - Rate a note (1-5), upsert
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = rateNoteSchema.parse(body);
    const { noteId, value: ratingValue } = data;

    // Check if note exists
    const note = await db.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Check if user is rating their own note
    if (note.uploaderId === user.id) {
      return NextResponse.json({ success: false, error: 'Cannot rate your own note' }, { status: 400 });
    }

    // Check if a rating already exists before upserting
    const existingRating = await db.rating.findUnique({
      where: { noteId_userId: { noteId, userId: user.id } },
    });
    const isNewRating = !existingRating;

    // Use a transaction to prevent race conditions on rating recalculation
    const { rating, avgRating, ratingCount } = await db.$transaction(async (tx) => {
      // Upsert rating
      const r = await tx.rating.upsert({
        where: { noteId_userId: { noteId, userId: user.id } },
        update: { value: ratingValue },
        create: { noteId, userId: user.id, value: ratingValue },
      });

      // Recalculate average rating and count inside transaction
      const stats = await tx.rating.aggregate({
        where: { noteId },
        _avg: { value: true },
        _count: { value: true },
      });

      await tx.note.update({
        where: { id: noteId },
        data: {
          avgRating: stats._avg.value || 0,
          ratingCount: stats._count.value,
        },
      });

      // Award reputation to note uploader only on NEW ratings
      if (isNewRating) {
        try {
          await tx.profile.update({
            where: { userId: note.uploaderId },
            data: { reputationScore: { increment: 2 } },
          });
        } catch { /* profile may not exist */ }

        await tx.reputationLog.create({
          data: {
            userId: note.uploaderId,
            action: 'rating_received',
            points: 2,
            noteId,
          },
        });

        // Create notification for uploader
        await tx.notification.create({
          data: {
            userId: note.uploaderId,
            type: 'rating',
            title: 'New Rating',
            message: `${user.name} rated your note "${note.title}" ${ratingValue} star${ratingValue > 1 ? 's' : ''}`,
            link: `/notes/${noteId}`,
          },
        });
      }

      return {
        rating: r,
        avgRating: stats._avg.value || 0,
        ratingCount: stats._count.value,
      };
    });

    return NextResponse.json({
      success: true,
      rating: {
        id: rating.id,
        noteId: rating.noteId,
        userId: rating.userId,
        value: rating.value,
      },
      avgRating,
      ratingCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      const message = firstIssue?.message || 'Validation error';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
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
    let userRating: number | null = null;
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

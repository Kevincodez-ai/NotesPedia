import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST - Follow/unfollow user/subject/college
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, followingId, subjectId, collegeId } = body;

    if (!type || !['user', 'subject', 'college'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Valid type is required (user, subject, college)' }, { status: 400 });
    }

    // Validate target exists
    if (type === 'user') {
      if (!followingId) {
        return NextResponse.json({ success: false, error: 'followingId is required for user follows' }, { status: 400 });
      }
      if (followingId === user.id) {
        return NextResponse.json({ success: false, error: 'Cannot follow yourself' }, { status: 400 });
      }
      const targetUser = await db.user.findUnique({ where: { id: followingId } });
      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
    } else if (type === 'subject') {
      if (!subjectId) {
        return NextResponse.json({ success: false, error: 'subjectId is required for subject follows' }, { status: 400 });
      }
      const targetSubject = await db.subject.findUnique({ where: { id: subjectId } });
      if (!targetSubject) {
        return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
      }
    } else if (type === 'college') {
      if (!collegeId) {
        return NextResponse.json({ success: false, error: 'collegeId is required for college follows' }, { status: 400 });
      }
      const targetCollege = await db.college.findUnique({ where: { id: collegeId } });
      if (!targetCollege) {
        return NextResponse.json({ success: false, error: 'College not found' }, { status: 404 });
      }
    }

    // Check if already following
    const existing = await db.follow.findFirst({
      where: {
        followerId: user.id,
        ...(type === 'user' ? { followingId } : { followingId: null }),
        ...(type === 'subject' ? { subjectId } : { subjectId: null }),
        ...(type === 'college' ? { collegeId } : { collegeId: null }),
      },
    });

    if (existing) {
      // Unfollow
      await db.follow.delete({ where: { id: existing.id } });

      // Update counters (wrapped in try/catch — profile may not exist yet)
      if (type === 'user' && followingId) {
        try {
          await db.profile.update({ where: { userId: followingId }, data: { followerCount: { decrement: 1 } } });
          await db.profile.update({ where: { userId: user.id }, data: { followingCount: { decrement: 1 } } });
        } catch { /* profile may not exist yet */ }
      } else if (type === 'subject') {
        await db.subject.update({
          where: { id: subjectId! },
          data: { followerCount: { decrement: 1 } },
        });
      }

      return NextResponse.json({ success: true, following: false, message: 'Unfollowed successfully' });
    } else {
      // Follow
      await db.follow.create({
        data: {
          followerId: user.id,
          type,
          followingId: type === 'user' ? followingId : null,
          subjectId: type === 'subject' ? subjectId : null,
          collegeId: type === 'college' ? collegeId : null,
        },
      });

      // Update counters (wrapped in try/catch — profile may not exist yet)
      if (type === 'user' && followingId) {
        try {
          await db.profile.update({ where: { userId: followingId }, data: { followerCount: { increment: 1 } } });
          await db.profile.update({ where: { userId: user.id }, data: { followingCount: { increment: 1 } } });
        } catch { /* profile may not exist yet */ }

        // Notify the followed user
        await db.notification.create({
          data: {
            userId: followingId,
            type: 'follow',
            title: 'New Follower',
            message: `${user.name} started following you`,
            link: `/users/${user.id}`,
          },
        });
      } else if (type === 'subject') {
        await db.subject.update({
          where: { id: subjectId! },
          data: { followerCount: { increment: 1 } },
        });
      }

      return NextResponse.json({ success: true, following: true, message: 'Followed successfully' });
    }
  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update follow status' }, { status: 500 });
  }
}

// GET - Check follow status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const followingId = searchParams.get('followingId');
    const subjectId = searchParams.get('subjectId');
    const collegeId = searchParams.get('collegeId');

    if (!user) {
      return NextResponse.json({ success: true, following: false });
    }

    const where: Record<string, unknown> = { followerId: user.id };
    if (type === 'user' && followingId) where.followingId = followingId;
    else if (type === 'subject' && subjectId) where.subjectId = subjectId;
    else if (type === 'college' && collegeId) where.collegeId = collegeId;

    const follow = await db.follow.findFirst({ where });

    // Get follower/following counts
    let followerCount = 0;
    if (type === 'user' && followingId) {
      const profile = await db.profile.findUnique({
        where: { userId: followingId },
        select: { followerCount: true },
      });
      followerCount = profile?.followerCount || 0;
    } else if (type === 'subject' && subjectId) {
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
        select: { followerCount: true },
      });
      followerCount = subject?.followerCount || 0;
    }

    return NextResponse.json({
      success: true,
      following: !!follow,
      followerCount,
    });
  } catch (error) {
    console.error('Follow status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check follow status' }, { status: 500 });
  }
}

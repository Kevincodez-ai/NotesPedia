import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, generateToken, setAuthCookie, getAuthUser, removeAuthCookie } from '@/lib/auth';
import { rateLimiter, RateLimits, getClientIdentifier } from '@/lib/rate-limiter';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'signup') {
      // Rate limit signup attempts
      const clientId = getClientIdentifier(request);
      const { allowed } = rateLimiter.check(`signup:${clientId}`, RateLimits.auth.limit, RateLimits.auth.windowMs);
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Too many signup attempts. Please try again later.' }, { status: 429 });
      }

      const data = signupSchema.parse(body);
      
      const existingUser = await db.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
      }

      const passwordHash = await hashPassword(data.password);
      const user = await db.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          role: 'student',
          provider: 'email',
        },
      });

      await db.profile.create({
        data: {
          userId: user.id,
          contributionScore: 0,
          reputationScore: 0,
        },
      });

      const token = generateToken(user.id);
      await setAuthCookie(token);

      // Send verification email (if email is configured)
      try {
        const verificationToken = generateToken(user.id); // reuse JWT token for simplicity
        await db.user.update({
          where: { id: user.id },
          data: {
            emailVerificationToken: verificationToken,
            emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });
        const { sendVerificationEmail } = await import('@/lib/email');
        await sendVerificationEmail(data.email, verificationToken, user.name);
      } catch {
        // Email sending failed - account still works, just not verified
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      });
    }

    if (action === 'login') {
      // Rate limit login attempts
      const clientId = getClientIdentifier(request);
      const { allowed } = rateLimiter.check(`login:${clientId}`, RateLimits.auth.limit, RateLimits.auth.windowMs);
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Too many login attempts. Please try again later.' }, { status: 429 });
      }

      const data = loginSchema.parse(body);
      
      const user = await db.user.findUnique({ where: { email: data.email } });
      if (!user || !user.passwordHash) {
        return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
      }

      const isValid = await verifyPassword(data.password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
      }

      if (!user.isActive) {
        return NextResponse.json({ success: false, error: 'Account is suspended' }, { status: 403 });
      }

      const token = generateToken(user.id);
      await setAuthCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      });
    }

    if (action === 'logout') {
      await removeAuthCookie();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      const message = firstIssue?.message || 'Validation error';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('Auth error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ success: false, user: null });
    }

    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, user: null });
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  bio: z.string().max(500, 'Bio must be at most 500 characters').nullable().optional(),
  avatarUrl: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.string().url('Invalid avatar URL').nullable().optional()
  ),
  collegeId: z.preprocess(
    (val) => (val === '' || val === 'none' || val === null ? null : val),
    z.string().nullable().optional()
  ),
  departmentId: z.preprocess(
    (val) => (val === '' || val === 'none' || val === null ? null : val),
    z.string().nullable().optional()
  ),
  semester: z.preprocess(
    (val) => (val === '' || val === 'none' || val === null || val === undefined ? null : (typeof val === 'string' ? parseInt(val) : val)),
    z.number().int().min(1).max(12).nullable().optional()
  ),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Handle password change
    if (body.action === 'changePassword' || (body.currentPassword && body.newPassword)) {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ success: false, error: 'Current password and new password are required' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      const fullUser = await db.user.findUnique({ where: { id: user.id } });
      if (!fullUser || !fullUser.passwordHash) {
        return NextResponse.json({ success: false, error: 'Cannot change password for this account' }, { status: 400 });
      }

      const isValid = await verifyPassword(currentPassword, fullUser.passwordHash);
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
      }

      const newPasswordHash = await hashPassword(newPassword);
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      return NextResponse.json({ success: true, message: 'Password changed successfully' });
    }

    const data = updateProfileSchema.parse(body);

    // Update User table fields
    const userUpdateData: { name?: string; bio?: string; avatarUrl?: string } = {};
    if (data.name !== undefined) userUpdateData.name = data.name;
    if (data.bio !== undefined) userUpdateData.bio = data.bio;
    if (data.avatarUrl !== undefined) userUpdateData.avatarUrl = data.avatarUrl;

    if (Object.keys(userUpdateData).length > 0) {
      await db.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

    // Update Profile table fields
    const profileUpdateData: { collegeId?: string | null; departmentId?: string | null; semester?: number | null } = {};
    if (data.collegeId !== undefined) profileUpdateData.collegeId = data.collegeId;
    if (data.departmentId !== undefined) profileUpdateData.departmentId = data.departmentId;
    if (data.semester !== undefined) profileUpdateData.semester = data.semester;

    if (Object.keys(profileUpdateData).length > 0) {
      await db.profile.update({
        where: { userId: user.id },
        data: profileUpdateData,
      });
    }

    // Fetch updated user
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        role: true,
        emailVerified: true,
        profile: {
          include: {
            college: { select: { id: true, name: true, shortName: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      const message = firstIssue?.message || 'Validation error';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Deactivate the user account
    await db.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    // Remove auth cookie
    await removeAuthCookie();

    return NextResponse.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Account deactivation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to deactivate account' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';
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
      const { removeAuthCookie } = await import('@/lib/auth');
      await removeAuthCookie();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Auth error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { getAuthUser } = await import('@/lib/auth');
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ success: false, user: null });
    }

    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, user: null });
  }
}

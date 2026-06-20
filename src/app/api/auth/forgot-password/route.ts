import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimiter, RateLimits, getClientIdentifier } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limit password reset requests
    const clientId = getClientIdentifier(request);
    const { allowed } = rateLimiter.check(`forgot-password:${clientId}`, RateLimits.passwordReset.limit, RateLimits.passwordReset.windowMs);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many password reset requests. Please try again later.' }, { status: 429 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Create password reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordReset.create({
      data: { email, token: resetToken, expiresAt },
    });

    // Send reset email
    await sendPasswordResetEmail(email, resetToken, user.name);

    return NextResponse.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}

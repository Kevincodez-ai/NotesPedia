import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimiter, RateLimits, getClientIdentifier } from '@/lib/rate-limiter';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
      // Don't reveal whether the email exists — but still return success
      return NextResponse.json({ success: true, message: 'If an account with that email exists, a reset link has been generated.' });
    }

    // Create password reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordReset.create({
      data: { email, token: resetToken, expiresAt },
    });

    // Build the reset URL
    const resetUrl = `${appUrl}/?reset-password=true&token=${resetToken}`;

    // Try to send email if Resend is configured, otherwise return the link directly
    let emailSent = false;
    try {
      const { sendPasswordResetEmail } = await import('@/lib/email');
      emailSent = await sendPasswordResetEmail(email, resetToken, user.name);
    } catch {
      // Resend not configured — that's fine
    }

    // If email was sent, don't reveal the link (security). If not, return it so the user can use it.
    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'A reset link has been sent to your email address.',
        emailSent: true,
      });
    }

    // No email service — return the reset link directly
    return NextResponse.json({
      success: true,
      message: 'Reset link generated. Since email is not configured, the link is shown below.',
      emailSent: false,
      resetUrl,
      resetToken,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}

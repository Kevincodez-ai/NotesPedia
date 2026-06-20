import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Find valid reset token
    const resetEntry = await db.passwordReset.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetEntry) {
      return NextResponse.json({ success: false, error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await db.user.update({
      where: { email: resetEntry.email },
      data: { passwordHash },
    });

    // Mark token as used
    await db.passwordReset.update({
      where: { id: resetEntry.id },
      data: { used: true },
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      return NextResponse.json({ success: false, error: firstIssue?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, error: 'Failed to reset password' }, { status: 500 });
  }
}

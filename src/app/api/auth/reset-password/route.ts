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

    // Use a transaction to prevent race conditions:
    // 1. Find & lock the valid token
    // 2. Update the password
    // 3. Mark token as used — all atomically
    const result = await db.$transaction(async (tx) => {
      const resetEntry = await tx.passwordReset.findFirst({
        where: {
          token,
          used: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!resetEntry) {
        throw new Error('INVALID_TOKEN');
      }

      // Mark token as used FIRST to prevent concurrent reuse
      await tx.passwordReset.update({
        where: { id: resetEntry.id },
        data: { used: true },
      });

      // Hash and update password
      const passwordHash = await hashPassword(password);
      await tx.user.update({
        where: { email: resetEntry.email },
        data: { passwordHash },
      });

      return { email: resetEntry.email };
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Invalid or expired reset token' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues?.[0];
      return NextResponse.json({ success: false, error: firstIssue?.message || 'Validation error' }, { status: 400 });
    }

    // Handle transaction-level error for invalid/expired token
    if (error instanceof Error && error.message === 'INVALID_TOKEN') {
      return NextResponse.json({ success: false, error: 'Invalid or expired reset token' }, { status: 400 });
    }

    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, error: 'Failed to reset password' }, { status: 500 });
  }
}

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'noreply@notespedia.com';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getResendClient(): Resend | null {
  if (!resendApiKey) {
    console.warn('Resend API key not configured. Emails will not be sent.');
    return null;
  }
  return new Resend(resendApiKey);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.log(`[EMAIL DISABLED] Would send to ${to}: ${subject}`);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: `NotesPedia <${emailFrom}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, token: string, userName: string): Promise<boolean> {
  const verificationUrl = `${appUrl}/api/auth/verify?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Verify your NotesPedia account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #059669; font-size: 28px; margin: 0;">NotesPedia</h1>
          <p style="color: #6b7280; font-size: 16px;">AI-Powered Academic Knowledge Platform</p>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Hello, ${userName}!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for signing up for NotesPedia. Please verify your email address to get started.
          </p>
          <a href="${verificationUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 16px 0;">
            Verify Email Address
          </a>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 16px;">
            This link expires in 24 hours. If you didn't create an account, you can ignore this email.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} NotesPedia. All rights reserved.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string, userName: string): Promise<boolean> {
  const resetUrl = `${appUrl}/?reset-password=true&token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Reset your NotesPedia password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #059669; font-size: 28px; margin: 0;">NotesPedia</h1>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Hello, ${userName}!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 16px 0;">
            Reset Password
          </a>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 16px;">
            This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} NotesPedia. All rights reserved.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Welcome to NotesPedia! 🎓',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #059669; font-size: 28px; margin: 0;">NotesPedia</h1>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Welcome, ${userName}! 🎉</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Your NotesPedia account is ready. Here's what you can do:
          </p>
          <ul style="color: #4b5563; font-size: 16px; line-height: 2;">
            <li>📚 Upload and share your academic notes</li>
            <li>🤖 Get AI-powered summaries and flashcards</li>
            <li>🔍 Search notes across colleges and subjects</li>
            <li>⭐ Rate and review notes from other students</li>
            <li>🏆 Build your reputation and climb the leaderboard</li>
          </ul>
          <a href="${appUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 16px 0;">
            Get Started
          </a>
        </div>
      </div>
    `,
  });
}

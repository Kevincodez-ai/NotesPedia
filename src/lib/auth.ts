import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Authentication will not work.');
}
const TOKEN_NAME = 'notespedia_token';
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ userId, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  if (!JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY / 1000,
    path: '/',
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

export async function getAuthUser(): Promise<{
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        isActive: true,
      },
    });

    // Suspended/deactivated users cannot authenticate
    if (!user || !user.isActive) return null;

    // Return without isActive to match the return type
    const { isActive: _isActive, ...authUser } = user;
    return authUser;
  } catch {
    return null;
  }
}

export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  const roleHierarchy = ['guest', 'student', 'verified_student', 'contributor', 'moderator', 'admin', 'super_admin'];
  const userLevel = roleHierarchy.indexOf(userRole);
  return requiredRoles.some(role => userLevel >= roleHierarchy.indexOf(role));
}

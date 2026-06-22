import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check env vars
  results.env = {
    DATABASE_URL: process.env.DATABASE_URL ? `SET (${process.env.DATABASE_URL.length} chars, starts with ${process.env.DATABASE_URL.substring(0, 30)}...)` : 'MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. Test Prisma connection
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1 as test`;
    results.database = 'CONNECTED';
  } catch (dbError) {
    results.database = {
      status: 'FAILED',
      error: dbError instanceof Error ? dbError.message : String(dbError),
    };
  }

  // 3. Test basic query
  try {
    const { db } = await import('@/lib/db');
    const userCount = await db.user.count();
    results.userCount = userCount;
  } catch (queryError) {
    results.queryError = queryError instanceof Error ? queryError.message : String(queryError);
  }

  return NextResponse.json(results, { status: 200 });
}
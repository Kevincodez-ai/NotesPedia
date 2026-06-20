import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, RateLimits, getClientIdentifier, createRateLimitHeaders } from '@/lib/rate-limiter';

// Security headers for all responses
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function middleware(request: NextRequest) {
  // Add security headers to all responses
  const response = request.nextUrl.pathname.startsWith('/api/')
    ? handleApiRequest(request)
    : NextResponse.next();

  // Apply security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Add CSP for non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https://*.supabase.co https://ui-avatars.com",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co https://api.resend.com",
        "frame-ancestors 'none'",
      ].join('; ')
    );
  }

  return response;
}

function handleApiRequest(request: NextRequest): NextResponse {
  const clientId = getClientIdentifier(request);
  const path = request.nextUrl.pathname;

  // Select rate limit preset based on route
  let limitConfig;
  if (path.startsWith('/api/auth/forgot-password') || path.startsWith('/api/auth/reset-password')) {
    limitConfig = RateLimits.passwordReset;
  } else if (path.startsWith('/api/auth')) {
    limitConfig = RateLimits.auth;
  } else if (path.startsWith('/api/upload')) {
    limitConfig = RateLimits.upload;
  } else if (path.startsWith('/api/download')) {
    limitConfig = RateLimits.download;
  } else if (path.startsWith('/api/ai/')) {
    limitConfig = RateLimits.ai;
  } else if (path.startsWith('/api/search')) {
    limitConfig = RateLimits.search;
  } else {
    limitConfig = RateLimits.api;
  }

  const key = `${path}:${clientId}`;
  const { allowed, remaining, resetTime } = rateLimiter.check(key, limitConfig.limit, limitConfig.windowMs);

  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          ...createRateLimitHeaders(remaining, resetTime),
        },
      }
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|logo.svg).*)',
  ],
};

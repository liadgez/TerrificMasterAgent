import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers to add to all responses
const securityHeaders = {
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Enforce HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; '),
  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', ')
};

// Rate limiting configuration
const rateLimitConfig = {
  // API endpoints have stricter limits
  '/api/': { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  // General pages have more lenient limits  
  '/': { requests: 1000, windowMs: 15 * 60 * 1000 } // 1000 requests per 15 minutes
};

// Simple in-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, pathname: string): boolean {
  const now = Date.now();
  const config = rateLimitConfig[pathname.startsWith('/api/') ? '/api/' : '/'];
  
  const key = `${ip}:${pathname.startsWith('/api/') ? 'api' : 'web'}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return true;
  }
  
  if (current.count >= config.requests) {
    return false; // Rate limit exceeded
  }
  
  current.count++;
  return true;
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Get client IP for rate limiting
  const ip = request.ip || 
    request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'unknown';
  
  // Apply rate limiting
  const isAllowed = checkRateLimit(ip, request.nextUrl.pathname);
  
  if (!isAllowed) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: '15 minutes'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900', // 15 minutes in seconds
          ...securityHeaders
        }
      }
    );
  }
  
  // Add rate limit headers for API responses
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const config = rateLimitConfig['/api/'];
    const key = `${ip}:api`;
    const current = rateLimitStore.get(key);
    
    if (current) {
      response.headers.set('X-RateLimit-Limit', config.requests.toString());
      response.headers.set('X-RateLimit-Remaining', (config.requests - current.count).toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());
    }
  }
  
  // Log security events for monitoring
  if (request.nextUrl.pathname.startsWith('/api/execute')) {
    console.log(`[SECURITY] API access from ${ip} at ${new Date().toISOString()}`);
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
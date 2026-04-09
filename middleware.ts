import { NextRequest, NextResponse } from 'next/server';

// Routes that require portal auth (checked client-side via PortalAuthGuard)
// Server-side protection via cookie
export function middleware(req: NextRequest) {
  // Allow all - auth is handled client-side via PortalAuthGuard components
  return NextResponse.next();
}

export const config = {
  matcher: ['/reporting/:path*', '/timesheet/:path*', '/lab/:path*'],
};

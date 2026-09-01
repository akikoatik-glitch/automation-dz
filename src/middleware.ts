import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight guard: full authorization re-checked per-page by getServerSession/getWorkspace.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const openPaths = ['/login', '/register', '/pricing', '/f/'];
  if (pathname === '/' || openPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  const needsAdmin = pathname.startsWith('/admin');

  if (needsAdmin || pathname.startsWith('/app')) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/admin/:path*']
};
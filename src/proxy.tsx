import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('orion_session')?.value;

  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(new URL('/api/auth/setup/status', request.url));
    const { hasAdmin } = await res.json();

    if (hasAdmin && pathname === '/setup') {
      return NextResponse.redirect(new URL(token ? '/' : '/login', request.url));
    }

    if (!hasAdmin && pathname !== '/setup') {
      return NextResponse.redirect(new URL('/setup', request.url));
    }
  } catch (e) {
    console.error("Error en el chequeo de setup:", e);
  }

  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (!token && !isAuthPage && pathname !== '/setup') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getInternalOrigin(request: NextRequest): string {
  const raw = process.env.INTERNAL_APP_URL?.trim();

  if (raw) {
    return raw.replace(/\/$/, '');
  }

  return request.nextUrl.origin;
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set('orion_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('orion_session')?.value;
  const internalOrigin = getInternalOrigin(request);
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/complete-access';
  let hasValidSession = false;

  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  if (token && pathname !== '/setup') {
    try {
      const sessionRes = await fetch(`${internalOrigin}/api/auth/session`, {
        headers: {
          cookie: request.headers.get('cookie') ?? '',
        },
      });

      const data = (await sessionRes.json()) as { authenticated?: boolean };
      hasValidSession = sessionRes.ok && data.authenticated === true;

      if (!hasValidSession && !isAuthPage) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        clearSessionCookie(response);
        return response;
      }

      if (!hasValidSession && isAuthPage) {
        const response = NextResponse.next();
        clearSessionCookie(response);
        return response;
      }
    } catch {
      if (!isAuthPage) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        clearSessionCookie(response);
        return response;
      }

      const response = NextResponse.next();
      clearSessionCookie(response);
      return response;
    }
  }

  try {
    const res = await fetch(`${internalOrigin}/api/auth/setup/status`);
    const { hasAdmin } = await res.json();

    if (hasAdmin && pathname === '/setup') {
      return NextResponse.redirect(new URL(hasValidSession ? '/' : '/login', request.url));
    }

    if (!hasAdmin && pathname !== '/setup') {
      return NextResponse.redirect(new URL('/setup', request.url));
    }
  } catch (e) {
    console.error("Error en el chequeo de setup:", e);
  }

  if (!token && !isAuthPage && pathname !== '/setup') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasValidSession && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

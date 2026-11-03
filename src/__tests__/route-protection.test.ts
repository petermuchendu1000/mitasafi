/**
 * Regression tests for proxy route protection.
 *
 * Guards a defect that left EVERY route unauthenticated: '/' was listed in
 * publicRoutes and matched with pathname.startsWith(route). Since every path
 * starts with '/', isPublicRoute was always true, the proxy always took the
 * public early-return, and its protected-route branch was unreachable --
 * protectedRoutes was never consulted.
 *
 * These import the REAL implementation from @/lib/security/route-access, which
 * src/proxy.ts also uses. An earlier version of this file re-implemented the
 * predicate locally, which made the behavioural assertions tautological: they
 * passed even with the defect reintroduced into the proxy.
 */
import {
  isPublicRoute,
  isProtectedRoute,
  isAuthRoute,
  publicRoutes,
  protectedRoutes,
} from '@/lib/security/route-access';

describe('isPublicRoute', () => {
  it.each(['/', '/properties', '/listings/some-slug', '/services', '/contact'])(
    'treats %s as public',
    (pathname) => {
      expect(isPublicRoute(pathname)).toBe(true);
      expect(isProtectedRoute(pathname)).toBe(false);
    }
  );

  it.each(['/dashboard', '/dashboard/bookings/123', '/dashboard/landlord', '/settings', '/admin'])(
    'never treats %s as public',
    (pathname) => {
      expect(isPublicRoute(pathname)).toBe(false);
      expect(isProtectedRoute(pathname)).toBe(true);
    }
  );

  it('matches "/" exactly rather than as a prefix', () => {
    // The original defect: '/' prefix-matched everything.
    expect(isPublicRoute('/')).toBe(true);
    expect(isPublicRoute('/dashboard')).toBe(false);
  });

  it('does not classify every path as public', () => {
    expect(['/dashboard', '/settings', '/admin'].every(isPublicRoute)).toBe(false);
  });
});

describe('isProtectedRoute', () => {
  it('covers every authenticated area', () => {
    expect(protectedRoutes).toContain('/dashboard');
    expect(protectedRoutes).toContain('/settings');
    expect(protectedRoutes).toContain('/admin');
  });

  it('does not protect public marketing paths', () => {
    for (const p of ['/', '/properties', '/services', '/contact']) {
      expect(isProtectedRoute(p)).toBe(false);
    }
  });
});

describe('isAuthRoute', () => {
  it('identifies sign-in and sign-up', () => {
    expect(isAuthRoute('/login')).toBe(true);
    expect(isAuthRoute('/signup')).toBe(true);
    expect(isAuthRoute('/dashboard')).toBe(false);
  });
});

describe('no route is both public and protected', () => {
  it('holds for every declared route', () => {
    for (const r of [...publicRoutes, ...protectedRoutes]) {
      expect(isPublicRoute(r) && isProtectedRoute(r)).toBe(false);
    }
  });
});

describe('auth middleware must not verify JWTs with a shared secret', () => {
  // The anon key is published in the browser bundle and HS256 is symmetric, so
  // verifying against it let anyone mint a token for any user.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require('node:fs') as typeof import('node:fs');
  const mw = readFileSync('src/lib/supabase/middleware.ts', 'utf8');
  const codeOnly = mw
    .split('\n')
    .filter((l: string) => !/^\s*(\*|\/\/|\/\*)/.test(l))
    .join('\n');

  it('does not call jwtVerify', () => {
    expect(codeOnly).not.toContain('jwtVerify');
  });

  it('does not fall back to the anon key as a JWT secret', () => {
    expect(codeOnly).not.toContain('SUPABASE_JWT_SECRET');
  });

  it('validates the user via supabase.auth.getUser()', () => {
    expect(codeOnly).toContain('auth.getUser()');
  });

  it('does not cache sessions keyed on a JWT prefix', () => {
    expect(codeOnly).not.toContain('sessionCache');
  });
});

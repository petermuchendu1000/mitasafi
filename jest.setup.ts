/**
 * Jest Setup File
 *
 * Extends Jest with custom matchers and global setup.
 */

import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => "",
}));

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
      // Without this, every component that subscribes to auth state throws
      // "supabase.auth.onAuthStateChange is not a function" on mount, and the render
      // fails as an opaque AggregateError. That made Navbar, NotificationCenter and
      // anything containing them impossible to render under jest — which is a large
      // part of why src/app and src/components had no component tests at all.
      // The shape mirrors the real client: { data: { subscription: { unsubscribe } } }.
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: { id: "test-listing-id" }, error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest
          .fn()
          .mockResolvedValue({ data: { path: "test-path" }, error: null }),
        getPublicUrl: jest
          .fn()
          .mockReturnValue({
            data: { publicUrl: "https://test.com/image.jpg" },
          }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  }),
}));

// Suppress console warnings in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

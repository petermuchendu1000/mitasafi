/**
 * The login page must show why the auth callback sent the user back.
 *
 * /auth/callback has redirected to /login?error=auth_failed since it was
 * written, and nothing on this page ever read that parameter: the user landed
 * on an ordinary-looking login form with no indication anything had failed.
 * The same silence would have swallowed the new profile_lookup_failed /
 * profile_create_failed / role_create_failed codes.
 *
 * The raw code is never rendered - an unrecognised value falls back to a fixed
 * generic message rather than echoing URL content back into the page.
 */

import { render, screen } from "@testing-library/react";

// jsdom ships performance.now() but not the User Timing marks that
// usePageLoadPerformance calls on mount. Supply the missing pieces so the page
// can render; this is a jsdom gap, not behaviour under test.
if (typeof performance.mark !== "function") {
  Object.assign(performance, {
    mark: () => undefined,
    measure: () => undefined,
    clearMarks: () => undefined,
    clearMeasures: () => undefined,
    getEntriesByType: () => [],
    getEntriesByName: () => [],
  });
}

let params = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  useSearchParams: () => params,
  usePathname: () => "/login",
}));

import LoginPage from "../page";

function renderWith(query: string) {
  params = new URLSearchParams(query);
  return render(<LoginPage />);
}

afterEach(() => {
  params = new URLSearchParams();
});

describe("auth callback errors are visible on the login page", () => {
  it.each([
    ["auth_failed", /couldn't complete that sign-in/i],
    ["profile_lookup_failed", /couldn't load your account/i],
    ["profile_create_failed", /couldn't finish setting up your account/i],
    ["role_create_failed", /couldn't set up your role/i],
  ])("renders a message for ?error=%s", async (code, pattern) => {
    renderWith(`error=${code}`);

    expect(await screen.findByText(pattern)).toBeInTheDocument();
  });

  it("shows a generic message for an unrecognised code, never the code itself", async () => {
    renderWith("error=totally_made_up_code");

    expect(await screen.findByText(/something went wrong signing you in/i)).toBeInTheDocument();
    expect(screen.queryByText(/totally_made_up_code/)).not.toBeInTheDocument();
  });

  it("shows nothing when there is no error parameter", async () => {
    renderWith("redirectTo=%2Fdashboard");

    // Wait for the form to exist before asserting an absence.
    expect(await screen.findByText(/continue with google/i)).toBeInTheDocument();
    expect(screen.queryByText(/please try again/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});

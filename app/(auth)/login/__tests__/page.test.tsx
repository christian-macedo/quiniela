import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockAuthUser } from "@/__tests__/helpers/supabase-mock";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

const { mockSupabase, mockAuth, mockQueryResult } = vi.hoisted(() => {
  const result = { data: null as unknown, error: null as unknown };
  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), single: vi.fn(), limit: vi.fn(), order: vi.fn(),
  };
  for (const key of Object.keys(qb)) {
    if (key === "single") qb[key].mockImplementation(() => Promise.resolve(result));
    else qb[key].mockReturnValue(qb);
  }
  Object.defineProperty(qb, "then", {
    get: () => (resolve: (v: unknown) => void) => resolve(result),
    configurable: true,
  });
  const mockAuth = {
    getUser: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(),
    signOut: vi.fn(), exchangeCodeForSession: vi.fn(),
  };
  return {
    mockSupabase: { auth: mockAuth, from: vi.fn().mockReturnValue(qb) },
    mockAuth,
    mockQueryResult: result,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}));

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));

vi.mock("@/components/layout/language-switcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock("@/components/auth/passkey/passkey-login-button", () => ({
  PasskeyLoginButton: () => <div data-testid="passkey-login-button" />,
}));

vi.mock("@/components/auth/passkey/passkey-migration-prompt", () => ({
  PasskeyMigrationPrompt: ({
    open,
    onSkip,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSkip: () => void;
    onSuccess: () => void;
  }) =>
    open ? (
      <div data-testid="passkey-migration-prompt">
        <button onClick={onSkip} data-testid="skip-migration">
          Skip
        </button>
      </div>
    ) : null,
}));

// Import after mocking
import LoginPage from "@/app/(auth)/login/page";

describe("LoginPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire from() chain after clearAllMocks
    const qb = mockSupabase.from();
    mockSupabase.from.mockReturnValue(qb);
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    mockQueryResult.data = null;
    mockQueryResult.error = null;
  });

  it("renders login form with email and password fields", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("emailLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("passwordLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "loginButton" })).toBeInTheDocument();
  });

  it("renders passkey login button", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("passkey-login-button")).toBeInTheDocument();
  });

  it("calls supabase.auth.signInWithPassword on form submission", async () => {
    const authUser = createMockAuthUser();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: authUser, session: {} },
      error: null,
    });
    // User already has passkeys — immediate redirect
    mockQueryResult.data = [{ id: "passkey-1" }];
    mockQueryResult.error = null;

    render(<LoginPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "loginButton" }));

    await waitFor(() => {
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("redirects to /tournaments when user has existing passkeys", async () => {
    const authUser = createMockAuthUser();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: authUser, session: {} },
      error: null,
    });
    // Simulate user has passkeys
    mockQueryResult.data = [{ id: "passkey-1" }];
    mockQueryResult.error = null;

    render(<LoginPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "loginButton" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/tournaments");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("shows passkey migration prompt when user has no passkeys", async () => {
    const authUser = createMockAuthUser();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: authUser, session: {} },
      error: null,
    });
    // Simulate no passkeys registered
    mockQueryResult.data = [];
    mockQueryResult.error = null;

    render(<LoginPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "loginButton" }));

    await waitFor(() => {
      expect(screen.getByTestId("passkey-migration-prompt")).toBeInTheDocument();
    });
  });

  it("redirects to /tournaments when migration prompt is skipped", async () => {
    const authUser = createMockAuthUser();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: authUser, session: {} },
      error: null,
    });
    mockQueryResult.data = [];
    mockQueryResult.error = null;

    render(<LoginPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "loginButton" }));

    // Wait for migration prompt to appear
    await waitFor(() => {
      expect(screen.getByTestId("passkey-migration-prompt")).toBeInTheDocument();
    });

    // Click skip
    await user.click(screen.getByTestId("skip-migration"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/tournaments");
    });
  });

  it("displays error message on invalid credentials", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText("emailLabel"), "wrong@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "loginButton" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows loading state while logging in", async () => {
    // Make signIn hang
    mockAuth.signInWithPassword.mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "loginButton" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "loggingIn" })).toBeDisabled();
    });
  });

  it("renders links to sign-up and forgot password pages", () => {
    render(<LoginPage />);

    const signupLink = screen.getByRole("link", { name: "signUpLink" });
    expect(signupLink).toHaveAttribute("href", "/signup");

    const forgotLink = screen.getByRole("link", { name: "forgotPassword" });
    expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockAuthUser } from "@/__tests__/helpers/supabase-mock";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

const { mockSupabase, mockAuth } = vi.hoisted(() => {
  const mockAuth = {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  };
  return {
    mockSupabase: { auth: mockAuth, from: vi.fn() },
    mockAuth,
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

// Import after mocking
import SignupPage from "@/app/(auth)/signup/page";

describe("SignupPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
  });

  it("renders sign-up form with email, screen name, and password fields", () => {
    render(<SignupPage />);

    expect(screen.getByLabelText("emailLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("screenNameLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("passwordLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "signUpButton" })).toBeInTheDocument();
  });

  it("calls supabase.auth.signUp with correct data on form submission", async () => {
    const authUser = createMockAuthUser({ id: "new-user-id", email: "new@example.com" });
    mockAuth.signUp.mockResolvedValue({
      data: { user: authUser, session: {} },
      error: null,
    });

    render(<SignupPage />);

    await user.type(screen.getByLabelText("emailLabel"), "new@example.com");
    await user.type(screen.getByLabelText("screenNameLabel"), "NewPlayer");
    await user.type(screen.getByLabelText("passwordLabel"), "securepass123");
    await user.click(screen.getByRole("button", { name: "signUpButton" }));

    await waitFor(() => {
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "securepass123",
        options: {
          data: {
            screen_name: "NewPlayer",
          },
        },
      });
    });
  });

  it("navigates to /tournaments after successful sign-up", async () => {
    const authUser = createMockAuthUser();
    mockAuth.signUp.mockResolvedValue({
      data: { user: authUser, session: {} },
      error: null,
    });

    render(<SignupPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "signUpButton" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/tournaments");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("displays error message on duplicate email", async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });

    render(<SignupPage />);

    await user.type(screen.getByLabelText("emailLabel"), "existing@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "signUpButton" }));

    await waitFor(() => {
      expect(screen.getByText("User already registered")).toBeInTheDocument();
    });

    // Should NOT navigate
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("displays error message on weak password", async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Password should be at least 6 characters" },
    });

    render(<SignupPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "123");
    await user.click(screen.getByRole("button", { name: "signUpButton" }));

    await waitFor(() => {
      expect(screen.getByText("Password should be at least 6 characters")).toBeInTheDocument();
    });
  });

  it("sends null screen_name when field is empty", async () => {
    const authUser = createMockAuthUser();
    mockAuth.signUp.mockResolvedValue({
      data: { user: authUser, session: {} },
      error: null,
    });

    render(<SignupPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    // Deliberately skip screenName
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "signUpButton" }));

    await waitFor(() => {
      expect(mockAuth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            data: {
              screen_name: null,
            },
          },
        }),
      );
    });
  });

  it("shows loading state while submitting", async () => {
    // Make signUp hang so we can observe the loading state
    mockAuth.signUp.mockReturnValue(new Promise(() => {}));

    render(<SignupPage />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "password123");
    await user.click(screen.getByRole("button", { name: "signUpButton" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "creatingAccount" })).toBeDisabled();
    });
  });

  it("renders a link to the login page", () => {
    render(<SignupPage />);

    const loginLink = screen.getByRole("link", { name: "loginLink" });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockExchangeCodeForSession = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, _options: unknown) => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}));

// Import after mocking
import { GET } from "@/app/auth/callback/route";
import { NextRequest } from "next/server";

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/auth/callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("redirects to /tournaments after successful code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = createRequest({ code: "valid-auth-code" });
    const response = await GET(request);

    expect(response.status).toBe(307); // NextResponse.redirect
    expect(new URL(response.headers.get("location")!).pathname).toBe("/tournaments");
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-auth-code");
  });

  it("redirects to custom 'next' path after successful exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = createRequest({ code: "valid-code", next: "/profile" });
    const response = await GET(request);

    expect(new URL(response.headers.get("location")!).pathname).toBe("/profile");
  });

  it("redirects to /login with error when no code is provided", async () => {
    const request = createRequest({});
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("auth_callback_error");
  });

  it("redirects to /login with error when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "Invalid code" },
    });

    const request = createRequest({ code: "invalid-code" });
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("auth_callback_error");
  });

  it("defaults to /tournaments when 'next' param is not a valid path", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    // External URL should be rejected — only paths starting with / are allowed
    const request = createRequest({ code: "valid-code", next: "https://evil.com" });
    const response = await GET(request);

    expect(new URL(response.headers.get("location")!).pathname).toBe("/tournaments");
  });
});

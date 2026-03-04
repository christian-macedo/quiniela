import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockVerifyAuthResponse, mockAdminGenerateLink, mockSupabase, mockAuth } = vi.hoisted(() => {
  const mockVerifyAuthResponse = vi.fn();
  const mockAdminGenerateLink = vi.fn();

  const qb = {
    update: vi.fn(),
    eq: vi.fn(),
  };
  qb.update.mockReturnValue(qb);
  qb.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));

  const mockAuth = {
    verifyOtp: vi.fn(),
  };

  const mockSupabase = {
    auth: mockAuth,
    from: vi.fn().mockReturnValue(qb),
  };

  return { mockVerifyAuthResponse, mockAdminGenerateLink, mockSupabase, mockAuth };
});

vi.mock("@/lib/webauthn/server", () => ({
  verifyUserAuthenticationResponse: mockVerifyAuthResponse,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { generateLink: mockAdminGenerateLink } },
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { POST } from "@/app/api/auth/passkey/authenticate-verify/route";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/auth/passkey/authenticate-verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }), // missing response
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  it("returns 400 when verification fails", async () => {
    mockVerifyAuthResponse.mockResolvedValue({ verified: false, userId: null });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", response: { id: "cred-1" } }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Authentication verification failed");
  });

  it("returns verified and userId but NOT session tokens in the response body", async () => {
    mockVerifyAuthResponse.mockResolvedValue({ verified: true, userId: "user-123" });
    mockAdminGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: "tok123" } },
      error: null,
    });
    mockAuth.verifyOtp.mockResolvedValue({
      data: {
        session: { access_token: "SECRET_AT", refresh_token: "SECRET_RT" },
        user: { id: "user-123" },
      },
      error: null,
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", response: { id: "cred-1" } }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(true);
    expect(body.userId).toBe("user-123");
    // Tokens set via HTTP-only cookies must not appear in the response body
    expect(body.session).toBeUndefined();
    expect(body.access_token).toBeUndefined();
    expect(body.refresh_token).toBeUndefined();
    // Ensure the raw token values don't appear anywhere in the response
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("SECRET_AT");
    expect(bodyStr).not.toContain("SECRET_RT");
  });

  it("returns 500 when session creation fails", async () => {
    mockVerifyAuthResponse.mockResolvedValue({ verified: true, userId: "user-123" });
    mockAdminGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: "tok123" } },
      error: null,
    });
    mockAuth.verifyOtp.mockResolvedValue({
      data: { session: null },
      error: { message: "OTP expired" },
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", response: { id: "cred-1" } }),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req);

    consoleSpy.mockRestore();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create session");
  });

  it("returns generic 500 without leaking internal error details", async () => {
    mockVerifyAuthResponse.mockRejectedValue(new Error("internal db details xyz"));

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", response: { id: "cred-1" } }),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req);

    consoleSpy.mockRestore();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to verify authentication");
    expect(body.error).not.toContain("internal db details xyz");
  });
});

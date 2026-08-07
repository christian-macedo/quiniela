import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuthUser } from "@/__tests__/helpers/supabase-mock";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockVerifyRegistration, mockSupabase, mockAuth } = vi.hoisted(() => {
  const mockVerifyRegistration = vi.fn();
  const mockAuth = { getUser: vi.fn() };
  return {
    mockVerifyRegistration,
    mockSupabase: { auth: mockAuth },
    mockAuth,
  };
});

vi.mock("@/lib/webauthn/server", () => ({
  verifyUserRegistrationResponse: mockVerifyRegistration,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { POST } from "@/app/api/auth/passkey/register-verify/route";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/auth/passkey/register-verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ response: { id: "cred-1" } }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("logged in");
  });

  it("returns 400 when response field is missing", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  it("returns 400 when registration verification fails", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockVerifyRegistration.mockResolvedValue({ verified: false });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ response: { id: "cred-1" } }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Registration verification failed");
  });

  it("returns verified success with credential name", async () => {
    const authUser = createMockAuthUser({ id: "user-123" });
    mockAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockVerifyRegistration.mockResolvedValue({ verified: true });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ response: { id: "cred-1" }, credentialName: "My iPhone" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(true);
    expect(mockVerifyRegistration).toHaveBeenCalledWith("user-123", { id: "cred-1" }, "My iPhone");
  });

  it("returns generic 500 without leaking internal error details", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockVerifyRegistration.mockRejectedValue(new Error("Failed to store credential: pg error xyz"));

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ response: { id: "cred-1" } }),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req);

    consoleSpy.mockRestore();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to verify registration");
    expect(body.error).not.toContain("pg error xyz");
  });
});

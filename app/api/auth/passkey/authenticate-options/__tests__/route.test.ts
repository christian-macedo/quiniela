import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockGenerateOptions } = vi.hoisted(() => ({
  mockGenerateOptions: vi.fn(),
}));

vi.mock("@/lib/webauthn/server", () => ({
  generateUserAuthenticationOptions: mockGenerateOptions,
}));

// Import after mocking
import { POST } from "@/app/api/auth/passkey/authenticate-options/route";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/auth/passkey/authenticate-options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email is missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Email is required");
  });

  it("returns options on success", async () => {
    const options = { challenge: "abc123", rpId: "localhost" };
    mockGenerateOptions.mockResolvedValue({ options });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(options);
  });

  it("returns generic 404 for 'User not found' without revealing account existence", async () => {
    mockGenerateOptions.mockRejectedValue(new Error("User not found"));

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "nobody@example.com" }),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req);

    consoleSpy.mockRestore();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Could not find credentials for this account");
    expect(body.error).not.toBe("User not found");
  });

  it("returns same generic 404 for 'No passkeys registered' to prevent email enumeration", async () => {
    mockGenerateOptions.mockRejectedValue(new Error("No passkeys registered for this user"));

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req);

    consoleSpy.mockRestore();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Could not find credentials for this account");
    expect(body.error).not.toContain("passkeys");
  });

  it("returns generic 500 without leaking internal error details", async () => {
    mockGenerateOptions.mockRejectedValue(new Error("pg: connection timeout xyz"));

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(req);

    consoleSpy.mockRestore();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate authentication options");
    expect(body.error).not.toContain("pg: connection timeout xyz");
  });
});

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuthUser } from "@/__tests__/helpers/supabase-mock";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckUserActive = vi.hoisted(() => vi.fn());

const {
  mockSupabase,
  mockAuth,
  matchesQb,
  matchesResult,
  participantsQb,
  participantsResult,
  predictionsQb,
  predictionsResult,
} = vi.hoisted(() => {
  function makeQb() {
    const result = { data: null as unknown, error: null as unknown };
    const qb: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      in: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      limit: vi.fn(),
      order: vi.fn(),
    };
    for (const key of Object.keys(qb)) {
      if (key === "single" || key === "maybeSingle")
        qb[key].mockImplementation(() => Promise.resolve(result));
      else qb[key].mockReturnValue(qb);
    }
    Object.defineProperty(qb, "then", {
      get: () => (resolve: (v: unknown) => void) => resolve(result),
      configurable: true,
    });
    return { qb, result };
  }

  const { qb: matchesQb, result: matchesResult } = makeQb();
  const { qb: participantsQb, result: participantsResult } = makeQb();
  const { qb: predictionsQb, result: predictionsResult } = makeQb();

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
    matchesQb,
    matchesResult,
    participantsQb,
    participantsResult,
    predictionsQb,
    predictionsResult,
  };
});

vi.mock("@/lib/middleware/user-status-check", () => ({
  checkUserActive: mockCheckUserActive,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/utils/date", () => ({
  getCurrentUTC: vi.fn(() => "2026-04-11T00:00:00.000Z"),
}));

// Import after mocking
import { POST } from "../route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = "user-123";
const MATCH_ID = "match-456";
const TOURNAMENT_ID = "tournament-789";

const makeRequest = (body: object) =>
  new NextRequest("http://localhost/api/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const validBody = {
  match_id: MATCH_ID,
  predicted_home_score: 2,
  predicted_away_score: 1,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/predictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckUserActive.mockResolvedValue(null);
    mockAuth.getUser.mockResolvedValue({
      data: { user: createMockAuthUser({ id: USER_ID }) },
      error: null,
    });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "matches") return matchesQb;
      if (table === "tournament_participants") return participantsQb;
      return predictionsQb;
    });
    matchesResult.data = { tournament_id: TOURNAMENT_ID, status: "scheduled" };
    matchesResult.error = null;
    participantsResult.data = { user_id: USER_ID };
    participantsResult.error = null;
    predictionsResult.data = {
      id: "pred-1",
      user_id: USER_ID,
      match_id: MATCH_ID,
      predicted_home_score: 2,
      predicted_away_score: 1,
    };
    predictionsResult.error = null;
  });

  // ── Input validation ───────────────────────────────────────────────────────

  it("returns 400 when match_id is missing", async () => {
    const response = await POST(
      makeRequest({ predicted_home_score: 1, predicted_away_score: 0 })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("match_id");
  });

  it("returns 400 when predicted scores are negative", async () => {
    const response = await POST(
      makeRequest({ match_id: MATCH_ID, predicted_home_score: -1, predicted_away_score: 0 })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Scores must be integers");
  });

  it("returns 400 when predicted scores are not integers", async () => {
    const response = await POST(
      makeRequest({ match_id: MATCH_ID, predicted_home_score: 1.5, predicted_away_score: 0 })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when predicted scores exceed 99", async () => {
    const response = await POST(
      makeRequest({ match_id: MATCH_ID, predicted_home_score: 100, predicted_away_score: 0 })
    );
    expect(response.status).toBe(400);
  });

  // ── Guard checks ───────────────────────────────────────────────────────────

  it("returns user-status error when user is deactivated", async () => {
    mockCheckUserActive.mockResolvedValue(
      new Response(JSON.stringify({ error: "Account is deactivated" }), { status: 403 })
    );

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(403);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("returns 404 when match is not found", async () => {
    matchesResult.data = null;
    matchesResult.error = { message: "Not found" };

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(404);
  });

  it("returns 422 when match is completed", async () => {
    matchesResult.data = { tournament_id: TOURNAMENT_ID, status: "completed" };

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("Predictions are closed");
  });

  it("returns 422 when match is cancelled", async () => {
    matchesResult.data = { tournament_id: TOURNAMENT_ID, status: "cancelled" };

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(422);
  });

  it("returns 403 when user is not a tournament participant", async () => {
    participantsResult.data = null;

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("tournament participant");
  });

  // ── Success path ───────────────────────────────────────────────────────────

  it("upserts a prediction and returns it", async () => {
    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("pred-1");
    expect(predictionsQb.upsert).toHaveBeenCalledWith(
      {
        user_id: USER_ID,
        match_id: MATCH_ID,
        predicted_home_score: 2,
        predicted_away_score: 1,
        updated_at: "2026-04-11T00:00:00.000Z",
      },
      { onConflict: "user_id,match_id" }
    );
  });

  // ── Error path ─────────────────────────────────────────────────────────────

  it("returns 500 when upsert fails", async () => {
    predictionsResult.data = null;
    predictionsResult.error = { message: "DB error" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to save prediction");

    consoleSpy.mockRestore();
  });
});

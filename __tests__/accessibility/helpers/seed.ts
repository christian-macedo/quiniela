import type { Page } from "@playwright/test";

export interface TournamentInfo {
  id: string;
  name: string;
}

export interface MatchInfo {
  id: string;
  tournamentId: string;
}

/**
 * Fetches the first available tournament from the app's API.
 * Requires the page to be authenticated.
 */
export async function getFirstTournament(page: Page): Promise<TournamentInfo | null> {
  const response = await page.request.get("/api/tournaments");
  if (!response.ok()) return null;
  const data = await response.json();
  const tournaments: Array<{ id: string; name: string }> = Array.isArray(data)
    ? data
    : data.tournaments || [];
  return tournaments[0] ?? null;
}

/**
 * Navigates to /tournaments and extracts the first tournament ID from the page links.
 * Falls back to scraping the DOM when no API endpoint is available.
 */
export async function getFirstTournamentFromPage(page: Page): Promise<string | null> {
  await page.goto("/tournaments");
  const link = page.locator('a[href*="/tournaments/"][href$="/matches"]').first();
  const href = await link.getAttribute("href").catch(() => null);
  if (!href) return null;
  // e.g. /tournaments/abc-123/matches → abc-123
  const match = href.match(/\/tournaments\/([^/]+)\//);
  return match?.[1] ?? null;
}

import { test as setup, expect } from "@playwright/test";
import path from "path";

const USER_FILE = path.join(__dirname, "../../.auth/user.json");
const ADMIN_FILE = path.join(__dirname, "../../.auth/admin.json");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error("Missing TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD in .env.local");
}

/**
 * Authenticates directly via the Supabase REST API (bypasses the login UI).
 * This is far more reliable in CI/headless environments than driving the form.
 *
 * After getting tokens, navigates to /tournaments so the app's middleware can
 * exchange them for session cookies, then saves storageState.
 */
async function loginViaApi(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  storagePath: string
) {
  // 1. Get session tokens from Supabase Auth REST API
  const res = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    data: { email, password },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `Supabase auth failed for ${email} (${res.status()}): ${body}\n` +
        "Ensure the account exists in your Supabase project."
    );
  }

  const session = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // 2. Inject the session as cookies — @supabase/ssr reads cookies, not localStorage.
  //    The cookie name follows the pattern: sb-<project-ref>-auth-token
  //    Long values are chunked as .0, .1, etc. by the library, but we write the
  //    full value here; the middleware will re-chunk on first response.
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
    token_type: "bearer",
  });

  // Chunk the cookie value into 3600-byte pieces (Supabase SSR default)
  const chunkSize = 3600;
  const chunks: string[] = [];
  for (let i = 0; i < cookieValue.length; i += chunkSize) {
    chunks.push(cookieValue.slice(i, i + chunkSize));
  }

  const baseURL = "http://localhost:3000";
  if (chunks.length === 1) {
    await page
      .context()
      .addCookies([
        { name: cookieName, value: chunks[0], url: baseURL, httpOnly: false, sameSite: "Lax" },
      ]);
  } else {
    await page.context().addCookies(
      chunks.map((chunk, i) => ({
        name: `${cookieName}.${i}`,
        value: chunk,
        url: baseURL,
        httpOnly: false,
        sameSite: "Lax" as const,
      }))
    );
  }

  // 3. Navigate to /tournaments — the middleware will see the session cookies.
  await page.goto("/tournaments");
  await page.waitForURL("**/tournaments", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/tournaments/);

  await page.context().storageState({ path: storagePath });
}

setup("authenticate as user", async ({ page }) => {
  await loginViaApi(page, ADMIN_EMAIL, ADMIN_PASSWORD, USER_FILE);
});

setup("authenticate as admin", async ({ page }) => {
  await loginViaApi(page, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FILE);
});

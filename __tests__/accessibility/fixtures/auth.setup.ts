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

  // 2. Navigate to the app so cookies are set in the right origin
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  // 3. Inject the Supabase session via the browser's Supabase client
  //    @supabase/ssr reads the session from cookies; we set it via the client
  //    so the library handles cookie-chunking correctly.
  await page.evaluate(
    ({ url, key, accessToken, refreshToken }) => {
      // Use the Supabase global if available, otherwise set the raw storage key
      const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
      const sessionData = JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "bearer",
      });
      localStorage.setItem(storageKey, sessionData);
    },
    {
      url: SUPABASE_URL,
      key: SUPABASE_ANON_KEY,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    }
  );

  // 4. Navigate to /tournaments — the app middleware will exchange localStorage
  //    tokens for proper cookies and redirect if authenticated.
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

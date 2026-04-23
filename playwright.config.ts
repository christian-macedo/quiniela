import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load .env.local so TEST_USER_EMAIL / TEST_ADMIN_EMAIL / TEST_PASSWORD
// are available to auth.setup.ts without being committed to source control.
config({ path: ".env.local" });

export default defineConfig({
  testDir: "./__tests__/accessibility",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 5000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Most audit specs run as a regular (non-admin) user
      name: "audit",
      testMatch: "**/accessibility/(auth|app|shared)/**/*.spec.ts",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "__tests__/.auth/user.json",
      },
    },
    {
      // Admin specs run as an admin user
      name: "audit-admin",
      testMatch: "**/accessibility/admin/**/*.spec.ts",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "__tests__/.auth/admin.json",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

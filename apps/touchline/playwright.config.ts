import { defineConfig } from "@playwright/test";
const baseURL = process.env.TOUCHLINE_TEST_URL || "http://127.0.0.1:5173";
const localWorkerIdentity =
  process.env.TOUCHLINE_PRODUCTION_WORKER_TEST === "1";
if (
  localWorkerIdentity &&
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)
)
  throw new Error(
    "Synthetic trusted identity is limited to a local production Worker.",
  );
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL,
    extraHTTPHeaders: localWorkerIdentity
      ? {
          "oai-authenticated-user-id": "local_roster_production_test",
          "oai-authenticated-user-email": "roster-test@sites.test",
        }
      : undefined,
    headless: true,
    channel: "chrome",
    viewport: { width: 1440, height: 1100 },
    trace: "retain-on-failure",
  },
  reporter: "list",
});

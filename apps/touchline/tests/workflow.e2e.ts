import { test, expect } from "@playwright/test";
import { newMatch } from "../lib/match";

test("guest can call, correct, persist and export a match", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/desk");
  await expect(
    page.getByRole("heading", { name: "Every match has a story." }),
  ).toBeVisible();
  await page.locator(".event-goal").click();
  await page.locator('dialog select[name="player"]').selectOption("h-5");
  await page.getByRole("button", { name: "Confirm moment" }).click();
  await expect(page.locator(".scorebug .score-team b").first()).toHaveText("3");
  await expect(page.locator(".feed-item").first()).toContainText(
    "Jamie Miller scores",
  );
  await page.reload();
  await expect(page.locator(".scorebug .score-team b").first()).toHaveText("3");
  await page.getByRole("button", { name: "Undo last event" }).click();
  await expect(page.locator(".scorebug .score-team b").first()).toHaveText("2");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Studio" })
    .click();
  await page.getByLabel("Commentary language").selectOption("es");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Live desk" })
    .click();
  await expect(page.locator(".feed-item").first()).toContainText("marca para");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const dl = await downloaded;
  expect(dl.suggestedFilename()).toMatch(/\.json$/);
  const fs = await import("node:fs/promises");
  const saved = JSON.parse(await fs.readFile((await dl.path())!, "utf8"));
  expect(saved.settings.language).toBe("es");
  expect(saved.events).toHaveLength(6);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("new match setup, roster and import are real editable workflows", async ({
  page,
}) => {
  await page.goto("/desk");
  await page.getByRole("button", { name: "New match", exact: true }).click();
  await page.getByRole("button", { name: "Set up a new match" }).click();
  await page.getByLabel("Match name", { exact: true }).fill("Cup final");
  await page
    .getByLabel("Club name", { exact: true })
    .nth(0)
    .fill("Riverside FC");
  await page
    .getByLabel("Club name", { exact: true })
    .nth(1)
    .fill("Hilltop United");
  await page
    .getByRole("button", { name: "Add player", exact: true })
    .first()
    .click();
  await page.getByLabel("Player name", { exact: true }).fill("Amina Forward");
  await page.getByRole("button", { name: "Save teams & details" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Live desk" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Riverside FC.*Hilltop United/ }),
  ).toBeVisible();
  await page
    .getByLabel("Player optional for team events")
    .selectOption({ label: "#1 · Amina Forward" });
  await page.locator(".event-goal").click();
  await page.getByRole("button", { name: "Confirm moment" }).click();
  await expect(page.locator(".feed-item")).toContainText(
    "Amina Forward scores",
  );
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Match report" })
    .click();
  const dlPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Event data/ }).click();
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toBe("cup-final.csv");
  const imported = newMatch(true);
  imported.title = "Imported project";
  await page.locator('input[accept=".json,application/json"]').setInputFiles({
    name: "match.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(page.getByRole("status")).toContainText("imported");
});

test("cloud save, concurrent edits, read-only overlay and revocation enforce the API contract", async ({
  page,
  request,
}) => {
  const anonymous = await request.get("/api/matches");
  expect(anonymous.status()).toBe(401);
  await page.goto("/signin-with-chatgpt?return_to=/desk");
  await expect(
    page.getByRole("button", { name: "Save match to cloud" }),
  ).toBeVisible();
  const saveResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/matches") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save match to cloud" }).click();
  const response = await saveResponse;
  expect(response.status()).toBe(201);
  const saved = await response.json();
  await expect(page.locator(".save-state")).toContainText("Cloud synced");
  const action = {
    version: saved.version,
    command: {
      type: "event",
      event: {
        id: "e2e-new-goal",
        kind: "goal",
        side: "home",
        playerId: null,
        secondaryId: null,
        note: "",
        sourceSeconds: null,
      },
    },
  };
  const update = await page.request.patch(`/api/matches/${saved.match.id}`, {
    data: action,
  });
  expect(update.status()).toBe(200);
  const stale = await page.request.patch(`/api/matches/${saved.match.id}`, {
    data: { ...action, command: { type: "clock", action: "full" } },
  });
  expect(stale.status()).toBe(409);
  const publicRead = await request.get(
    `/api/live/${saved.match.id}?key=${saved.readKey}`,
  );
  expect(publicRead.status()).toBe(200);
  const publicData = await publicRead.json();
  expect(
    publicData.match.events.some(
      (e: { id: string }) => e.id === "e2e-new-goal",
    ),
  ).toBeTruthy();
  expect(publicData.readKey).toBeUndefined();
  expect(publicData.ownerId).toBeUndefined();
  const denied = await request.get(
    `/api/live/${saved.match.id}?key=${"x".repeat(72)}`,
  );
  expect(denied.status()).toBe(404);
  const noWrite = await request.patch(`/api/matches/${saved.match.id}`, {
    data: action,
  });
  expect(noWrite.status()).toBe(401);
  const csrf = await page.request.patch(`/api/matches/${saved.match.id}`, {
    headers: { Origin: "https://other.example" },
    data: action,
  });
  expect(csrf.status()).toBe(403);
  const rotate = await page.request.post(
    `/api/matches/${saved.match.id}/share`,
    { data: {} },
  );
  expect(rotate.status()).toBe(200);
  expect(
    (
      await request.get(`/api/live/${saved.match.id}?key=${saved.readKey}`)
    ).status(),
  ).toBe(404);
  await page.reload();
  await expect(page.locator(".scorebug .score-team b").first()).toHaveText("3");
  const removal = await page.request.delete(`/api/matches/${saved.match.id}`, {
    data: {},
  });
  expect(removal.status()).toBe(200);
  expect(
    (await page.request.get(`/api/matches/${saved.match.id}`)).status(),
  ).toBe(404);
});

test("mobile desk has working navigation without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/desk");
  await expect(page.locator(".mobile-tabs")).toBeVisible();
  await page
    .locator(".mobile-tabs")
    .getByRole("button", { name: "Match report" })
    .click();
  await expect(
    page.getByRole("button", { name: /Match report Readable/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("an authenticated user cannot read, edit or delete another owner’s stored match", async ({
  page,
  request,
}) => {
  const { execFileSync } = await import("node:child_process");
  await page.goto("/signin-with-chatgpt?return_to=/desk");
  const created = await page.request.post("/api/matches", { data: newMatch() });
  expect(created.status()).toBe(201);
  const data = await created.json();
  const sql = (command: string) =>
    execFileSync(
      process.execPath,
      [
        "--import",
        "./scripts/sites-env.mjs",
        "./node_modules/wrangler/bin/wrangler.js",
        "d1",
        "execute",
        "DB",
        "--local",
        "--config",
        "dist/server/wrangler.json",
        "--persist-to",
        ".wrangler/state",
        "--command",
        command,
      ],
      { stdio: "pipe" },
    );
  expect(data.match.id).toMatch(/^[a-f0-9-]+$/);
  sql(
    `UPDATE matches SET owner_id = 'different-owner' WHERE id = '${data.match.id}'`,
  );
  try {
    expect(
      (await page.request.get(`/api/matches/${data.match.id}`)).status(),
    ).toBe(404);
    expect(
      (
        await page.request.patch(`/api/matches/${data.match.id}`, {
          data: { version: 1, command: { type: "clock", action: "full" } },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.delete(`/api/matches/${data.match.id}`, { data: {} })
      ).status(),
    ).toBe(404);
    expect(
      (
        await request.get(`/api/matches/${data.match.id}`, {
          headers: {
            "oai-authenticated-user-id": "different-owner",
            "oai-authenticated-user-email": "spoof@example.test",
          },
        })
      ).status(),
    ).toBe(401);
  } finally {
    sql(`DELETE FROM matches WHERE id = '${data.match.id}'`);
  }
});

test("voice controls dispatch narration and local video timestamps survive panel switching", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { spoken: string[] }).spoken = [];
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        speak: (utterance: { text: string }) =>
          (window as unknown as { spoken: string[] }).spoken.push(
            utterance.text,
          ),
      },
    });
  });
  await page.goto("/desk");
  await page.getByRole("button", { name: "Voice off", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { spoken: string[] }).spoken.length,
      ),
    )
    .toBe(1);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Studio" })
    .click();
  await page.getByLabel("Commentary language").selectOption("fr");
  await page.getByRole("button", { name: "Test voice" }).click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { spoken: string[] }).spoken.at(-1),
    ),
  ).toContain("marque pour");
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "touchline-test-"));
  const clip = join(dir, "test.webm");
  try {
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=green:s=320x180:d=3",
      "-c:v",
      "libvpx",
      "-y",
      clip,
    ]);
    await page.locator('input[accept="video/*"]').setInputFiles(clip);
    await expect(page.locator("video")).toBeVisible();
    await page.locator("video").evaluate((v: HTMLVideoElement) => {
      v.currentTime = 1.5;
    });
    await expect
      .poll(() =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      )
      .toBe(1.5);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Live desk" })
      .click();
    await page.locator(".event-goal").click();
    await page.getByRole("button", { name: "Confirm moment" }).click();
    const draft = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("touchline.draft.guest")!),
    );
    expect(draft.match.events.at(-1).sourceSeconds).toBe(1.5);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

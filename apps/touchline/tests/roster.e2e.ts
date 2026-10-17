import { test, expect } from "@playwright/test";

const roster = {
  home: {
    name: "Synthetic Home",
    color: "#334455",
    players: [
      {
        id: "test-home-99",
        name: "Synthetic Home Player",
        number: 99,
        fact: "Future fact excluded",
      },
    ],
  },
  away: {
    name: "Synthetic Away",
    color: "#ccddee",
    players: [
      { id: "test-away-98", name: "Synthetic Away Player", number: 98 },
    ],
  },
  events: [{ type: "goal", seconds: 90 }],
  score: [5, 1],
};

test.beforeEach(async ({ page }) => {
  await page.goto(
    process.env.TOUCHLINE_PRODUCTION_WORKER_TEST === "1"
      ? "/"
      : "/signin-with-chatgpt?return_to=/",
  );
  const connection = await page.request.get("/api/vision/health");
  test.skip(
    connection.status() === 503,
    "Start the optional Python vision service to run roster integration checks.",
  );
  expect(connection.ok()).toBe(true);
  const health = await connection.json();
  test.skip(
    !health.identity?.available,
    "Install optional Tesseract English for roster integration checks.",
  );
  await page
    .getByRole("button", { name: "Local service", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Load match roster", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("MATCH FOOTAGE").selectOption("inter-ajax-u19-2012");
});

test("real service preserves only the imported roster and keeps unsupported players anonymous", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByLabel("Match roster file").setInputFiles({
    name: "producer-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(roster)),
  });
  await expect(page.locator(".vision-roster-team")).toHaveCount(2);
  await page.getByLabel("Home visible kit colour").fill("#334466");
  await page.getByLabel("Away visible kit colour").fill("#334466");
  let sessionRequests = 0;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/api/vision/sessions") &&
      request.method() === "POST"
    )
      sessionRequests += 1;
  });
  await page
    .getByRole("button", { name: "Start match analysis", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Choose distinct visible kit colours",
  );
  expect(sessionRequests).toBe(0);
  await page.getByLabel("Away visible kit colour").fill("#ccddee");
  await page.getByLabel("ANALYZE UP TO").fill("15");
  await page.getByLabel("YOUR VOICE", { exact: true }).selectOption("piper-en");
  await page.getByLabel("Play AI commentary").uncheck();
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/vision/sessions") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start match analysis", exact: true })
    .click();
  const response = await created;
  expect(response.status()).toBe(201);
  const payload = response.request().postDataJSON();
  expect(payload.roster.home.color).toBe("#334466");
  expect(payload.roster.home.players[0]).toEqual({
    id: "test-home-99",
    name: "Synthetic Home Player",
    number: 99,
  });
  expect(payload.roster).not.toHaveProperty("events");
  expect(payload.roster).not.toHaveProperty("score");
  const initial = await response.json();
  try {
    await expect(
      page.getByRole("button", { name: "Replace roster", exact: true }),
    ).toBeDisabled();
    await expect
      .poll(
        async () =>
          (await page.request.get(`/api/vision/sessions/${initial.id}`))
            .json()
            .then((result) => result.status),
        { timeout: 45000 },
      )
      .toBe("completed");
    const result = await (
      await page.request.get(`/api/vision/sessions/${initial.id}`)
    ).json();
    expect(result.settings.roster).toEqual(payload.roster);
    expect(result.observations.length).toBeGreaterThan(0);
    expect(
      result.observations.every((item: any) => item.identityEnabled === true),
    ).toBe(true);
    // Intentionally synthetic, mismatched roster: this checks the unknown
    // fallback through real inference, not real-football identity precision.
    expect(
      result.observations
        .flatMap((item: any) => item.players)
        .every((player: any) => !player.identity),
    ).toBe(true);
    expect(result.events.every((event: any) => event.actorId === null)).toBe(
      true,
    );
    expect(
      result.utterances.some((item: any) => item.voice === "piper-en"),
    ).toBe(true);
    const captions = await page.request.get(
      `/api/vision/sessions/${initial.id}/captions.vtt`,
    );
    expect(await captions.text()).toContain("WEBVTT");
    const audio = await page.request.get(
      `/api/vision/sessions/${initial.id}/commentary.wav`,
    );
    expect((await audio.body()).subarray(0, 4).toString()).toBe("RIFF");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/roster-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "This browser", exact: true })
      .click();
    await expect(page.getByLabel("Match roster file")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Local service", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Load match roster", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".vision-roster-team")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await page.request.delete(`/api/vision/sessions/${initial.id}`);
  }
});

test("a delayed roster read cannot attach the previous match's lineup to another source", async ({
  page,
}) => {
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      const value = await original.call(this);
      if (this.name === "delayed-roster.json")
        await new Promise<void>((resolve) => {
          (window as any).releaseRoster = resolve;
        });
      return value;
    };
  });
  await page.getByLabel("Match roster file").setInputFiles({
    name: "delayed-roster.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(roster)),
  });
  await page.waitForFunction(
    () => typeof (window as any).releaseRoster === "function",
  );
  await expect(
    page.getByRole("button", { name: "Start match analysis", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("MATCH FOOTAGE").selectOption("ajax-utrecht-2024");
  await page.evaluate(() => (window as any).releaseRoster());
  await expect(
    page.getByRole("button", { name: "Load match roster", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".vision-roster-team")).toHaveCount(0);
});

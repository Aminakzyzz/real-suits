import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const baseURL = process.env.TOUCHLINE_TEST_URL || "http://127.0.0.1:5174";
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir("test-results", { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // This checks dispatch; audible quality needs actual WAV/human verification.
  await page.addInitScript(() => {
    window.__spoken = [];
    window.speechSynthesis.speak = (utterance) => {
      window.__spoken.push({ text: utterance.text, language: utterance.lang });
      setTimeout(() => utterance.onend?.(new Event("end")), 10);
    };
    window.speechSynthesis.cancel = () => {};
  });
  const response = await page.goto(baseURL);
  assert.equal(response.status(), 200);
  await page.getByRole("heading", { name: /See the game/ }).waitFor();
  await page.waitForFunction(() => {
    const video = document.querySelector("video");
    return video?.readyState >= 2 && video.videoWidth > 0;
  });
  const source = await page.request.get(`${baseURL}/demo/source.json`);
  assert.equal(source.status(), 200);
  const manifest = await source.json();
  assert.equal(manifest.id, "inter-ajax-u19-2012");
  await page.getByRole("button", { name: "Start match analysis" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".vision-timeline li").length > 0, null, { timeout: 180000 });
  await page.waitForFunction(() => window.__spoken.length > 0, null, { timeout: 30000 });
  // Expired observations are intentionally hidden between model results.
  // Capture an actual visible detection count rather than assuming speech and
  // overlay refresh happen in the same render or keeping stale boxes on screen.
  const visibleDetections = await page.waitForFunction(() => {
    const count = document.querySelectorAll(".vision-detection-overlay rect").length;
    return count > 0 ? count : false;
  }, null, { timeout: 15000 });
  const detected = await visibleDetections.jsonValue();
  assert.ok(detected > 0, "Production must display actual detections.");
  assert.equal(await page.locator(".vision-error").count(), 0);
  await page.screenshot({ path: "test-results/production-vision.png", fullPage: true });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Captions", exact: true }).click();
  const captions = await download;
  const vtt = await readFile(await captions.path(), "utf8");
  assert.ok(vtt.startsWith("WEBVTT") && vtt.includes("-->"));
  if (await page.getByRole("button", { name: "Stop analysis" }).count())
    await page.getByRole("button", { name: "Stop analysis" }).click();
  assert.equal((await page.request.get(`${baseURL}/api/matches`)).status(), 401);
  assert.equal((await page.request.get(`${baseURL}/api/vision/health`)).status(), 401);
  await page.goto(`${baseURL}/desk`);
  await page.getByRole("heading", { name: "Every match has a story." }).waitFor();
  await page.locator(".event-goal").click();
  await page.getByRole("button", { name: "Confirm moment" }).click();
  await page.waitForFunction(() => document.querySelector(".scorebug .score-team b")?.textContent === "3");
  assert.deepEqual(errors, []);
  const evidence = { checkedAt: new Date().toISOString(), baseURL, sourceId: manifest.id,
    detectedBoxes: detected, captionBytes: vtt.length,
    scope: "Production Worker: real ONNX browser inference, narration dispatch, captions, producer desk and unsigned API boundaries. No football accuracy claim.", errors };
  await writeFile("test-results/production-vision-evidence.json", JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}

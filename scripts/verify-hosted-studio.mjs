// Read a short-lived Sites QA credential from stdin. Never put it in arguments,
// environment files, traces, screenshots of error pages, or saved evidence.
import { createRequire } from "node:module";
import { createInterface } from "node:readline";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const require = createRequire(new URL("../apps/touchline/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const output = new URL("../artifacts/hosted-studio/", import.meta.url);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
console.log("Ready for private Site QA JSON on stdin.");
const input = createInterface({ input: process.stdin, terminal: false });
const line = await new Promise(resolve => input.once("line", resolve));
input.close();
if (process.stdin.isTTY) process.stdin.setRawMode(false);
let settings;
try { settings = JSON.parse(line); } catch { throw new Error("Invalid private QA input."); }
const address = new URL(settings.url);
assert.ok(address.protocol === "https:" && address.hostname.endsWith(".chatgpt.site") && !address.username && !address.password);
assert.ok(typeof settings.token === "string" && settings.token.length > 10);
const origin = address.origin;
const credential = settings.token;
settings = undefined;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  // Route.fetch does not forward the private header through redirects. External
  // requests, including the model/CDN, always continue without the credential.
  await context.route("**/*", async route => {
    const request = route.request();
    const headers = { ...request.headers() };
    delete headers["oai-sites-authorization"];
    if (new URL(request.url()).origin !== origin) {
      await route.continue({ headers });
      return;
    }
    headers["OAI-Sites-Authorization"] = `Bearer ${credential}`;
    try {
      const response = await route.fetch({ headers, maxRedirects: 0 });
      await route.fulfill({ response });
    } catch {
      // Playwright request error logs can include request headers. Keep the
      // original error out of output; the page reports a plain failed request.
      await route.abort("failed").catch(() => {});
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message.replaceAll(credential, "[redacted]")));
  await page.addInitScript(() => {
    window.__spoken = [];
    speechSynthesis.speak = utterance => {
      window.__spoken.push({ text: utterance.text, language: utterance.lang });
      setTimeout(() => utterance.onend?.(new Event("end")), 10);
    };
    speechSynthesis.cancel = () => {};
  });
  const response = await page.goto(origin, { timeout: 60000 });
  assert.equal(response.status(), 200);
  await page.getByRole("heading", { name: /See the game/ }).waitFor();
  await page.waitForFunction(() => document.querySelector("video")?.readyState >= 2);
  const manifest = await page.evaluate(async () => (await fetch("/demo/source.json")).json());
  assert.equal(manifest.id, "inter-ajax-u19-2012");
  await page.getByRole("button", { name: "Start match analysis" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".vision-timeline li").length > 0, null, { timeout: 180000 });
  await page.waitForFunction(() => window.__spoken.length > 0, null, { timeout: 30000 });
  const count = await page.waitForFunction(() => {
    const boxes = document.querySelectorAll(".vision-detection-overlay rect").length;
    return boxes || false;
  }, null, { timeout: 15000 });
  const detectedBoxes = await count.jsonValue();
  assert.equal(await page.locator(".vision-error").count(), 0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Captions", exact: true }).click();
  const captions = await download;
  const text = await readFile(await captions.path(), "utf8");
  assert.ok(text.startsWith("WEBVTT") && text.includes("-->"));
  if (await page.getByRole("button", { name: "Stop analysis" }).count())
    await page.getByRole("button", { name: "Stop analysis" }).click();
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: new URL("studio.png", output).pathname, fullPage: true });
  assert.deepEqual(errors, []);
  const evidence = { checkedAt: new Date().toISOString(), url: origin, sourceId: manifest.id,
    detectedBoxes, captionBytes: text.length, errors,
    scope: "Actual hosted private studio using origin-scoped Sites QA admission: real ONNX inference, speech dispatch and caption download. Does not verify ordinary OAuth login, audible voice quality, football accuracy or a remotely hosted Python service." };
  await writeFile(new URL("evidence.json", output), JSON.stringify(evidence, null, 2)+"\n");
  await writeFile(new URL("captions.vtt", output), text);
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  console.error(String(error.message || error.name).replaceAll(credential, "[redacted]"));
  process.exitCode = 1;
} finally {
  await browser.close();
}

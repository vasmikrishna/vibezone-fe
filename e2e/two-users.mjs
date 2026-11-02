// Two to three real browsers with fake cameras against a running frontend and backend.
// Usage: node e2e/two-users.mjs [frontendUrl]   Set CHROMIUM_PATH to use an existing Chromium.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});

async function openUser() {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 375, height: 812 } });
  await context.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByTestId('consent-age').locator('input').check();
  await page.getByTestId('consent-terms').locator('input').check();
  await page.getByTestId('consent-continue').click();
  return { page, errors, context };
}

const status = (u) => u.page.getByTestId('status').textContent();
const start = (u) => u.page.getByTestId('start-stop').click();
async function waitStatus(u, text, ms = 15000) {
  await u.page.waitForFunction((t) => document.querySelector('[data-testid=status]').textContent.includes(t), text, { timeout: ms });
}
async function assertRemotePlaying(u) {
  await u.page.waitForFunction(() => {
    const v = document.querySelector('[data-testid=remote-video]');
    return v.videoWidth > 0 && v.currentTime > 0.5;
  }, null, { timeout: 15000 });
}

const a = await openUser();
const b = await openUser();
await start(a);
await waitStatus(a, 'Looking');

await start(b);
await waitStatus(a, 'Connected', 5000);
await waitStatus(b, 'Connected', 5000);
await assertRemotePlaying(a);
await assertRemotePlaying(b);
console.log('ok: two users connect and see video');

await a.page.getByTestId('skip').click();
await waitStatus(b, 'Looking', 5000);
await waitStatus(a, 'Connected', 20000);
await assertRemotePlaying(b);
console.log('ok: skip ends the call, and the only two users rematch after the wait');

await a.page.getByTestId('block').click();
await waitStatus(b, 'Looking', 5000);
await b.page.waitForTimeout(13000);
assert.match(await status(b), /Looking/);
assert.match(await status(a), /Looking/);
console.log('ok: blocked users are not rematched');

const c = await openUser();
await start(c);
await waitStatus(c, 'Connected', 15000);
await c.page.getByTestId('report').click();
await c.page.getByTestId('report-reason-spam').click();
await c.page.getByTestId('report-submit').click();
await c.page.getByText('Report sent').waitFor({ timeout: 5000 });
console.log('ok: report ends the call');

const secondTab = await a.context.newPage();
await secondTab.goto(url);
await secondTab.getByTestId('start-stop').click();
await a.page.waitForFunction(() => document.querySelector('[data-testid=start-stop]').textContent === 'Start');
await a.page.waitForTimeout(3000);
assert.equal(await a.page.getByTestId('start-stop').textContent(), 'Start');
console.log('ok: a second tab replaces the first without a reconnect loop');

await c.page.getByTestId('start-stop').click();
await waitStatus(c, 'Press Start', 3000);
const tracks = await c.page.evaluate(() => document.querySelector('[data-testid=local-video]').srcObject);
assert.equal(tracks, null);
console.log('ok: Stop releases the camera');

assert.deepEqual([...a.errors, ...b.errors, ...c.errors], []);
console.log('ok: no uncaught page errors');
await browser.close();

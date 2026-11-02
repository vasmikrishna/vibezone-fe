// Two to three real browsers with fake cameras against a running frontend and backend.
// Usage: node e2e/two-users.mjs [frontendUrl]   Set CHROMIUM_PATH to use an existing Chromium.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});

async function openUser({ tour = false } = {}) {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 375, height: 812 } });
  if (!tour) await context.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
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

const messages = (u) => u.page.getByTestId('chat-message').allTextContents();

const tour = await openUser({ tour: true });
const tourText = (t) => tour.page.locator('.react-joyride__tooltip').getByText(t);
await tourText('Start connecting').waitFor({ timeout: 5000 });
await tour.page.locator('[data-action=primary]').click();
await tourText('skip to the next person').waitFor({ timeout: 5000 });
for (let i = 0; i < 3; i++) await tour.page.locator('[data-action=primary]').click();
await tour.page.waitForFunction(() => localStorage.getItem('hasSeenOnboarding') === 'true');
assert.ok(await tour.page.evaluate(() => document.documentElement.scrollWidth <= 375), 'no horizontal scroll at 375px');
await tour.context.close();
console.log('ok: onboarding tour reaches the Skip step and finishes; no horizontal scroll at 375px');

const a = await openUser();
const b = await openUser();
await a.page.getByTestId('name-input').fill('Alice');
assert.equal(await a.page.getByTestId('chat-input').isDisabled(), true);
await start(a);
await waitStatus(a, 'Looking');

await start(b);
await waitStatus(a, 'Connected', 5000);
await waitStatus(b, 'Connected', 5000);
await assertRemotePlaying(a);
await assertRemotePlaying(b);
console.log('ok: two users connect and see video');

assert.equal(await b.page.getByTestId('partner-name').textContent(), 'Alice');
assert.equal(await a.page.getByTestId('partner-name').textContent(), 'Guest');
await a.page.getByTestId('chat-input').fill('hello bob');
await a.page.getByTestId('chat-input').press('Enter');
const script = '<script>window.__xss = 1</script><b>bold</b>';
await b.page.getByTestId('chat-input').fill(script);
await b.page.getByTestId('chat-send').click();
await a.page.waitForFunction(() => document.querySelectorAll('[data-testid=chat-message]').length === 2);
await b.page.waitForFunction(() => document.querySelectorAll('[data-testid=chat-message]').length === 2);
assert.deepEqual(await messages(a), ['You: hello bob', `Guest: ${script}`]);
assert.deepEqual(await messages(b), ['Alice: hello bob', `You: ${script}`]);
assert.equal(await a.page.locator('[data-testid=chat-message] b, [data-testid=chat-message] script').count(), 0);
assert.equal(await a.page.evaluate(() => window.__xss), undefined);
console.log('ok: chat both ways, partner name shown, a script tag renders as text');

await a.page.getByTestId('skip').click();
await waitStatus(b, 'Looking', 5000);
assert.deepEqual(await messages(a), []);
assert.deepEqual(await messages(b), []);
console.log('ok: chat is cleared after skip');
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
await a.page.waitForFunction(() => document.querySelector('[data-testid=start-stop]').textContent === 'Connect');
await a.page.waitForTimeout(3000);
assert.equal(await a.page.getByTestId('start-stop').textContent(), 'Connect');
console.log('ok: a second tab replaces the first without a reconnect loop');

await c.page.getByTestId('start-stop').click();
await waitStatus(c, 'Press Connect', 3000);
const tracks = await c.page.evaluate(() => document.querySelector('[data-testid=local-video]').srcObject);
assert.equal(tracks, null);
console.log('ok: Stop releases the camera');

assert.deepEqual([...tour.errors, ...a.errors, ...b.errors, ...c.errors], []);
console.log('ok: no uncaught page errors');
await browser.close();

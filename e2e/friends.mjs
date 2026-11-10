// Two signed-in users meet in random chat and become friends, then message each other on /friends.
// Usage: TOKEN_A_FILE=… TOKEN_B_FILE=… node e2e/friends.mjs [frontendUrl]
// Env: CHROMIUM_PATH (existing Chromium), API_URL (default http://localhost:3001), SHOT_DIR (optional screenshots).
// Both tokens must belong to different adult test users. Any friendship between them is removed before and after.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const front = process.argv[2] || 'http://localhost:5173';
const apiUrl = `${process.env.API_URL || 'http://localhost:3001'}/api`;
const shots = process.env.SHOT_DIR;
const [tokenA, tokenB] = ['TOKEN_A_FILE', 'TOKEN_B_FILE'].map((k) => {
  if (!process.env[k]) throw new Error(`Set ${k} to a file holding a user token`);
  return readFileSync(process.env[k], 'utf8').trim();
});

async function api(token, path, method = 'GET') {
  const res = await fetch(`${apiUrl}${path}`, { method, headers: { authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${path}: ${res.status} ${body?.error}`);
  return body;
}

const meA = await api(tokenA, '/me');
const meB = await api(tokenB, '/me');
assert.notEqual(meA.id, meB.id, 'the two tokens must belong to different users');

/** Removes any friendship or pending request between A and B. */
async function cleanUp() {
  const list = await api(tokenA, '/friends');
  if (list.friends.some((f) => f.id === meB.id)) await api(tokenA, `/friends/${meB.id}`, 'DELETE');
  for (const r of list.outgoing.filter((x) => x.to.id === meB.id)) await api(tokenA, `/friends/requests/${r.requestId}`, 'DELETE');
  for (const r of list.incoming.filter((x) => x.from.id === meB.id)) await api(tokenA, `/friends/requests/${r.requestId}/decline`, 'POST');
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
const errors = [];

async function openUser(token, viewport) {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], viewport });
  await context.addInitScript((t) => {
    localStorage.setItem('vibezoneToken', t);
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('vibezoneConsent', '4');
  }, token);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(new URL('/chat', front).href);
  return page;
}

const waitStatus = (page, text, ms = 15000) =>
  page.waitForFunction((t) => document.querySelector('[data-testid=status]')?.textContent.includes(t), text, { timeout: ms });
const friendButton = (page, text) =>
  page.waitForFunction((t) => document.querySelector('[data-testid=add-friend]')?.textContent.includes(t), text, { timeout: 5000 });

try {
  await cleanUp();
  const a = await openUser(tokenA, { width: 1280, height: 960 });
  const b = await openUser(tokenB, { width: 390, height: 844 });
  await a.getByTestId('start-stop').click();
  await waitStatus(a, 'Looking');
  await b.getByTestId('start-stop').click();
  await waitStatus(a, 'Connected');
  await waitStatus(b, 'Connected');
  await friendButton(a, 'Add friend');
  await friendButton(b, 'Add friend');
  assert.equal(await a.getByTestId('friend-sign-in').count(), 0, 'no sign-in hint when signed in');
  if (shots) await a.waitForTimeout(400).then(() => a.screenshot({ path: join(shots, 'call-add-friend.png') })); // button colour transitions
  console.log('ok: two signed-in users match and both see Add friend');

  await a.getByTestId('add-friend').click();
  await friendButton(a, 'Request sent');
  assert.equal(await a.getByTestId('add-friend').isDisabled(), true);
  await b.getByText('sent you a friend request').waitFor({ timeout: 5000 });
  await friendButton(b, 'Accept friend');
  console.log('ok: A sends a request; B sees the notice and Accept friend');

  await b.getByTestId('add-friend').click();
  await friendButton(a, 'Friends ✓');
  await friendButton(b, 'Friends ✓');
  assert.equal(await b.getByTestId('add-friend').isDisabled(), true);
  console.log('ok: B accepts and both see Friends ✓');

  await b.getByTestId('start-stop').click();
  await a.goto(new URL(`/friends/${meB.id}`, front).href);
  const hello = `Hello from A ${Date.now()}`;
  await a.getByTestId('thread-input').fill(hello);
  await a.getByTestId('thread-input').press('Enter');
  await a.getByTestId('thread-log').getByText(hello).waitFor({ timeout: 5000 });
  await a.getByTestId('thread-delivered').waitFor({ timeout: 5000 });
  console.log('ok: A opens the thread with B and sends a message');

  await b.goto(new URL('/friends', front).href);
  await b.getByTestId('friends-list-friends').waitFor({ timeout: 5000 });
  const names = await b.getByTestId('friend-card').getByTestId('friend-name').allTextContents();
  assert.ok(names.includes(meA.name || 'Vibezone user'), `B's friends include A (${names.join(', ')})`);
  const rowA = b.getByTestId('friend-card').filter({ hasText: hello });
  assert.equal(await rowA.getByTestId('friend-unread').textContent(), '1', 'unread pill on A\'s row');
  await b.getByTestId('tab-friends-count').waitFor({ timeout: 5000 });
  assert.ok(Number(await b.getByTestId('tab-friends-count').textContent()) >= 1, 'Friends tab shows the unread count');
  assert.equal(await b.evaluate(() => document.documentElement.scrollWidth), 390, 'no horizontal scroll at 390px (list)');
  if (shots) await b.screenshot({ path: join(shots, 'friends-390.png') });
  console.log('ok: B sees A\'s preview, the unread pill and the tab count');

  await rowA.click();
  await b.waitForURL(`**/friends/${meA.id}`);
  await b.getByTestId('thread-log').getByText(hello).waitFor({ timeout: 5000 });
  await a.getByTestId('thread-seen').waitFor({ timeout: 5000 });
  console.log('ok: B opens the thread and A sees Seen');

  await b.getByTestId('thread-input').pressSequentially('Hi A', { delay: 60 });
  await a.getByTestId('thread-typing').waitFor({ timeout: 5000 });
  const reply = `Reply from B ${Date.now()}`;
  await b.getByTestId('thread-input').fill(reply);
  await b.getByTestId('thread-send').click();
  await a.getByTestId('thread-log').getByText(reply).waitFor({ timeout: 5000 });
  assert.equal(await b.getByTestId('thread-input').inputValue(), '', 'composer clears after sending');
  assert.equal(await b.evaluate(() => document.documentElement.scrollWidth), 390, 'no horizontal scroll at 390px (thread)');
  if (shots) await b.screenshot({ path: join(shots, 'thread-390.png') });
  console.log('ok: A sees B typing, then B\'s reply without a reload');

  assert.ok(await a.getByTestId('friends-list-friends').isVisible(), 'split view shows the list');
  assert.ok(await a.getByTestId('thread').isVisible(), 'split view shows the thread');
  assert.equal(await a.locator('[data-testid=friend-card][aria-current=page]').count(), 1, 'B\'s row is selected');
  if (shots) await a.screenshot({ path: join(shots, 'friends-desktop.png') });
  console.log('ok: at 1280px the list and the thread show side by side');

  await b.getByTestId('thread-back').click();
  await b.waitForURL('**/friends');
  await b.setViewportSize({ width: 1280, height: 800 });
  await b.getByTestId('friends-tab-sent').click();
  await b.waitForURL('**/friends?tab=sent');
  console.log('ok: back link returns to the list; tabs update ?tab=');

  assert.deepEqual(errors, []);
  console.log('ok: no uncaught page errors');
} finally {
  await cleanUp().catch((e) => console.error('cleanup failed:', e.message));
  await browser.close();
}

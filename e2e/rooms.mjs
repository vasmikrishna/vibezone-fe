// Private rooms end to end: starts its own backend (NODE_ENV=development) and reads login codes from its stdout.
// Usage: node e2e/rooms.mjs [frontendUrl]   (default http://localhost:5273)
// The frontend must be served with VITE_SERVER_URL=ws://localhost:<API_PORT>, e.g.
//   VITE_SERVER_URL=ws://localhost:3101 npx vite --port 5273
// Env: API_PORT (3101), MONGO_URI (mongodb://localhost:27017/vibezone-e2e), BACKEND_DIR (../vibezone-be),
//      CHROMIUM_PATH, SCREENSHOT_DIR (optional, saves 7 screenshots). Takes about 4 minutes: the room starts 2 minutes out.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:5273';
const apiPort = process.env.API_PORT || '3101';
const api = `http://localhost:${apiPort}/api`;
const backendDir = process.env.BACKEND_DIR || fileURLToPath(new URL('../../vibezone-be', import.meta.url));
const shots = process.env.SCREENSHOT_DIR;
const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const BIO = 'Movie nights and long walks';

const backend = spawn(process.execPath, ['app.js'], {
  cwd: backendDir,
  env: {
    ...process.env,
    PORT: apiPort,
    NODE_ENV: 'development',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/vibezone-e2e',
    ALLOWED_ORIGINS: new URL(base).origin,
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let output = '';
const waiters = [];
backend.stdout.on('data', (chunk) => {
  output += chunk;
  for (const w of [...waiters]) w();
});
/** Resolves with the first match of re in backend stdout after offset, and the offset after it. */
function waitOutput(re, from, ms = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`backend output ${re} not seen`)), ms);
    const check = () => {
      const m = re.exec(output.slice(from));
      if (!m) return;
      clearTimeout(timer);
      waiters.splice(waiters.indexOf(check), 1);
      resolve({ match: m, end: from + m.index + m[0].length });
    };
    waiters.push(check);
    check();
  });
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
const errors = [];

try {
  await waitOutput(/listening on port/, 0);
  console.log('ok: backend started');

  async function openUser() {
    const context = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 375, height: 812 }, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    return page;
  }
  const noHorizontalScroll = async (page, what) =>
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 375), `${what}: no horizontal scroll at 375px`);
  const status = (page) => page.getByTestId('status');
  const waitStatus = (page, text, timeout = 15000) => status(page).filter({ hasText: text }).waitFor({ timeout });
  const assertRemotePlaying = (page) =>
    page.waitForFunction(() => {
      const v = document.querySelector('[data-testid=remote-video]');
      return v.videoWidth > 0 && v.currentTime > 0.5;
    }, null, { timeout: 15000 });

  // Codes are requested one user at a time, so the next code line belongs to this login.
  async function login(page, ref) {
    const phone = `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
    const from = output.length;
    const sent = await fetch(`${api}/auth/otp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone }) });
    assert.equal(sent.status, 200, 'dev OTP request');
    const { match } = await waitOutput(/\[otp\] dev code (\d{6})/, from);
    const res = await fetch(`${api}/auth/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, code: match[1], ref }) });
    assert.equal(res.status, 200, 'dev OTP verify');
    const { token } = await res.json();
    await page.goto(`${base}/login`);
    await page.getByTestId('login-unavailable').waitFor(); // no VITE_GOOGLE_CLIENT_ID in dev: Google-only page shows the notice
    assert.equal(await page.getByTestId('login-phone').count(), 0, 'phone form is gone');
    await noHorizontalScroll(page, 'login');
    await page.evaluate((t) => localStorage.setItem('vibezoneToken', t), token);
    await page.goto(`${base}/profile`);
    await page.getByTestId('profile-name').waitFor();
    return token;
  }
  async function setProfile(page, name, dob, withPhotoAndBio = false) {
    await page.getByTestId('profile-name').fill(name);
    await page.getByTestId('profile-dob').fill(dob);
    if (withPhotoAndBio) {
      await page.getByTestId('profile-bio').fill(BIO);
      await page.getByTestId('profile-photo-input').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64') });
      await page.getByTestId('profile-photo').waitFor();
    }
    await page.getByTestId('profile-save').click();
  }

  const host = await openUser();
  const hostToken = await login(host);
  await noHorizontalScroll(host, 'profile');
  await setProfile(host, 'Hana', '1990-05-15', true);
  await host.getByTestId('profile-saved').waitFor();
  await host.getByTestId('profile-adult').waitFor();
  await host.reload();
  await host.getByTestId('profile-name').waitFor();
  assert.equal(await host.getByTestId('profile-bio').inputValue(), BIO, 'bio survives a reload');
  assert.ok((await host.getByTestId('profile-photo').getAttribute('src')).startsWith('data:image/jpeg'), 'photo survives a reload');
  console.log('ok: profile photo and bio survive a reload');
  await host.getByTestId('profile-name').focus();
  assert.equal(await host.locator('.app-tabs').isVisible(), false, 'the bottom tabs get out of the way while typing');
  await host.getByTestId('profile-name').blur();
  assert.equal(await host.locator('.app-tabs').isVisible(), true, 'and come back afterwards');
  if (shots) await host.screenshot({ path: `${shots}/profile.png` });
  const guest = await openUser();
  const guestToken = await login(guest);
  await setProfile(guest, 'Gopi', '1995-01-20');
  await guest.getByTestId('profile-saved').waitFor();
  console.log('ok: two users sign in through the dev OTP API and set adult profiles');

  await host.goto(`${base}/chat`);
  await host.getByTestId('start-stop').waitFor();
  assert.equal(await host.getByTestId('consent-continue').count(), 0, 'signed-in adults skip the consent card');
  console.log('ok: a signed-in adult opens video chat without the consent card');

  // Start 2 to 3 minutes from now, on a whole minute (datetime-local has minute precision).
  const startsAt = new Date(Math.ceil((Date.now() + 2 * 60000) / 60000) * 60000);
  const local = new Date(startsAt.getTime() - startsAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await host.goto(`${base}/rooms`);
  await host.getByTestId('rooms-create').click();
  await host.getByTestId('create-name').fill('Evening chat');
  await host.getByTestId('create-description').fill('Say hi to the host.');
  await host.getByTestId('create-starts').fill(local);
  await host.getByTestId('create-duration').fill('15');
  await host.getByTestId('create-interaction').fill('1');
  await host.getByTestId('create-tickets').fill('5');
  await host.setViewportSize({ width: 375, height: 340 }); // keyboard up on a small phone
  const create = await host.getByTestId('create-submit').boundingBox();
  assert.ok(create.y + create.height <= 340, 'Create stays in view above the keyboard');
  await host.setViewportSize({ width: 375, height: 812 });
  if (shots) await host.screenshot({ path: `${shots}/create-room.png` });
  await host.getByTestId('create-submit').click();
  await host.getByTestId('room-card').filter({ hasText: 'Evening chat' }).waitFor();
  console.log('ok: host creates a room starting', startsAt.toLocaleTimeString());

  await guest.goto(`${base}/rooms`);
  const card = guest.getByTestId('room-card').filter({ hasText: 'Evening chat' });
  await card.getByTestId('room-book').click();
  await card.getByTestId('room-cancel').click();
  await card.getByTestId('room-book').click();
  await card.getByTestId('room-cancel').waitFor();
  assert.equal(await card.getByTestId('room-tickets-left').textContent(), '4 of 5 tickets left');
  await noHorizontalScroll(guest, 'rooms');
  if (shots) await guest.screenshot({ path: `${shots}/rooms.png`, fullPage: true });
  console.log('ok: guest books, cancels and books again; tickets left updates');

  await host.getByTestId('room-card').filter({ hasText: 'Evening chat' }).getByTestId('room-join').click();
  await host.waitForURL('**/rooms/*');
  const roomUrl = host.url();
  await host.getByTestId('room-join-leave').click();
  await waitStatus(host, 'waiting');
  await card.getByTestId('room-join').click();
  await guest.waitForURL(roomUrl);
  await guest.getByTestId('room-join-leave').click();
  await waitStatus(guest, 'You are number 1 in the queue.');
  await host.getByTestId('room-queue').filter({ hasText: 'Gopi' }).waitFor();
  assert.equal(await host.getByTestId('room-next').isDisabled(), true, 'Next waits for the start time');
  await noHorizontalScroll(guest, 'room');
  console.log('ok: both join; host sees the queue, guest sees position 1');

  await host.waitForFunction(() => !document.querySelector('[data-testid=room-next]').disabled, null, {
    timeout: startsAt.getTime() - Date.now() + 10000,
  });
  await host.getByTestId('room-next').click();
  await waitStatus(host, 'In a call with Gopi');
  await waitStatus(guest, 'In a call with Hana');
  await assertRemotePlaying(host);
  await assertRemotePlaying(guest);
  await status(guest).filter({ hasText: /\d:\d\d left/ }).waitFor();
  await guest.getByTestId('report').waitFor();
  await guest.getByTestId('block').waitFor();
  console.log('ok: host presses Next; both see video with a countdown; Report and Block are available');

  await host.getByTestId('chat-input').fill('welcome');
  await host.getByTestId('chat-input').press('Enter');
  await guest.getByTestId('chat-input').fill('thanks');
  await guest.getByTestId('chat-send').click();
  for (const page of [host, guest]) {
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=chat-message]').length === 2);
  }
  assert.deepEqual(await guest.getByTestId('chat-message').allTextContents(), ['Hana: welcome', 'You: thanks']);
  if (shots) await guest.screenshot({ path: `${shots}/room-call.png`, fullPage: true });
  console.log('ok: chat works both ways in a room');

  await host.getByTestId('record').click();
  await guest.getByTestId('rec-indicator').filter({ hasText: 'Hana is recording' }).waitFor({ timeout: 5000 });
  await guest.getByTestId('notice').filter({ hasText: 'Hana is recording this call' }).waitFor();
  await host.getByTestId('rec-indicator').filter({ hasText: 'REC' }).waitFor();
  await guest.waitForTimeout(1500);
  if (shots) await guest.screenshot({ path: `${shots}/room-partner-recording.png` });
  const [dl] = await Promise.all([host.waitForEvent('download', { timeout: 10000 }), host.getByTestId('record').click()]);
  assert.match(dl.suggestedFilename(), /^vibezone-call-.*\.(webm|mp4)$/);
  await guest.getByTestId('rec-indicator').waitFor({ state: 'detached', timeout: 5000 });
  console.log('ok: a signed-in partner is told when the host records, and when it stops');

  await waitStatus(host, 'Nobody is waiting yet.', 75000);
  await waitStatus(guest, 'Waiting for the host.', 5000);
  assert.deepEqual(await guest.getByTestId('chat-message').allTextContents(), []);
  console.log('ok: the session ends by itself when the time per person is up');
  await guest.getByTestId('add-last-friend').filter({ hasText: 'Add Hana as a friend' }).waitFor();
  if (shots) await guest.screenshot({ path: `${shots}/room-add-last-friend.png` });
  await guest.getByTestId('add-last-friend').click();
  await guest.getByTestId('add-last-friend').filter({ hasText: 'Request sent to Hana' }).waitFor({ timeout: 5000 });
  await host.getByTestId('notice').filter({ hasText: 'Gopi sent you a friend request' }).waitFor({ timeout: 5000 });
  await host.getByTestId('add-last-friend').filter({ hasText: "Accept Gopi's request" }).click();
  await host.getByTestId('add-last-friend').filter({ hasText: 'You and Gopi are friends' }).waitFor({ timeout: 5000 });
  await guest.getByTestId('add-last-friend').filter({ hasText: 'You and Hana are friends' }).waitFor({ timeout: 5000 });
  console.log('ok: after the call, both can add each other as friends from the post-call panel');

  await host.getByTestId('room-end').click();
  await host.getByTestId('end-confirm').click();
  await waitStatus(guest, 'This room has ended.');
  console.log('ok: host ends the room');

  const kid = await openUser();
  const kidToken = await login(kid);
  await setProfile(kid, 'Kid', `${new Date().getFullYear() - 15}-01-01`);
  await kid.getByTestId('profile-error').filter({ hasText: '18 or older' }).waitFor();
  await kid.goto(`${base}/rooms`);
  await kid.getByTestId('rooms-adult-needed').waitFor();
  assert.equal(await kid.getByTestId('rooms-create').isDisabled(), true);
  const room = await (await fetch(`${api}/rooms`, { method: 'POST', headers: { authorization: `Bearer ${guestToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Later', startsAt: new Date(Date.now() + 3600000).toISOString(), durationMin: 15, interactionMin: 1, tickets: 1 }) })).json();
  await kid.reload();
  assert.equal(await kid.getByTestId('room-card').filter({ hasText: 'Later' }).getByTestId('room-book').isDisabled(), true);
  const book = await fetch(`${api}/rooms/${room.id}/book`, { method: 'POST', headers: { authorization: `Bearer ${kidToken}` } });
  assert.equal(book.status, 403);
  console.log('ok: an under-18 user is refused and cannot book or create');

  await kid.goto(`${base}/rooms/000000000000000000000000`);
  await kid.getByTestId('room-missing').waitFor();
  assert.equal(await kid.getByTestId('room-join-leave').count(), 0, 'a room that is gone cannot be joined');
  await kid.route('**/api/me', (route) => route.abort());
  await kid.goto(`${base}/profile`);
  await kid.getByTestId('admin-error').waitFor(); // not a blank, signed-out page
  await noHorizontalScroll(kid, 'offline error');
  await kid.unroute('**/api/me');
  await kid.getByTestId('admin-retry').click();
  await kid.getByTestId('profile-name').waitFor();
  console.log('ok: a missing room and an unreachable server each show a message with a way back');

  const { code } = await (await fetch(`${api}/me/invite`, { headers: { authorization: `Bearer ${hostToken}` } })).json();
  const invitee = await openUser();
  await invitee.goto(`${base}/login?ref=${code}`);
  await invitee.getByTestId('login-invite').filter({ hasText: 'Hana invited you to Vibezone' }).waitFor();
  await noHorizontalScroll(invitee, 'login invite');
  if (shots) await invitee.screenshot({ path: `${shots}/login-invite.png` });
  await login(invitee, code);
  await setProfile(invitee, 'Ivy', '1998-03-03');
  await invitee.getByTestId('profile-saved').waitFor();
  await host.goto(`${base}/friends`);
  await host.getByTestId('friend-name').filter({ hasText: 'Ivy' }).waitFor();
  await host.goto(`${base}/dashboard`);
  await host.waitForFunction((c) => document.querySelector('[data-testid=invite-link]')?.value.endsWith(`?ref=${c}`), code);
  await noHorizontalScroll(host, 'dashboard');
  if (shots) await host.getByRole('region', { name: 'Invite friends' }).screenshot({ path: `${shots}/dashboard-invite.png` });
  console.log('ok: an invite link shows who invited you, and the new user joins as their friend');

  await kid.goto(`${base}/profile`);
  await kid.getByTestId('profile-delete').click();
  await kid.getByRole('dialog', { name: 'Delete your account?' }).waitFor();
  await kid.getByTestId('delete-confirm').click();
  await kid.waitForURL('**/login');
  assert.equal(await kid.evaluate(() => localStorage.getItem('vibezoneToken')), null);
  for (const page of [host, guest]) {
    await page.goto(`${base}/profile`);
    await page.getByTestId('profile-delete').click();
    await page.getByTestId('delete-confirm').click();
    await page.waitForURL('**/login');
  }
  console.log('ok: Delete account asks for confirmation and signs out');

  assert.deepEqual(errors, []);
  console.log('ok: no uncaught page errors');
} finally {
  await browser.close();
  backend.kill('SIGTERM');
}
